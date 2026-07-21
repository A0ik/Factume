-- ============================================================================
-- HERMÈS CIBLE 3 — Stripe Issuing (Option C « pont »)
-- ----------------------------------------------------------------------------
-- Cartes commandées par les utilisateurs Pro/Business :
--   - virtuelle = 5€ (fee unique), physique = 30€ (fee unique)
--   - modèle prépayé par top-up utilisateur (zéro risque trésorerie factu.me)
-- L'émission RÉELLE (stripe.issuing.cardholders/cards.create) est gate par la
-- variable STRIPE_ISSUING_ENABLED : tant que le card program Stripe n'est pas
-- approuvé, la commande est persistée en statut 'queued' (paiement non encaissé).
-- ============================================================================

-- 1) Cardholder id sur le profil (1 cardholder individuel par utilisateur)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_cardholder_id text;

-- 2) Table des cartes commandées
CREATE TABLE IF NOT EXISTS public.stripe_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cardholder_id text,
  card_id text,
  type text NOT NULL CHECK (type IN ('virtual','physical')),
  last4 text,
  brand text,
  exp_month integer,
  exp_year integer,
  status text NOT NULL DEFAULT 'pending',   -- pending|queued|active|frozen|canceled|rejected
  fee_amount bigint,                         -- centimes (3000 ou 500)
  fee_currency text NOT NULL DEFAULT 'eur',
  fee_payment_intent_id text,
  shipping_name text,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_cards_user_id ON public.stripe_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_cards_card_id ON public.stripe_cards(card_id);

-- 3) RLS — chaque utilisateur ne voit que ses cartes
ALTER TABLE public.stripe_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stripe_cards_user_select ON public.stripe_cards;
CREATE POLICY stripe_cards_user_select ON public.stripe_cards
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS stripe_cards_user_insert ON public.stripe_cards;
CREATE POLICY stripe_cards_user_insert ON public.stripe_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS stripe_cards_user_update ON public.stripe_cards;
CREATE POLICY stripe_cards_user_update ON public.stripe_cards
  FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.stripe_cards IS
  'HERMÈS CIBLE 3 — Cartes Stripe Issuing commandées. L''émission réelle est gate par STRIPE_ISSUING_ENABLED.';
