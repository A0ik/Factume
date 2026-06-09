-- ============================================================================
-- TOLL AUDIT FIXES — Migration 20260609000001
-- ============================================================================
-- Fixes applied:
--   1. Add trial_selected_plan column (S2: cardless trial stores plan separately)
--   2. Add voice_usage tracking columns (B1: 1 voice per month for free)
--   3. Fix activate_trial_check RPC: count ALL trials per IP, not just active (V1)
--   4. Add has_used_trial check inside the RPC (V2)
--   5. Create decrement_invoice_count function (B3: slot reopen on delete)
-- ============================================================================

-- 1. Add trial_selected_plan column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_selected_plan text;

COMMENT ON COLUMN public.profiles.trial_selected_plan IS 'Plan chosen during cardless trial activation (solo/pro/business). Used to know which plan to offer at conversion.';

-- 2. Add voice usage tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_usage_count integer DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_usage_month text;

COMMENT ON COLUMN public.profiles.voice_usage_count IS 'Number of voice API calls used this month (free tier: max 1)';
COMMENT ON COLUMN public.profiles.voice_usage_month IS 'Month (YYYY-MM) for voice_usage_count tracking';

-- 3. Fix activate_trial_check: count ALL trials from IP + check has_used_trial
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
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'Non autorisé'::text;
    RETURN;
  END IF;

  SELECT subscription_tier, is_trial_active, trial_ip_address, COALESCE(has_used_trial, false) as has_used_trial
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Profil introuvable'::text;
    RETURN;
  END IF;

  IF v_profile.subscription_tier IN ('solo', 'pro', 'business') THEN
    RETURN QUERY SELECT false, 'Vous avez déjà un abonnement actif'::text;
    RETURN;
  END IF;

  IF v_profile.is_trial_active = true THEN
    RETURN QUERY SELECT false, 'Vous avez déjà un essai en cours'::text;
    RETURN;
  END IF;

  -- TOLL FIX V2: Check has_used_trial flag inside the RPC
  IF v_profile.has_used_trial = true THEN
    RETURN QUERY SELECT false, 'Vous avez déjà utilisé votre période d''essai gratuite.'::text;
    RETURN;
  END IF;

  -- TOLL FIX V1: Count ALL trials from IP (active OR expired), not just active ones.
  -- Prevents infinite trial abuse by creating new accounts after expiration.
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_existing_trial_count
    FROM public.profiles
    WHERE trial_ip_address = p_ip_address
      AND trial_start_date IS NOT NULL;

    IF v_existing_trial_count >= 3 THEN
      RETURN QUERY SELECT false, 'Trop d''essais depuis cette adresse. Contactez le support.'::text;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_trial_check(uuid, text) TO authenticated;

-- 5. Create decrement_invoice_count function (TOLL FIX B3)
-- Decrements the monthly invoice counter when a draft invoice is deleted,
-- reopening the slot for free users.
CREATE OR REPLACE FUNCTION public.decrement_invoice_count(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT monthly_invoice_count INTO v_count
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  IF v_count > 0 THEN
    UPDATE public.profiles
    SET monthly_invoice_count = v_count - 1
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'count', GREATEST(v_count - 1, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_invoice_count TO authenticated;
