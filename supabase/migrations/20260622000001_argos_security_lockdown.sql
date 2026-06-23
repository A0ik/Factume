-- ARGOS (CIBLE 4) — Verrouillage sécurité des fonctions SECURITY DEFINER et policies.
-- Appliqué en prod le 2026-06-22 via MCP. Reproductible sur un nouvel environnement.
--
-- Contexte : l'advisor Supabase a révélé que ~37 fonctions SECURITY DEFINER étaient
-- exécutables par anon via /rest/v1/rpc/. Plusieurs (get_cron_secret, expire_trials,
-- activate_trial, consume_ocr_quota, consume_voice_quota, try_acquire_ai_slot,
-- release_ai_slot) n'avaient AUCUN garde auth.uid() et prenaient un p_user_id contrôlé
-- par l'appelant → failles vivantes (fuite de secret cron, DoS quota, bypass facturation).
--
-- Fix : ces fonctions sont toutes appelées côté serveur via le client service_role
-- (createAdminClient). On retire le droit PUBLIC par défaut (dont héritent anon et
-- authenticated), puis on n'accorde EXECUTE qu'à service_role (toutes) et à authenticated
-- (uniquement les fonctions munies d'un garde auth.uid() = RPC utilisateurs légitimes).

DO $$
DECLARE r record;
BEGIN
  -- Retire PUBLIC (ferme anon ET authenticated par héritage) sur toutes les SECURITY DEFINER.
  FOR r IN
    SELECT p.oid AS fn_oid FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.fn_oid::regprocedure::text);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.fn_oid::regprocedure::text);
  END LOOP;

  -- Réaccorde authenticated uniquement aux fonctions qui vérifient auth.uid().
  FOR r IN
    SELECT p.oid AS fn_oid FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND pg_get_functiondef(p.oid) ILIKE '%auth.uid()%'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.fn_oid::regprocedure::text);
  END LOOP;
END $$;

-- (2) invoice_audit_trail : la Piste d'Audit Fiable (Art. 289 VII CGI) ne doit pas être
--     forgable par un client. L'insertion se fait côté serveur via service_role (admin),
--     qui bypass RLS. On supprime la policy INSERT WITH CHECK (true).
DROP POLICY IF EXISTS audit_trail_insert_only ON public.invoice_audit_trail;

-- (3a) approval_requests : policy ALL USING(true) WITH CHECK(true) → owner-scoped.
DROP POLICY IF EXISTS service_approval_requests ON public.approval_requests;
DROP POLICY IF EXISTS approval_requests_insert ON public.approval_requests;
CREATE POLICY approval_requests_owner ON public.approval_requests
  FOR ALL
  USING (requested_by = auth.uid() OR requested_to = auth.uid())
  WITH CHECK (requested_by = auth.uid() OR requested_to = auth.uid());

-- (3b) expense_tags (table de jointure) : policy ALL true → propriétaire via l'expense.
DROP POLICY IF EXISTS service_expense_tags ON public.expense_tags;
DROP POLICY IF EXISTS expense_tags_insert ON public.expense_tags;
CREATE POLICY expense_tags_owner ON public.expense_tags
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_tags.expense_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_tags.expense_id AND e.user_id = auth.uid()));

-- (4) accounting_expenses_view : SECURITY DEFINER → SECURITY INVOKER (hérite du RLS appelant).
ALTER VIEW public.accounting_expenses_view SET (security_invoker = true);
