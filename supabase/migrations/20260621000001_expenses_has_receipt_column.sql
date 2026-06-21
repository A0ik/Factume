-- ============================================================
-- 20260621000001_expenses_has_receipt_column.sql
-- PROMETHEUS — fix bug « Could not find the 'has_receipt' column of 'expenses'
-- in the schema cache ».
--
-- CONTEXTE (cause racine) :
-- Le flux « note de frais vocale + justificatif » (components/expenses/
-- VoiceExpenseButton.tsx) insère has_receipt: true dans la table expenses.
-- Or AUCUNE migration ne créait cette colonne → PostgREST rejetait l'INSERT
-- (« Could not find the 'has_receipt' column … in the schema cache ») → la
-- sauvegarde échouait dès qu'on attachait un justificatif.
--
-- has_receipt est légitime et déjà utilisé par :
--   • app/api/search/route.ts        (filtrage des dépenses avec/sans justificatif)
--   • app/api/workflows/validation   (condition de validation)
-- On crée donc la colonne (idempotent) + on remplit les dépenses existantes qui
-- ont déjà un receipt_url, pour que le filtrage soit cohérent rétroactivement.
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS has_receipt boolean DEFAULT false;

COMMENT ON COLUMN public.expenses.has_receipt IS 'Vrai si un justificatif (receipt_url) est rattaché. Mis à vrai par le flux vocal + justificatif. Utilisé par le filtrage search et les workflows.';

-- Rétro-compat : les dépenses antérieures avec un justificatif deviennent has_receipt=true.
UPDATE public.expenses
  SET has_receipt = true
  WHERE receipt_url IS NOT NULL AND receipt_url <> '';

-- Index pour le filtrage rapide « dépenses avec justificatif » par utilisateur.
CREATE INDEX IF NOT EXISTS idx_expenses_has_receipt
  ON public.expenses (user_id)
  WHERE has_receipt = true;
