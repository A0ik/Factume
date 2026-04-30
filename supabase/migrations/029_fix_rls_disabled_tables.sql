-- Migration 029: Fix RLS disabled warnings
-- This migration enables RLS on tables that were created without it
-- Security fix: All tables in public schema should have RLS enabled

-- Enable RLS on client_portal_tokens (created without RLS in migration 000)
ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "client_portal_tokens_select" ON public.client_portal_tokens;
DROP POLICY IF EXISTS "client_portal_tokens_service_role" ON public.client_portal_tokens;

-- Create RLS policies for client_portal_tokens
CREATE POLICY "client_portal_tokens_select"
  ON public.client_portal_tokens FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.invoices WHERE id = invoice_id
    )
  );

CREATE POLICY "client_portal_tokens_service_role"
  ON public.client_portal_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Enable RLS on any other tables that might be missing it
-- This is a safety check for any tables created without RLS

DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Enable RLS on all public tables that don't have it
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'supabase_%'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
  END LOOP;
END $$;
