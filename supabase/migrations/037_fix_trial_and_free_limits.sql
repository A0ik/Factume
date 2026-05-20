-- Fix trial duration inconsistency: align DB comments to 7 days (matching code)
-- Fix free tier invoice limit from 5 to 3

-- Update trial comments to reflect actual 7-day duration
COMMENT ON COLUMN public.profiles.trial_start_date IS 'Start date of the 7-day free trial';
COMMENT ON COLUMN public.profiles.trial_end_date IS 'End date of the 7-day free trial (trial_start_date + 7 days)';

-- Update activate_trial function to use 7 days consistently
CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.profiles
  SET
    is_trial_active = true,
    trial_start_date = now(),
    trial_end_date = now() + interval '7 days',
    subscription_tier = 'trial'
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Update free tier invoice limit from 5 to 3
CREATE OR REPLACE FUNCTION public.increment_invoice_count(p_user_id uuid, p_month text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_count int;
  v_limit int := 3; -- Free tier: 3 invoices per month
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

  -- Reset counter if new month
  IF v_profile.invoice_month != p_month THEN
    UPDATE public.profiles
    SET monthly_invoice_count = 0, invoice_month = p_month
    WHERE id = p_user_id;
    v_count := 0;
  ELSE
    v_count := v_profile.monthly_invoice_count;
  END IF;

  -- Check free tier limit
  IF v_profile.subscription_tier = 'free' AND NOT COALESCE(v_profile.is_trial_active, false) THEN
    IF v_count >= v_limit THEN
      RETURN jsonb_build_object(
        'error', 'Limite atteinte',
        'code', 'FREE_LIMIT',
        'limit', v_limit,
        'current', v_count
      );
    END IF;
  END IF;

  -- Increment
  UPDATE public.profiles
  SET monthly_invoice_count = v_count + 1,
      invoice_month = p_month
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count + 1,
    'limit', CASE WHEN v_profile.subscription_tier = 'free' THEN v_limit ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_invoice_count TO authenticated;
