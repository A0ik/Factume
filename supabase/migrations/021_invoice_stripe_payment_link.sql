-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 021: Add Stripe payment link fields to invoices
-- ────────────────────────────────────────────────────────────────────────────────

-- Add Stripe payment link fields to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS invoices_stripe_payment_link_id_idx
  ON public.invoices(stripe_payment_link_id)
  WHERE stripe_payment_link_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.invoices.stripe_payment_link_id IS 'Stripe Payment Link ID for Connect accounts';
COMMENT ON COLUMN public.invoices.stripe_payment_link_url IS 'Full URL of the Stripe payment link';
