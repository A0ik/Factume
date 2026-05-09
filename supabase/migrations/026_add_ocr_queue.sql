-- Migration: OCR Queue System for bulk processing
-- This migration adds the infrastructure for asynchronous OCR processing

-- 1. Create ocr_queue table for bulk OCR processing
CREATE TABLE IF NOT EXISTS ocr_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),

  -- Processing metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Result data
  result JSONB,
  error TEXT,
  error_code TEXT,

  -- OCR method used
  ocr_method TEXT CHECK (ocr_method IN ('tesseract', 'openrouter', 'hybrid')),
  confidence FLOAT,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Optional expense linking
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_ocr_queue_status_priority ON ocr_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_user_status ON ocr_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_expense ON ocr_queue(expense_id);

-- 2. Create expense_reports table for grouped expense reporting
CREATE TABLE IF NOT EXISTS expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Report metadata
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT DEFAULT 'business' CHECK (report_type IN ('business', 'travel', 'meal', 'home_office', 'other')),

  -- Status workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid')),

  -- Dates
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Financial data
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  reimbursable_amount DECIMAL(10,2) DEFAULT 0,
  non_reimbursable_amount DECIMAL(10,2) DEFAULT 0,

  -- Approval tracking
  submitted_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),

  -- Metadata
  employee_notes TEXT,
  approver_notes TEXT,
  rejection_reason TEXT,

  -- Reporting
  report_number TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create expense_report_items table (linking expenses to reports)
CREATE TABLE IF NOT EXISTS expense_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_report_id UUID REFERENCES expense_reports(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,

  -- Item-specific data
  is_reimbursable BOOLEAN DEFAULT true,
  reimbursable_amount DECIMAL(10,2),
  notes TEXT,

  -- Status per item
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'excluded')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(expense_report_id, expense_id)
);

-- Indexes for expense reports
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_status ON expense_reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_reports_workspace ON expense_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_period ON expense_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_expense_report_items_report ON expense_report_items(expense_report_id);
CREATE INDEX IF NOT EXISTS idx_expense_report_items_expense ON expense_report_items(expense_id);

-- 4. Create OCR processing stats table
CREATE TABLE IF NOT EXISTS ocr_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Stats
  date DATE DEFAULT CURRENT_DATE,
  total_processed INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  tesseract_used INTEGER DEFAULT 0,
  openrouter_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  avg_confidence FLOAT,

  -- Processing times
  avg_processing_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ocr_stats_user_date ON ocr_stats(user_id, date);

-- 5. Add columns to expenses table for report linking
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS expense_report_id UUID REFERENCES expense_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS expense_report_item_id UUID REFERENCES expense_report_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reimbursable_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ocr_method TEXT CHECK (ocr_method IN ('tesseract', 'openrouter', 'hybrid')),
ADD COLUMN IF NOT EXISTS ocr_queue_id UUID REFERENCES ocr_queue(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_report ON expenses(expense_report_id);
CREATE INDEX IF NOT EXISTS idx_expenses_queue ON expenses(ocr_queue_id);

-- 6. Enable Row Level Security
ALTER TABLE ocr_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for ocr_queue
CREATE POLICY "Users can view their own OCR queue"
  ON ocr_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OCR jobs"
  ON ocr_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OCR jobs"
  ON ocr_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OCR jobs"
  ON ocr_queue FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for expense_reports
CREATE POLICY "Users can view their own expense reports"
  ON expense_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense reports"
  ON expense_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense reports"
  ON expense_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense reports"
  ON expense_reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for expense_report_items
CREATE POLICY "Users can view items of their expense reports"
  ON expense_report_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports er
      WHERE er.id = expense_report_items.expense_report_id
      AND er.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to their expense reports"
  ON expense_report_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reports er
      WHERE er.id = expense_report_items.expense_report_id
      AND er.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of their expense reports"
  ON expense_report_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports er
      WHERE er.id = expense_report_items.expense_report_id
      AND er.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their expense reports"
  ON expense_report_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expense_reports er
      WHERE er.id = expense_report_items.expense_report_id
      AND er.user_id = auth.uid()
    )
  );

-- RLS policies for ocr_stats
CREATE POLICY "Users can view their own OCR stats"
  ON ocr_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert OCR stats"
  ON ocr_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update OCR stats"
  ON ocr_stats FOR UPDATE
  USING (true);

-- 7. Helper functions

-- Function to generate report number
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  -- Get next value from sequence or create
  BEGIN
    SELECT nextval('expense_report_seq') INTO seq_val;
  EXCEPTION WHEN undefined_table THEN
    CREATE SEQUENCE IF NOT EXISTS expense_report_seq START 1;
    SELECT nextval('expense_report_seq') INTO seq_val;
  END;

  RETURN 'ER-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate report number
