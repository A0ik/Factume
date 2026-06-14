-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 022: Source de vérité unique pour le lien de paiement (BUG 2 + BUG 3)
--
-- INSPECTOR — Avant cette migration, le prestataire actif était INFÉRÉ d'une
-- constellation de colonnes (payment_link, stripe_payment_url,
-- stripe_payment_link_url/_id, sumup_checkout_id) par 4 résolveurs divergents.
-- Un switch Stripe→SumUp laissait la colonne legacy stripe_payment_link_url
-- peuplée → QR/URL et libellé se contredisaient (BUG 2). Aucune colonne ne
-- mémorisait le montant figé dans le checkout → une édition de prix laissait un
-- lien obsolète chargeable à l'ancien montant (BUG 3).
--
-- On introduit 3 colonnes :
--   payment_provider     : 'stripe' | 'sumup' | NULL  (source de vérité du prestataire)
--   payment_link_amount  : montant figé dans le lien au moment de sa création
--   payment_link_stale   : true quand le lien est invalidé et doit être régénéré
--
-- Backfill : on RENSEIGNE payment_provider pour les lignes existantes (fiable,
-- déduit des colonnes) mais on laisse payment_link_amount NULL pour ne PAS
-- déclencher d'invalidation surprise sur les anciens liens. Les nouveaux liens
-- (créés après cette migration) recevront payment_link_amount → protection BUG 3.
-- ────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payment_link_stale BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill du prestataire actif (Stripe prioritaire si les deux coexistent —
-- état incohérent hérité que la régénération nettoiera).
UPDATE public.invoices
  SET payment_provider = 'stripe'
  WHERE payment_provider IS NULL
    AND (stripe_payment_url IS NOT NULL OR stripe_payment_link_url IS NOT NULL);

UPDATE public.invoices
  SET payment_provider = 'sumup'
  WHERE payment_provider IS NULL
    AND sumup_checkout_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.payment_provider IS 'Prestataire de paiement actif (stripe | sumup). Source de vérité unique — remplace l''inférence par colonnes.';
COMMENT ON COLUMN public.invoices.payment_link_amount IS 'Montant figé dans le checkout/session au moment de la création du lien. Sert à détecter la désynchronisation après édition.';
COMMENT ON COLUMN public.invoices.payment_link_stale IS 'TRUE quand le lien a été invalidé (montant modifié) et doit être régénéré. Le PDF n''affiche aucun QR tant que ce drapeau est levé.';

-- Index pour la détection de désynchronisation côté serveur.
CREATE INDEX IF NOT EXISTS invoices_payment_link_stale_idx
  ON public.invoices(payment_link_stale)
  WHERE payment_link_stale = TRUE;
