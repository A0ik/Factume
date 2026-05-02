-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 018: Fix invoice limit enforcement
-- ────────────────────────────────────────────────────────────────────────────────

-- Drop existing function
DROP FUNCTION IF EXISTS increment_invoice_count(uuid, text);

-- Create improved function with limit check
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
    invoice_count = invoice_count + 1
  WHERE id = p_user_id
  RETURNING monthly_invoice_count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION increment_invoice_count(uuid, text) TO authenticated;