CREATE OR REPLACE FUNCTION set_report_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_number IS NULL THEN
    NEW.report_number := generate_report_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expense_report_number
  BEFORE INSERT ON expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_report_number();

-- Function to update expense report totals
CREATE OR REPLACE FUNCTION update_expense_report_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expense_reports
  SET
    total_amount = (
      SELECT COALESCE(SUM(e.amount), 0)
      FROM expenses e
      WHERE e.expense_report_id = NEW.expense_report_id
    ),
    reimbursable_amount = (
      SELECT COALESCE(SUM(COALESCE(ei.reimbursable_amount, e.amount)), 0)
      FROM expenses e
      LEFT JOIN expense_report_items ei ON ei.expense_id = e.id
      WHERE e.expense_report_id = NEW.expense_report_id
    ),
    updated_at = NOW()
  WHERE id = NEW.expense_report_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_totals_on_item_insert
  AFTER INSERT OR UPDATE OR DELETE ON expense_report_items
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_report_totals();

-- 8. Update OCR stats function
CREATE OR REPLACE FUNCTION update_ocr_stats(
  p_user_id UUID,
  p_success BOOLEAN,
  p_method TEXT,
  p_cost_usd DECIMAL DEFAULT 0,
  p_confidence FLOAT DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ocr_stats (user_id, date, total_processed, successful, failed, tesseract_used, openrouter_used, total_cost_usd, avg_confidence, avg_processing_time_ms)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    CASE WHEN p_method = 'tesseract' THEN 1 ELSE 0 END,
    CASE WHEN p_method = 'openrouter' THEN 1 ELSE 0 END,
    p_cost_usd,
    p_confidence,
    p_processing_time_ms
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_processed = ocr_stats.total_processed + 1,
    successful = ocr_stats.successful + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed = ocr_stats.failed + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    tesseract_used = ocr_stats.tesseract_used + CASE WHEN p_method = 'tesseract' THEN 1 ELSE 0 END,
    openrouter_used = ocr_stats.openrouter_used + CASE WHEN p_method = 'openrouter' THEN 1 ELSE 0 END,
    total_cost_usd = ocr_stats.total_cost_usd + p_cost_usd,
    avg_confidence = (
      (ocr_stats.avg_confidence * ocr_stats.successful + COALESCE(p_confidence, 0)) /
      NULLIF((ocr_stats.successful + CASE WHEN p_success THEN 1 ELSE 0 END), 0)
    ),
    avg_processing_time_ms = (
      (ocr_stats.avg_processing_time_ms * ocr_stats.total_processed + COALESCE(p_processing_time_ms, 0)) /
      NULLIF((ocr_stats.total_processed + 1), 0)
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Function to clean up old OCR queue items
CREATE OR REPLACE FUNCTION cleanup_old_ocr_queue(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ocr_queue
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Views for easier querying

-- View: OCR queue with user info
CREATE OR REPLACE VIEW ocr_queue_enriched AS
SELECT
  oq.*,
  p.email as user_email,
  p.full_name as user_name,
  e.status as expense_status
FROM ocr_queue oq
LEFT JOIN profiles p ON p.id = oq.user_id
LEFT JOIN expenses e ON e.id = oq.expense_id;

-- View: Expense reports with summary
CREATE OR REPLACE VIEW expense_reports_summary AS
SELECT
  er.*,
  p.email as user_email,
  p.full_name as user_name,
  COUNT(DISTINCT eri.id) as item_count,
  COUNT(DISTINCT CASE WHEN eri.status = 'approved' THEN eri.id END) as approved_count,
  COUNT(DISTINCT CASE WHEN eri.status = 'rejected' THEN eri.id END) as rejected_count,
  COUNT(DISTINCT CASE WHEN eri.status = 'pending' THEN eri.id END) as pending_count
FROM expense_reports er
LEFT JOIN profiles p ON p.id = er.user_id
LEFT JOIN expense_report_items eri ON eri.expense_report_id = er.id
GROUP BY er.id, p.email, p.full_name;

COMMENT ON TABLE ocr_queue IS 'Queue for asynchronous OCR processing with retry logic and priority handling';
COMMENT ON TABLE expense_reports IS 'Grouped expense reports for approval workflows';
COMMENT ON TABLE expense_report_items IS 'Individual expenses linked to expense reports';
COMMENT ON TABLE ocr_stats IS 'Daily OCR statistics tracking usage and costs';
