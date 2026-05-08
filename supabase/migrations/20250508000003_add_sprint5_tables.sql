-- Migration: Add Sprint 5 tables (Dashboard, Search enhancements)
-- This migration adds tables for custom dashboards and additional features

-- Create dashboard_configs table
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  layout TEXT DEFAULT 'grid' CHECK (layout IN ('grid', 'masonry')),
  widgets JSONB DEFAULT '[]'::jsonb, -- Array of widget configs
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for dashboard_configs
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_default ON dashboard_configs(user_id, is_default) WHERE is_default = true;

-- Add function to ensure only one default dashboard per user
CREATE OR REPLACE FUNCTION ensure_single_default_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE dashboard_configs
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for single default dashboard
DROP TRIGGER IF EXISTS ensure_default_dashboard_single ON dashboard_configs;
CREATE TRIGGER ensure_default_dashboard_single
  BEFORE INSERT OR UPDATE ON dashboard_configs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_dashboard();

-- Create trigger for updated_at on dashboard_configs
DROP TRIGGER IF EXISTS update_dashboard_configs_updated_at ON dashboard_configs;
CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add full-text search capabilities
CREATE OR REPLACE FUNCTION expenses_search_vector(expense expenses)
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('french',
    COALESCE(expense.vendor, '') || ' ' ||
    COALESCE(expense.description, '') || ' ' ||
    COALESCE(expense.invoice_number, '') || ' ' ||
    COALESCE(expense.notes, '') || ' ' ||
    COALESCE(expense.category, '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search vector column to expenses for full-text search
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (expenses_search_vector(expenses)) STORED;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_expenses_search_vector ON expenses USING GIN(search_vector);

-- Add helpful function to search expenses
CREATE OR REPLACE FUNCTION search_expenses(
  p_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  vendor TEXT,
  description TEXT,
  amount FLOAT,
  date DATE,
  category TEXT,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.vendor,
    e.description,
    e.amount,
    e.date,
    e.category,
    ts_rank(e.search_vector, plainto_tsquery('french', p_search_query)) as rank
  FROM expenses e
  WHERE e.user_id = p_user_id
    AND e.search_vector @@ plainto_tsquery('french', p_search_query)
  ORDER BY rank DESC, e.date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add helper function for date range queries
CREATE OR REPLACE FUNCTION get_expenses_in_period(
  p_user_id UUID,
  p_period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  date TEXT,
  total_amount FLOAT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(e.date, 'YYYY-MM-DD') as date,
    SUM(e.amount) as total_amount,
    COUNT(*) as count
  FROM expenses e
  WHERE e.user_id = p_user_id
    AND e.date >= CASE
      WHEN p_period = 'week' THEN CURRENT_DATE - INTERVAL '7 days'
      WHEN p_period = 'month' THEN DATE_TRUNC('month', CURRENT_DATE)
      WHEN p_period = 'quarter' THEN DATE_TRUNC('quarter', CURRENT_DATE)
      WHEN p_period = 'year' THEN DATE_TRUNC('year', CURRENT_DATE)
      ELSE CURRENT_DATE - INTERVAL '30 days'
    END
  GROUP BY TO_CHAR(e.date, 'YYYY-MM-DD')
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Add helper function for category breakdown
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category TEXT,
  total_amount FLOAT,
  count BIGINT,
  percentage FLOAT
) AS $$
DECLARE
  p_total FLOAT;
BEGIN
  SELECT SUM(e.amount) INTO p_total
  FROM expenses e
  WHERE e.user_id = p_user_id
    AND e.date >= p_start_date
    AND e.date <= p_end_date;

  RETURN QUERY
  SELECT
    e.category,
    SUM(e.amount) as total_amount,
    COUNT(*) as count,
    CASE
      WHEN p_total > 0 THEN (SUM(e.amount) / p_total) * 100
      ELSE 0
    END as percentage
  FROM expenses e
  WHERE e.user_id = p_user_id
    AND e.date >= p_start_date
    AND e.date <= p_end_date
    AND e.category IS NOT NULL
  GROUP BY e.category
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable the required extensions for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For trigram matching
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Add trigram index for fuzzy text search
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_trgm ON expenses USING GIN(vendor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_expenses_description_trgm ON expenses USING GIN(description gin_trgm_ops);

-- Add view for expenses with all related data
CREATE OR REPLACE VIEW expenses_enriched AS
SELECT
  e.*,
  COALESCE(json_agg(DISTINCT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'color', t.color
  )) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
  jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'color', f.color
  ) as folder,
  (SELECT COUNT(*) FROM invoice_annotations ia WHERE ia.expense_id = e.id) as annotation_count,
  (SELECT COUNT(*) FROM approval_requests ar WHERE ar.expense_id = e.id AND ar.status = 'pending') as pending_approvals
FROM expenses e
LEFT JOIN expense_tags et ON e.id = et.expense_id
LEFT JOIN tags t ON et.tag_id = t.id
LEFT JOIN folders f ON e.folder_id = f.id
GROUP BY e.id, f.id;

-- Add helpful view for recurring expenses detection
CREATE OR REPLACE VIEW recurring_candidates AS
SELECT
  vendor,
  category,
  COUNT(*) as occurrences,
  AVG(amount) as avg_amount,
  STDDEV(amount) as amount_stddev,
  MIN(date) as first_date,
  MAX(date) as last_date,
  AVG(EXTRACT(DAY FROM date)) as avg_day_of_month,
  MODE() WITHIN GROUP (ORDER BY date) as most_common_date
FROM expenses
WHERE vendor IS NOT NULL
GROUP BY vendor, category
HAVING COUNT(*) >= 2
  AND STDDEV(amount) / NULLIF(AVG(amount), 0) < 0.3 -- Amount varies less than 30%
ORDER BY occurrences DESC, avg_amount DESC;
