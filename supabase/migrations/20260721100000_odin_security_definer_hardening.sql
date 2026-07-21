-- ============================================================================
-- ODIN (S5) — Durcissement des fonctions SECURITY DEFINER
-- Cible : certification ISO 27001 / fermeture classe CVE-2020-25695 + CVE-2024-0985
-- (search_path mutable → escalation de privilèges via object shadowing).
-- ----------------------------------------------------------------------------
-- 1) Pin `search_path = public, extensions` sur TOUTES les fonctions SECURITY
--    DEFINER du schéma public (les vecteurs d'attaque pg_trgm/unaccent/vector
--    résident dans public, donc inclus).
-- 2) REVOKE EXECUTE anon/public sur la fonction trigger `enforce_expense_receipt`
--    et le RPC `record_partial_payment` (défense en profondeur : un trigger tourne
--    en tant que propriétaire indépendamment du privilège EXECUTE ; le RPC reste
--    appelable par l'utilisateur authentifié via la route API cookie-bound).
-- ============================================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.oid::regprocedure);
  END LOOP;
END $$;

-- Trigger de justificatif de note de frais : jamais appelé directement via RPC.
REVOKE EXECUTE ON FUNCTION public.enforce_expense_receipt() FROM anon, public;

-- RPC d'acompte : bloque anon/public, conserve l'accès authenticated (route API).
REVOKE EXECUTE ON FUNCTION public.record_partial_payment(uuid, numeric, date, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_partial_payment(uuid, numeric, date, text, text) TO authenticated;
