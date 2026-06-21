-- ============================================================
-- 20260620000005_invoice_payment_terms_and_client_fields.sql
-- PROMETHEUS — CIBLE 1 : fix du bug « toujours 30 jours ».
--
-- CONTEXTE (cause racine prouvée) :
-- La route /api/invoices/create persiste les conditions de paiement et les
-- champs client en INLINE sur invoices (post-RPC), via un .update() Supabase.
-- Or la colonne invoices.payment_terms N'EXISTAIT PAS (aucune migration ne
-- l'avait créée — seuls client_siret/client_vat_number via 018, client_type via
-- 20260602, discount_type via 20260620000004 existent). PostgREST rejette tout
-- UPDATE contenant une colonne inconnue → l'UPDATE échouait silencieusement
-- (try/catch) → rien n'était persisté → le PDF repliait sur profiles.payment_terms
-- (défaut '30') → « Paiement sous 30 jours » systématique.
--
-- Par ricochet, les champs client inline d'un client LIBRE (non lié à une fiche)
-- — email, téléphone, adresse, ville, code postal — subissaient le même sort
-- (aucune migration ADD COLUMN ne les déclarait non plus, bien que le trigger
-- guardian_pdp les référence). Pour un client LIÉ, le join clients(*) sauvait
-- l'affichage ; pour un client libre, les infos étaient perdues.
--
-- Cette migration répare le schéma de façon IDEMPOTENTE (ADD COLUMN IF NOT
-- EXISTS) pour qu'il corresponde enfin à ce que le code persiste.
--
-- payment_terms stocke désormais le termId SÉMANTIQUE (reception / days15 /
-- days30 / days45 / days60 / end_of_month / end_of_month_30 / end_of_next_month
-- / custom-N) — voir lib/payment-terms.ts. Les anciennes valeurs numériques
-- restent acceptées à la lecture (rétro-compat).
-- ============================================================

-- 1. Conditions de paiement (termId sémantique). NULL pour les anciennes
--    factures → le PDF replie sur profiles.payment_terms (défaut '30').
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_terms text;

COMMENT ON COLUMN public.invoices.payment_terms IS 'Conditions de paiement (termId sémantique : reception/days15/days30/days45/days60/end_of_month/end_of_month_30/end_of_next_month/custom-N). NULL = repli sur profiles.payment_terms.';

-- 2. Champs client inline (client libre / non lié à une fiche clients).
--    Figent les infos au moment de l'émission (Factur-X / XML en a besoin).
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_city text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_postal_code text;

COMMENT ON COLUMN public.invoices.client_email IS 'Email client figé à l''émission (client libre non lié à une fiche).';
COMMENT ON COLUMN public.invoices.client_address IS 'Adresse client figée à l''émission (client libre non lié à une fiche).';
COMMENT ON COLUMN public.invoices.client_city IS 'Ville client figée à l''émission (client libre non lié à une fiche).';
COMMENT ON COLUMN public.invoices.client_postal_code IS 'Code postal client figé à l''émission (client libre non lié à une fiche).';
COMMENT ON COLUMN public.invoices.client_phone IS 'Téléphone client figé à l''émission (client libre non lié à une fiche).';

-- 3. Index léger pour filtrer par conditions (reporting / dashboards).
CREATE INDEX IF NOT EXISTS idx_invoices_payment_terms
  ON public.invoices (payment_terms)
  WHERE payment_terms IS NOT NULL;
