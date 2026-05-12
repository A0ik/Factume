-- ============================================================================
-- Migration: Add receipts storage bucket for OCR functionality
-- This migration creates the storage bucket needed for receipt/document uploads
-- ============================================================================

-- Insert the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the receipts bucket
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow users to view their own receipts
CREATE POLICY IF NOT EXISTS "Users can view their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own receipts
CREATE POLICY IF NOT EXISTS "Users can delete their own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Grant necessary permissions
GRANT ALL ON SCHEMA storage TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres;
