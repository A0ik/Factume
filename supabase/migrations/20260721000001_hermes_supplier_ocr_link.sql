-- ============================================================================
-- HERMÈS CIBLE 1 — Lien suppliers <-> OCR
-- ----------------------------------------------------------------------------
-- Avant : expenses.vendor = texte libre, jamais relié à vendor_intelligence.
--         0/67 expenses avaient un supplier_template_id (colonne morte).
-- Après : FK vendor_intelligence_id sur expenses, peuplée par l'OCR ET rétro-
--         activée pour l'existant (match SIRET puis nom).
-- ============================================================================

-- 1) Colonne + FK + index
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS vendor_intelligence_id uuid;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_vendor_intelligence_id_fkey;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_vendor_intelligence_id_fkey
  FOREIGN KEY (vendor_intelligence_id)
  REFERENCES public.vendor_intelligence(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_vendor_intelligence_id
  ON public.expenses (vendor_intelligence_id);

-- 2) Backfill — priorité SIRET exact (50/67 expenses ont un ocr_supplier_siret)
UPDATE public.expenses e
SET vendor_intelligence_id = vi.id
FROM public.vendor_intelligence vi
WHERE e.user_id = vi.user_id
  AND e.vendor_intelligence_id IS NULL
  AND e.ocr_supplier_siret IS NOT NULL
  AND e.ocr_supplier_siret <> ''
  AND vi.vendor_siret IS NOT NULL
  AND vi.vendor_siret = e.ocr_supplier_siret;

-- 3) Backfill — repli par nom (lower) pour le reste
UPDATE public.expenses e
SET vendor_intelligence_id = vi.id
FROM public.vendor_intelligence vi
WHERE e.user_id = vi.user_id
  AND e.vendor_intelligence_id IS NULL
  AND e.vendor IS NOT NULL AND e.vendor <> ''
  AND lower(e.vendor) = lower(vi.vendor_name);

COMMENT ON COLUMN public.expenses.vendor_intelligence_id IS
  'HERMÈS CIBLE 1 — FK vers vendor_intelligence(id). Peuplé par l''OCR (resolveOrCreateVendor) puis best-effort. NULL = fournisseur non résolu.';
