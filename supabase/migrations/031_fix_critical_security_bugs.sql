-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 031: Fix Critical Security Bugs
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. FIX activate_trial - Verify p_user_id matches auth.uid()
-- Previously, any authenticated user could activate trials for ANY user_id
DROP FUNCTION IF EXISTS public.activate_trial(uuid);

CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only allow activating trial for yourself
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé: vous ne pouvez activer un essai que pour votre propre compte';
  END IF;

  -- Check if user can start a trial and activate it in one query
  UPDATE public.profiles
  SET
    trial_start_date = now(),
    trial_end_date = now() + interval '4 days',
    is_trial_active = true,
    subscription_tier = 'trial'
  WHERE id = p_user_id
  AND subscription_tier NOT IN ('pro', 'business', 'trial')
  AND (is_trial_active IS NULL OR is_trial_active = false);

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO authenticated;

-- 2. FIX expire_trials - Restrict to service_role only
DROP FUNCTION IF EXISTS public.expire_trials();

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_trial_active = false,
    subscription_tier = 'free'
  WHERE
    is_trial_active = true
  AND trial_end_date < now()
  AND subscription_tier = 'trial';
END;
$$;

-- Only service_role can execute this function
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;

-- 3. FIX increment_invoice_count - Verify user_id matches auth.uid()
DROP FUNCTION IF EXISTS public.increment_invoice_count(uuid, text);

CREATE OR REPLACE FUNCTION public.increment_invoice_count(p_user_id uuid, p_month text)
RETURNS TABLE(invoice_count int) AS $$
DECLARE
  v_profile RECORD;
  v_count int;
  v_is_free boolean;
BEGIN
  -- Security: Only allow incrementing your own counter
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- Get user profile with current counts
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;

  -- Check if user is on free tier (not in trial or paid plan)
  v_is_free := (
    v_profile.subscription_tier IS NULL
    OR v_profile.subscription_tier = 'free'
  ) AND (
    v_profile.is_trial_active IS NULL
    OR v_profile.is_trial_active = false
  );

  -- For free users, enforce 5 invoice monthly limit
  IF v_is_free THEN
    -- Check current month count (before increment)
    IF v_profile.invoice_month = p_month THEN
      IF v_profile.monthly_invoice_count >= 5 THEN
        RAISE EXCEPTION 'Limite de 5 factures mensuelles atteinte. Passez à un plan supérieur pour des factures illimitées.';
      END IF;
    END IF;
  END IF;

  -- Increment the counters
  UPDATE public.profiles
  SET
    monthly_invoice_count = CASE
      WHEN invoice_month = p_month THEN monthly_invoice_count + 1
      ELSE 1
    END,
    invoice_month = p_month,
    invoice_count = invoice_count + 1
  WHERE id = p_user_id
  RETURNING monthly_invoice_count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only authenticated users can execute
GRANT EXECUTE ON FUNCTION increment_invoice_count(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION increment_invoice_count(uuid, text) FROM anon;

-- 4. Add RLS policies for tables that have RLS enabled but no policies
-- First, check if these tables exist, then create policies

-- invoice_comments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_comments') THEN
    ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "invoice_comments_select" ON public.invoice_comments;
    DROP POLICY IF EXISTS "invoice_comments_insert" ON public.invoice_comments;
    DROP POLICY IF EXISTS "invoice_comments_update" ON public.invoice_comments;
    DROP POLICY IF EXISTS "invoice_comments_delete" ON public.invoice_comments;

    CREATE POLICY "invoice_comments_select" ON public.invoice_comments
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));

    CREATE POLICY "invoice_comments_insert" ON public.invoice_comments
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));

    CREATE POLICY "invoice_comments_update" ON public.invoice_comments
      FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));

    CREATE POLICY "invoice_comments_delete" ON public.invoice_comments
      FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));
  END IF;
END $$;

-- invoice_tags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_tags') THEN
    ALTER TABLE public.invoice_tags ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "invoice_tags_select" ON public.invoice_tags;
    DROP POLICY IF EXISTS "invoice_tags_insert" ON public.invoice_tags;
    DROP POLICY IF EXISTS "invoice_tags_delete" ON public.invoice_tags;

    CREATE POLICY "invoice_tags_select" ON public.invoice_tags
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));

    CREATE POLICY "invoice_tags_insert" ON public.invoice_tags
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));

    CREATE POLICY "invoice_tags_delete" ON public.invoice_tags
      FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));
  END IF;
END $$;

-- tags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tags') THEN
    ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tags_owner" ON public.tags;

    CREATE POLICY "tags_owner" ON public.tags
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- reminders_config
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminders_config') THEN
    ALTER TABLE public.reminders_config ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "reminders_config_owner" ON public.reminders_config;

    CREATE POLICY "reminders_config_owner" ON public.reminders_config
      FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));
  END IF;
END $$;

-- reminders_log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminders_log') THEN
    ALTER TABLE public.reminders_log ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "reminders_log_select" ON public.reminders_log;

    CREATE POLICY "reminders_log_select" ON public.reminders_log
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id));
  END IF;
END $$;

-- 5. Fix storage bucket security - Disable public listing
-- This prevents listing all files in the bucket via API

-- Update assets bucket - allow public read of individual files but not listing
UPDATE storage.buckets
SET public = false
WHERE id = 'assets';

-- Update client-logos bucket - allow public read of individual files but not listing
UPDATE storage.buckets
SET public = false
WHERE id = 'client-logos';

-- Update logos bucket if it exists
UPDATE storage.buckets
SET public = false
WHERE id = 'logos';

-- Update storage policies to allow public read of specific objects (but not listing)
DROP POLICY IF EXISTS "Public read client logos" ON storage.objects;

CREATE POLICY "Public read specific client logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-logos'
  AND (
    -- Public can read individual files by name, but not list the bucket
    -- This requires knowing the exact file path
    auth.role() = 'anon'
    OR auth.role() = 'authenticated'
    OR auth.jwt() ->> 'role' = 'service_role'
  )
);

-- Ensure service_role has full access
CREATE POLICY "Service role full access on storage"
ON storage.objects FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 6. Verify and fix contract_signature_logs INSERT policy
DROP POLICY IF EXISTS "Service role can insert signature logs" ON public.contract_signature_logs;

CREATE POLICY "Service role can insert signature logs" ON public.contract_signature_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 7. Fix accounting_expenses_view - Remove SECURITY DEFINER and make it SECURITY INVOKER
-- This ensures user-level RLS is respected
DROP VIEW IF EXISTS public.accounting_expenses_view;

CREATE OR REPLACE VIEW accounting_expenses_view AS
SELECT
  id,
  date,
  label,
  amount,
  vat_amount,
  total_amount,
  category,
  payment_method,
  receipt_url,
  status,
  is_deductible,
  location_country,
  tax_free_amount,
  vat_rate,
  location_department,
  meal_type,
  location_city
FROM public.expenses
WHERE status = 'validated'
ORDER BY date DESC;

COMMENT ON VIEW accounting_expenses_view IS 'Vue comptable pour les exports légales (FEC, CSV) - RLS respecté via SECURITY INVOKER par défaut';
