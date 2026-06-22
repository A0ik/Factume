-- MERCURE (juin 2026) — Quotas mensuels anti-abus SANS friction + garde concurrentielle.
-- Décisions validées :
--   • Voix : fair-use 50/mois (gratuit), illimité Pro+  → RPC consume_voice_quota
--   • OCR multi-factures : 500 factures/mois (Business) → RPC consume_ocr_quota
--   • Garde concurrentielle : max 2 tâches IA en vol/compte → RPC try_acquire_ai_slot / release_ai_slot
--   • Assouplissement des fenêtres per-minute serrées (5-20/min) qui bloquaient les users rapides.
-- Les RPC sont atomiques (check+incrément) pour éviter les races concurrentes.

-- ── Colonnes compteurs OCR ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ocr_usage_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ocr_usage_month text;

-- ── Colonnes garde concurrentielle ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_slots_active integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_slots_updated_at timestamptz;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. consume_voice_quota : atomique check+incrément. free=50/mois, payant/essai=illimité.
--    Remplace l'ancien incrementVoiceUsage (non-atomique, sans pré-check).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.consume_voice_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_count int;
  v_limit int;
  v_month text := to_char(now(), 'YYYY-MM');
BEGIN
  SELECT subscription_tier, is_trial_active, voice_usage_count, voice_usage_month
  INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  -- Payant ou essai = voix illimitée (on ne compte pas).
  IF v_profile.is_trial_active = true
     OR v_profile.subscription_tier IN ('pro', 'business', 'trial') THEN
    RETURN jsonb_build_object('allowed', true, 'count', 0, 'limit', null, 'remaining', null);
  END IF;

  -- Gratuit : fair-use 50 dictées/mois.
  v_limit := 50;
  IF COALESCE(v_profile.voice_usage_month, '') != v_month THEN
    UPDATE public.profiles SET voice_usage_count = 0, voice_usage_month = v_month WHERE id = p_user_id;
    v_count := 0;
  ELSE
    v_count := COALESCE(v_profile.voice_usage_count, 0);
  END IF;

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'count', v_count, 'limit', v_limit, 'remaining', 0,
      'code', 'VOICE_QUOTA_REACHED'
    );
  END IF;

  UPDATE public.profiles
    SET voice_usage_count = v_count + 1, voice_usage_month = v_month
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true, 'count', v_count + 1, 'limit', v_limit,
    'remaining', v_limit - v_count - 1
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_voice_quota TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. consume_ocr_quota : atomique check+incrément (par lot). Business=500 factures/mois.
--    p_count = nombre de factures traitées par la requête (lot bulk = N fichiers).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.consume_ocr_quota(p_user_id uuid, p_count int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_count int;
  v_limit int;
  v_month text := to_char(now(), 'YYYY-MM');
  v_inc int := GREATEST(1, p_count);
BEGIN
  SELECT subscription_tier, is_trial_active, ocr_usage_count, ocr_usage_month
  INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  -- L'OCR multi-factures est réservé Business strict (gate côté route via requireFeature).
  -- Par sécurité, on bloque tout le reste ici aussi.
  IF v_profile.subscription_tier != 'business' THEN
    RETURN jsonb_build_object(
      'allowed', false, 'code', 'PLAN_REQUIRED', 'requiredPlan', 'business'
    );
  END IF;

  v_limit := 500;
  IF COALESCE(v_profile.ocr_usage_month, '') != v_month THEN
    UPDATE public.profiles SET ocr_usage_count = 0, ocr_usage_month = v_month WHERE id = p_user_id;
    v_count := 0;
  ELSE
    v_count := COALESCE(v_profile.ocr_usage_count, 0);
  END IF;

  IF v_count + v_inc > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'count', v_count, 'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_count), 'code', 'OCR_QUOTA_REACHED'
    );
  END IF;

  UPDATE public.profiles
    SET ocr_usage_count = v_count + v_inc, ocr_usage_month = v_month
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true, 'count', v_count + v_inc, 'limit', v_limit,
    'remaining', v_limit - v_count - v_inc
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_ocr_quota TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. try_acquire_ai_slot : max 2 tâches IA simultanées par compte.
--    Stale-guard 120 s : si un lambda crash sans relâcher le slot, il auto-expire
--    (on ne risque jamais de verrouiller un utilisateur à vie).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.try_acquire_ai_slot(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active int;
BEGIN
  UPDATE public.profiles
    SET ai_slots_active = CASE
          WHEN ai_slots_updated_at IS NULL THEN 1
          WHEN ai_slots_updated_at < now() - interval '120 seconds' THEN 1
          ELSE ai_slots_active + 1
        END,
        ai_slots_updated_at = now()
    WHERE id = p_user_id
      AND (ai_slots_updated_at IS NULL
           OR ai_slots_updated_at < now() - interval '120 seconds'
           OR COALESCE(ai_slots_active, 0) < 2)
    RETURNING ai_slots_active INTO v_active;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'TOO_MANY_CONCURRENT_AI');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'active', v_active);
END;
$$;
GRANT EXECUTE ON FUNCTION public.try_acquire_ai_slot TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. release_ai_slot : décrément idempotent (floor 0). À appeler dans un finally.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.release_ai_slot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
    SET ai_slots_active = GREATEST(0, COALESCE(ai_slots_active, 0) - 1)
    WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.release_ai_slot TO authenticated;
