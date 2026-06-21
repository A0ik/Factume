-- ============================================================
-- 20260620000004_discount_type_column.sql
-- PROMETHEUS — CIBLE 3 : moteur de réductions % ET €.
--
-- Ajoute la colonne discount_type sur invoices pour distinguer une remise
-- GLOBALE saisie en pourcentage ('percent') ou en euros ('amount').
-- (Les remises par ligne vivent dans le JSONB items : discount_percent /
-- discount_amount, aucune colonne dédiée nécessaire.)
--
-- La colonne est renseignée côté route (create post-RPC + PATCH edit), pas
-- par le RPC create_invoice_atomique (inchangé).
-- ============================================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percent';

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_discount_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('percent', 'amount'));

COMMENT ON COLUMN public.invoices.discount_type IS 'Type de remise globale saisie : percent (%) ou amount (€). Les remises ligne sont dans items JSONB.';
