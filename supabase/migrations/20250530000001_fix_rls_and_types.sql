-- ============================================================================
-- Migration 20250530000001: Comprehensive RLS, type, and security fixes
-- Date: 2025-05-30
-- ============================================================================
-- This migration addresses 8 categories of database issues:
--   1. RLS policies for 16 tables that have RLS enabled but no policies
--   2. Remove dangerous portal_public_read policy on client_portal_tokens
--   3. Fix OCR stats INSERT/UPDATE policies (was USING true)
--   4. Migrate FLOAT columns to NUMERIC for monetary values
--   5. Fix increment_contract_count - add auth check
--   6. Fix RPC functions for expenses - add auth checks
--   7. Add missing indexes for performance
--   8. Verify auth.id() -> auth.uid() (already fixed in migration 024)
-- ============================================================================

-- ============================================================================
-- SECTION 1: RLS POLICIES FOR 16 TABLES
-- ============================================================================
-- These tables were created in sprints 1-5 and OCR migrations with RLS enabled
-- (migration 029 enabled RLS on ALL public tables) but no per-user policies,
-- making them completely inaccessible to authenticated users.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1a. supplier_templates (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_templates') THEN
    ALTER TABLE public.supplier_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_templates_owner" ON public.supplier_templates;
    CREATE POLICY "supplier_templates_owner" ON public.supplier_templates
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1b. vendor_intelligence (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_intelligence') THEN
    ALTER TABLE public.vendor_intelligence ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "vendor_intelligence_owner" ON public.vendor_intelligence;
    CREATE POLICY "vendor_intelligence_owner" ON public.vendor_intelligence
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1c. categorization_rules (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categorization_rules') THEN
    ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "categorization_rules_owner" ON public.categorization_rules;
    CREATE POLICY "categorization_rules_owner" ON public.categorization_rules
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1d. categorization_feedback (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categorization_feedback') THEN
    ALTER TABLE public.categorization_feedback ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "categorization_feedback_owner" ON public.categorization_feedback;
    CREATE POLICY "categorization_feedback_owner" ON public.categorization_feedback
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1e. invoice_annotations (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_annotations') THEN
    ALTER TABLE public.invoice_annotations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "invoice_annotations_owner" ON public.invoice_annotations;
    CREATE POLICY "invoice_annotations_owner" ON public.invoice_annotations
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1f. expense_tags (no user_id column - join through expenses table)
-- junction table: expense_id -> expenses.user_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_tags') THEN
    ALTER TABLE public.expense_tags ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "expense_tags_owner" ON public.expense_tags;
    DROP POLICY IF EXISTS "expense_tags_select" ON public.expense_tags;
    DROP POLICY IF EXISTS "expense_tags_insert" ON public.expense_tags;
    DROP POLICY IF EXISTS "expense_tags_delete" ON public.expense_tags;

    CREATE POLICY "expense_tags_select" ON public.expense_tags FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.expenses WHERE expenses.id = expense_tags.expense_id AND expenses.user_id = auth.uid()));
    CREATE POLICY "expense_tags_insert" ON public.expense_tags FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.expenses WHERE expenses.id = expense_tags.expense_id AND expenses.user_id = auth.uid()));
    CREATE POLICY "expense_tags_delete" ON public.expense_tags FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.expenses WHERE expenses.id = expense_tags.expense_id AND expenses.user_id = auth.uid()));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1g. validation_rules (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'validation_rules') THEN
    ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "validation_rules_owner" ON public.validation_rules;
    CREATE POLICY "validation_rules_owner" ON public.validation_rules
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1h. workflow_history (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_history') THEN
    ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "workflow_history_owner" ON public.workflow_history;
    CREATE POLICY "workflow_history_owner" ON public.workflow_history
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1i. folders (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "folders_owner" ON public.folders;
    CREATE POLICY "folders_owner" ON public.folders
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1j. sync_rules (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_rules') THEN
    ALTER TABLE public.sync_rules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sync_rules_owner" ON public.sync_rules;
    CREATE POLICY "sync_rules_owner" ON public.sync_rules
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1k. sync_events (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_events') THEN
    ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "sync_events_owner" ON public.sync_events;
    CREATE POLICY "sync_events_owner" ON public.sync_events
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1l. recurring_patterns (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_patterns') THEN
    ALTER TABLE public.recurring_patterns ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "recurring_patterns_owner" ON public.recurring_patterns;
    CREATE POLICY "recurring_patterns_owner" ON public.recurring_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1m. budgets (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
    ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "budgets_owner" ON public.budgets;
    CREATE POLICY "budgets_owner" ON public.budgets
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1n. approval_workflows (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approval_workflows') THEN
    ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "approval_workflows_owner" ON public.approval_workflows;
    CREATE POLICY "approval_workflows_owner" ON public.approval_workflows
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1o. approval_requests (no single user_id - has requested_by + requested_to)
-- A user can see requests they made OR requests sent to them for approval
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approval_requests') THEN
    ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "approval_requests_access" ON public.approval_requests;
    DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
    DROP POLICY IF EXISTS "approval_requests_insert" ON public.approval_requests;
    DROP POLICY IF EXISTS "approval_requests_update" ON public.approval_requests;

    CREATE POLICY "approval_requests_select" ON public.approval_requests FOR SELECT
      USING (auth.uid() = requested_by OR auth.uid() = requested_to);
    CREATE POLICY "approval_requests_insert" ON public.approval_requests FOR INSERT
      WITH CHECK (auth.uid() = requested_by);
    CREATE POLICY "approval_requests_update" ON public.approval_requests FOR UPDATE
      USING (auth.uid() = requested_by OR auth.uid() = requested_to);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1p. dashboard_configs (user_id column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboard_configs') THEN
    ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dashboard_configs_owner" ON public.dashboard_configs;
    CREATE POLICY "dashboard_configs_owner" ON public.dashboard_configs
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- SECTION 2: FIX portal_public_read POLICY ON client_portal_tokens
-- ============================================================================
-- The "portal_public_read" policy (from migration 005) uses USING (true) which
-- allows ANYONE (even unauthenticated users) to read all portal tokens.
-- This is a critical security vulnerability.
-- Replace with service_role-only access.
-- ============================================================================

DROP POLICY IF EXISTS "portal_public_read" ON public.client_portal_tokens;

CREATE POLICY "portal_tokens_service_only" ON public.client_portal_tokens
  FOR SELECT USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================================
-- SECTION 3: FIX OCR STATS POLICIES
-- ============================================================================
-- The original OCR stats policies "System can insert/update OCR stats" used
-- WITH CHECK (true) / USING (true) which allows ANY authenticated user to
-- insert/update any other user's stats. Restrict to service_role only.
-- ============================================================================

DROP POLICY IF EXISTS "System can insert OCR stats" ON public.ocr_stats;
DROP POLICY IF EXISTS "System can update OCR stats" ON public.ocr_stats;

-- SELECT policy: users can view their own stats (already exists, recreate for safety)
DROP POLICY IF EXISTS "Users can view own OCR stats" ON public.ocr_stats;
DROP POLICY IF EXISTS "Users can view their own OCR stats" ON public.ocr_stats;
CREATE POLICY "Users can view own OCR stats" ON public.ocr_stats
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT policy: only service_role can insert stats
CREATE POLICY "Service role can insert OCR stats" ON public.ocr_stats
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- UPDATE policy: only service_role can update stats
CREATE POLICY "Service role can update OCR stats" ON public.ocr_stats
  FOR UPDATE USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================================
-- SECTION 4: MIGRATE FLOAT COLUMNS TO NUMERIC FOR MONETARY VALUES
-- ============================================================================
-- Floating-point arithmetic causes rounding errors in financial calculations.
-- Convert all monetary FLOAT columns to NUMERIC(precision, scale).
-- The USING clause handles existing FLOAT data safely.
-- ============================================================================

-- recurring_patterns: amount and amount_variance
DO $$
BEGIN
  -- Check if columns are still FLOAT before altering
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recurring_patterns'
      AND column_name = 'amount' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.recurring_patterns ALTER COLUMN amount TYPE NUMERIC(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recurring_patterns'
      AND column_name = 'amount_variance' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.recurring_patterns ALTER COLUMN amount_variance TYPE NUMERIC(12,2);
  END IF;
END $$;

-- budgets: amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budgets'
      AND column_name = 'amount' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.budgets ALTER COLUMN amount TYPE NUMERIC(12,2);
  END IF;
END $$;

-- expenses: original_amount and exchange_rate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses'
      AND column_name = 'original_amount' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.expenses ALTER COLUMN original_amount TYPE NUMERIC(12,2) USING original_amount::NUMERIC(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses'
      AND column_name = 'exchange_rate' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.expenses ALTER COLUMN exchange_rate TYPE NUMERIC(10,6) USING exchange_rate::NUMERIC(10,6);
  END IF;
END $$;

-- vendor_intelligence: total_purchases, average_amount, typical_vat_rate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_intelligence'
      AND column_name = 'total_purchases' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.vendor_intelligence ALTER COLUMN total_purchases TYPE NUMERIC(12,2) USING total_purchases::NUMERIC(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_intelligence'
      AND column_name = 'average_amount' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.vendor_intelligence ALTER COLUMN average_amount TYPE NUMERIC(12,2) USING average_amount::NUMERIC(12,2);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_intelligence'
      AND column_name = 'typical_vat_rate' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE public.vendor_intelligence ALTER COLUMN typical_vat_rate TYPE NUMERIC(5,2) USING typical_vat_rate::NUMERIC(5,2);
  END IF;
END $$;


-- ============================================================================
-- SECTION 5: FIX increment_contract_count - ADD AUTH CHECK
-- ============================================================================
-- The original function had no auth check: any user could increment any
-- other user's contract count. Add auth.uid() verification.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_contract_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Security: only allow incrementing your own contract count
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

  UPDATE public.profiles
  SET contract_count = COALESCE(contract_count, 0) + 1
  WHERE id = p_user_id
  RETURNING contract_count INTO new_count;

  RETURN new_count;
END;
$$;


-- ============================================================================
-- SECTION 6: FIX RPC FUNCTIONS FOR EXPENSES - ADD AUTH CHECKS
-- ============================================================================
-- These functions accept a p_user_id parameter but never verify that the
-- caller is the same user. This allows any user to query any other user's
-- expenses. Add auth.uid() verification at the start of each function.
-- ============================================================================

-- 6a. search_expenses
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
  -- Security: only allow searching your own expenses
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6b. get_expenses_in_period
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
  -- Security: only allow querying your own expenses
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6c. get_category_breakdown
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
  -- Security: only allow querying your own expenses
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorise';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- SECTION 7: ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================
-- These indexes cover common query patterns that were missing indexes,
-- causing full table scans on large tables.
-- ============================================================================

-- expenses: primary lookup by user_id (may already exist from migration 000)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- expenses: dashboard list sorted by date per user
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);

-- notifications: unread count badge (read column is boolean from migration 000)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- products: user's product catalog lookup
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- opportunities: CRM pipeline per user
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);

-- opportunities: kanban board grouped by stage
CREATE INDEX IF NOT EXISTS idx_opportunities_user_stage ON public.opportunities(user_id, stage);


-- ============================================================================
-- SECTION 8: VERIFY auth.id() -> auth.uid() FIX
-- ============================================================================
-- Migrations 022 and 023 incorrectly used auth.id() instead of auth.uid().
-- Migration 024 already corrected this by dropping and recreating all
-- contract RLS policies with auth.uid(). No further action needed.
--
-- Verification note: If you run this migration on a fresh database and
-- apply migrations in order, migration 024 will handle the fix. If you
-- encounter issues, the policies created in migration 024 use auth.uid()
-- which is the correct Supabase function.
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
