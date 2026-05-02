-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 019: Ensure profile fields exist and fix invoice counter
-- ────────────────────────────────────────────────────────────────────────────────

-- Make sure all required fields exist in profiles table
DO $$
BEGIN
  -- Add invoice_count if not exists
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0;

  -- Add monthly_invoice_count if not exists
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS monthly_invoice_count INTEGER DEFAULT 0;

  -- Add invoice_month if not exists
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS invoice_month TEXT;

  -- Initialize invoice_count for users who have null values
  UPDATE public.profiles
  SET invoice_count = GREATEST(0, (
    SELECT COUNT(*)
    FROM public.invoices
    WHERE invoices.user_id = profiles.id
    AND invoices.document_type = 'invoice'
  ))
  WHERE invoice_count IS NULL;

  -- Initialize monthly_invoice_count for current month
  UPDATE public.profiles
  SET
    monthly_invoice_count = GREATEST(0, (
      SELECT COUNT(*)
      FROM public.invoices
      WHERE invoices.user_id = profiles.id
      AND invoices.document_type = 'invoice'
      AND TO_CHAR(invoices.created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
    )),
    invoice_month = TO_CHAR(NOW(), 'YYYY-MM')
  WHERE monthly_invoice_count IS NULL;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating profile fields: %', SQLERRM;
END $$;

-- Drop and recreate the function with the improved version
DROP FUNCTION IF EXISTS increment_invoice_count(uuid, text);

CREATE OR REPLACE FUNCTION increment_invoice_count(p_user_id uuid, p_month text)
RETURNS TABLE(invoice_count int) AS $$
DECLARE
  v_profile RECORD;
  v_count int;
  v_is_free boolean;
BEGIN
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
    invoice_count = COALESCE(invoice_count, 0) + 1
  WHERE id = p_user_id
  RETURNING monthly_invoice_count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION increment_invoice_count(uuid, text) TO authenticated;

-- Create an index on user_id for invoices if not exists
CREATE INDEX IF NOT EXISTS invoices_user_id_document_type_idx
  ON public.invoices(user_id, document_type);

COMMENT ON TABLE public.profiles IS 'User profiles with subscription and invoice tracking';
COMMENT ON COLUMN public.profiles.invoice_count IS 'Total lifetime invoice count';
COMMENT ON COLUMN public.profiles.monthly_invoice_count IS 'Current month invoice count (resets monthly)';
COMMENT ON COLUMN public.profiles.invoice_month IS 'Current month in YYYY-MM format for monthly_invoice_count';
