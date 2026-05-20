-- Migration: Add missing columns for OCR vendor auto-learning and expense corrections
-- Fixes:
--   1. vendor_mappings: add raw_vendor, corrected_vendor, corrected_category, usage_count
--   2. expenses: add ocr_corrections (JSONB) for storing correction history

-- ===========================================================================
-- 1. vendor_mappings: add columns used by autoLearnVendorRule and page.tsx
-- ===========================================================================

ALTER TABLE vendor_mappings
  ADD COLUMN IF NOT EXISTS raw_vendor TEXT,
  ADD COLUMN IF NOT EXISTS corrected_vendor TEXT,
  ADD COLUMN IF NOT EXISTS corrected_category TEXT,
  ADD COLUMN IF NOT EXISTS corrected_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS corrected_vat_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Update the unique constraint to include raw_vendor alongside vendor_name_pattern
-- (raw_vendor is the normalized lowercase version, vendor_name_pattern is the display version)
-- The code upserts with onConflict 'user_id,vendor_name_pattern'

-- ===========================================================================
-- 2. expenses: add ocr_corrections column
-- ===========================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS ocr_corrections JSONB;

-- ===========================================================================
-- 3. Update updated_at trigger for vendor_mappings (if not already present)
-- ===========================================================================

CREATE OR REPLACE FUNCTION update_vendor_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON vendor_mappings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON vendor_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_mappings_updated_at();
