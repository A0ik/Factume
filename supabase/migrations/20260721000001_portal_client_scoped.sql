-- ATHÉNA CIBLE 6 — client_portal_tokens becomes CLIENT-scoped (prod was invoice-scoped).
-- The /api/client-portal routes are already client-scoped in intent (insert {client_id,
-- user_id}, select client:clients(*)); only the prod table lacked those columns + a token
-- default, so generate silently 500'd and the "Portail" button looked dead.
-- Applied on A0ik's Project (ggrwyfhptxwpahwkeoyj) via Supabase MCP — this file mirrors it.

ALTER TABLE public.client_portal_tokens
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.client_portal_tokens
  ALTER COLUMN invoice_id DROP NOT NULL;

ALTER TABLE public.client_portal_tokens
  ALTER COLUMN token SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.client_portal_tokens
  DROP CONSTRAINT IF EXISTS client_portal_tokens_client_id_fkey;
ALTER TABLE public.client_portal_tokens
  ADD CONSTRAINT client_portal_tokens_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.client_portal_tokens
  DROP CONSTRAINT IF EXISTS client_portal_tokens_client_user_key;
ALTER TABLE public.client_portal_tokens
  ADD CONSTRAINT client_portal_tokens_client_user_key UNIQUE (client_id, user_id);

DROP POLICY IF EXISTS "Client owners can manage portal tokens" ON public.client_portal_tokens;
CREATE POLICY "Client owners can manage portal tokens"
ON public.client_portal_tokens FOR ALL
TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
