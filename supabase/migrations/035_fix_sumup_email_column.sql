-- Fix missing sumup_email column used by OAuth callback
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_email text;

-- Add column for OCR validation warnings
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS ocr_validation_warnings text[];
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Ensure 'needs_review' status is usable (it's just a text field, no enum constraint needed)
