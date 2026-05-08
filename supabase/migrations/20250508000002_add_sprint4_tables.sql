-- Migration: Add Sprint 4 tables (Recurring, Budgets, Approvals)
-- This migration adds tables for recurring patterns, budgets, and approval workflows

-- Create recurring_patterns table
CREATE TABLE IF NOT EXISTS recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount FLOAT NOT NULL,
  amount_variance FLOAT DEFAULT 0,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  frequency_days FLOAT NOT NULL,
  category TEXT,
  last_occurrence DATE NOT NULL,
  next_expected DATE NOT NULL,
  occurrences INTEGER DEFAULT 1,
  confidence FLOAT DEFAULT 0.5,
  is_active BOOLEAN DEFAULT true,
  auto_detect BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vendor, category)
);

-- Add indexes for recurring_patterns
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_user ON recurring_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_vendor ON recurring_patterns(vendor);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_next ON recurring_patterns(next_expected) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_active ON recurring_patterns(is_active) WHERE is_active = true;

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  amount FLOAT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(start_date, end_date);

-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB DEFAULT '{}'::jsonb, -- { min_amount, categories[], vendors[], requires_receipt }
  approvers TEXT[] NOT NULL, -- Array of user IDs
  auto_submit BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for approval_workflows
CREATE INDEX IF NOT EXISTS idx_approval_workflows_user ON approval_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active ON approval_workflows(is_active) WHERE is_active = true;

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  resolution_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Add indexes for approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_expense ON approval_requests(expense_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_to ON approval_requests(requested_to) WHERE requested_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending ON approval_requests(status, created_at) WHERE status = 'pending';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_recurring_patterns_updated_at ON recurring_patterns;
CREATE TRIGGER update_recurring_patterns_updated_at
  BEFORE UPDATE ON recurring_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_workflows_updated_at ON approval_workflows;
CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add function to check budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TABLE (
  budget_id UUID,
  budget_name TEXT,
  category TEXT,
  spent FLOAT,
  budget_limit FLOAT,
  percentage FLOAT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS budget_id,
    b.name AS budget_name,
    b.category,
    COALESCE(SUM(e.amount), 0) AS spent,
    b.amount AS budget_limit,
    (COALESCE(SUM(e.amount), 0) / b.amount * 100) AS percentage,
    CASE
      WHEN COALESCE(SUM(e.amount), 0) >= b.amount THEN 'exceeded'
      WHEN (COALESCE(SUM(e.amount), 0) / b.amount * 100) >= b.alert_threshold THEN 'warning'
      ELSE 'ok'
    END AS status
  FROM budgets b
  LEFT JOIN expenses e ON e.user_id = b.user_id
    AND e.date >= b.start_date
    AND (b.end_date IS NULL OR e.date <= b.end_date)
    AND (b.category IS NULL OR e.category = b.category)
  WHERE b.is_active = true
  GROUP BY b.id, b.name, b.category, b.amount, b.alert_threshold
  HAVING (COALESCE(SUM(e.amount), 0) / b.amount * 100) >= b.alert_threshold
  ORDER BY (COALESCE(SUM(e.amount), 0) / b.amount) DESC;
END;
$$ LANGUAGE plpgsql;

-- Add function to auto-detect recurring expenses
CREATE OR REPLACE FUNCTION detect_recurring_from_expense()
RETURNS TRIGGER AS $$
DECLARE
  pattern_count INTEGER;
BEGIN
  -- Only run on insert/update with vendor
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.vendor IS NOT NULL THEN
    -- Check if a similar pattern exists
    SELECT COUNT(*) INTO pattern_count
    FROM recurring_patterns
    WHERE user_id = NEW.user_id
      AND vendor ILIKE NEW.vendor
      AND is_active = true;

    -- If pattern exists, update next_expected if this expense matches
    IF pattern_count > 0 THEN
      UPDATE recurring_patterns
      SET
        last_occurrence = GREATEST(last_occurrence, NEW.date),
        occurrences = occurrences + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id
        AND vendor ILIKE NEW.vendor
        AND is_active = true
        AND ABS(amount - NEW.amount) <= (amount * amount_variance);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-detecting recurring expenses
DROP TRIGGER IF EXISTS detect_recurring_on_expense_insert ON expenses;
CREATE TRIGGER detect_recurring_on_expense_insert
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION detect_recurring_from_expense();
