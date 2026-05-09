-- ============================================================================
-- Add OCR columns to expenses table
-- This migration adds all columns needed for the OCR functionality
-- ============================================================================

-- Rename 'label' to 'vendor' for consistency with OCR code
ALTER TABLE public.expenses RENAME COLUMN label TO vendor;

-- Add OCR extracted data columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS vendor_address TEXT,
  ADD COLUMN IF NOT EXISTS vendor_siret TEXT,
  ADD COLUMN IF NOT EXISTS vendor_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS ht_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Add OCR metadata columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS ocr_raw_response JSONB,
  ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS ocr_line_items JSONB,
  ADD COLUMN IF NOT EXISTS ocr_supplier_siret TEXT,
  ADD COLUMN IF NOT EXISTS ocr_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS ocr_currency TEXT,
  ADD COLUMN IF NOT EXISTS ocr_payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS ocr_method TEXT;

-- Add accounting columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_code TEXT,
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS journal_type TEXT,
  ADD COLUMN IF NOT EXISTS journal_entry JSONB,
  ADD COLUMN IF NOT EXISTS vat_account TEXT,
  ADD COLUMN IF NOT EXISTS supplier_category TEXT,
  ADD COLUMN IF NOT EXISTS is_professional_expense BOOLEAN DEFAULT true;

-- Add multi-currency columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- Add report/expense report columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES public.expense_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'pending';

-- Add VAT details for French accounting
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS vat_details JSONB,
  ADD COLUMN IF NOT EXISTS cost_center TEXT;

-- Add timestamps for workflow
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index on commonly queried columns
CREATE INDEX IF NOT EXISTS expenses_report_id_idx ON public.expenses(report_id);
CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);
CREATE INDEX IF NOT EXISTS expenses_user_id_date_idx ON public.expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_vendor_idx ON public.expenses(vendor);

-- Add helpful comments
COMMENT ON COLUMN public.expenses.vendor IS 'Vendor/merchant name (was: label)';
COMMENT ON COLUMN public.expenses.ocr_method IS 'OCR method used: tesseract, openrouter, or hybrid';
COMMENT ON COLUMN public.expenses.ocr_confidence IS 'OCR confidence score (0-1)';
COMMENT ON COLUMN public.expenses.account_code IS 'PCG (Plan Comptable Général) account code';
COMMENT ON COLUMN public.expenses.journal_entry IS 'Journal entry as JSON: {debit, credit, vat}';
COMMENT ON COLUMN public.expenses.report_id IS 'Link to expense report if grouped';
COMMENT ON COLUMN public.expenses.status IS 'Payment/approval status: pending, paid, submitted, approved, rejected';
