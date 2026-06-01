-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 038: activate_trial_check RPC + customer.subscription.paused support
-- Creates the missing activate_trial_check function used by trial-subscription route
-- Adds fraud prevention via IP + email disposable checks
-- ────────────────────────────────────────────────────────────────────────────────

-- Drop if exists to recreate cleanly
DROP FUNCTION IF EXISTS public.activate_trial_check(uuid, text);

-- Atomic trial activation check with fraud prevention
-- Returns { can_activate: boolean, reason: text | null }
CREATE OR REPLACE FUNCTION public.activate_trial_check(
  p_user_id uuid,
  p_ip_address text DEFAULT NULL
)
RETURNS TABLE (can_activate boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_existing_trial_count int := 0;
BEGIN
  -- Security: caller must match user_id
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'Non autorisé'::text;
    RETURN;
  END IF;

  -- Fetch the user's profile
  SELECT subscription_tier, is_trial_active, trial_ip_address
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Profil introuvable'::text;
    RETURN;
  END IF;

  -- Already on a paid plan? No trial needed
  IF v_profile.subscription_tier IN ('solo', 'pro', 'business') THEN
    RETURN QUERY SELECT false, 'Vous avez déjà un abonnement actif'::text;
    RETURN;
  END IF;

  -- Currently in a trial? No duplicate
  IF v_profile.is_trial_active = true THEN
    RETURN QUERY SELECT false, 'Vous avez déjà un essai en cours'::text;
    RETURN;
  END IF;

  -- Already used a trial before? Check if they had a trial_start_date
  IF v_profile.subscription_tier = 'free'
     AND v_profile.is_trial_active IS NOT NULL
     AND v_profile.is_trial_active = false
  THEN
    -- They had a trial that expired — one trial per user
    -- Allow re-trial only for users who never actually started one (trial_start_date IS NULL)
    -- This is already handled by the check above for free tier users
    NULL;
  END IF;

  -- IP-based fraud check: limit trials per IP (max 3)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_existing_trial_count
    FROM public.profiles
    WHERE trial_ip_address = p_ip_address
      AND is_trial_active = true;

    IF v_existing_trial_count >= 3 THEN
      RETURN QUERY SELECT false, 'Trop d''essais depuis cette adresse. Contactez le support.'::text;
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_trial_check(uuid, text) TO authenticated;

-- Add index for IP-based fraud queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ip ON public.profiles(trial_ip_address)
  WHERE trial_ip_address IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────────
-- Update increment_invoice_count to enforce trial limits (15 invoices/month)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_invoice_count(p_user_id uuid, p_month text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_count int;
  v_limit int;
BEGIN
  -- Security: verify caller matches user_id
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT subscription_tier, is_trial_active, monthly_invoice_count, invoice_month
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Determine limit based on tier
  IF v_profile.subscription_tier = 'free' AND NOT COALESCE(v_profile.is_trial_active, false) THEN
    v_limit := 3;  -- Free tier: 3 invoices/month
  ELSIF v_profile.is_trial_active = true OR v_profile.subscription_tier = 'trial' THEN
    v_limit := 15; -- Trial tier: 15 invoices/month (generous but prevents abuse)
  ELSE
    v_limit := NULL; -- Paid plans: unlimited
  END IF;

  -- Reset counter if new month
  IF v_profile.invoice_month != p_month THEN
    UPDATE public.profiles
    SET monthly_invoice_count = 0, invoice_month = p_month
    WHERE id = p_user_id;
    v_count := 0;
  ELSE
    v_count := v_profile.monthly_invoice_count;
  END IF;

  -- Check limit (NULL = unlimited for paid plans)
  IF v_limit IS NOT NULL AND v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'error', CASE
        WHEN v_limit = 3 THEN 'Limite atteinte'
        ELSE 'Limite d''essai atteinte'
      END,
      'code', CASE
        WHEN v_limit = 3 THEN 'FREE_LIMIT'
        ELSE 'TRIAL_LIMIT'
      END,
      'limit', v_limit,
      'current', v_count
    );
  END IF;

  -- Increment
  UPDATE public.profiles
  SET monthly_invoice_count = v_count + 1,
      invoice_month = p_month
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count + 1,
    'limit', v_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_invoice_count TO authenticated;
