-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 020: Add Stripe Connect fields to profiles
-- ────────────────────────────────────────────────────────────────────────────────

-- Add Stripe Connect fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_access_token TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_completed BOOLEAN DEFAULT false;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_connect_account_id_idx
  ON public.profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'Stripe Connect Express/Standard account ID';
COMMENT ON COLUMN public.profiles.stripe_connect_access_token IS 'OAuth access token for Stripe Connect (encrypted)';
COMMENT ON COLUMN public.profiles.stripe_connect_refresh_token IS 'OAuth refresh token for Stripe Connect (encrypted)';
COMMENT ON COLUMN public.profiles.stripe_connect_token_expires_at IS 'Expiration time for access token';
COMMENT ON COLUMN public.profiles.stripe_connect_onboarding_completed IS 'Whether the user has completed Stripe onboarding';
