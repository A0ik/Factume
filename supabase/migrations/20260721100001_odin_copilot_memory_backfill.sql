-- ============================================================================
-- ODIN (S8) — Backfill traçabilité ISO des tables Copilot/voix + création
-- de `copilot_preferences` (manquante en prod → synchro FAB cross-device réparée).
-- ----------------------------------------------------------------------------
-- Les tables copilot_memory / copilot_conversations / voice_corrections existent
-- DÉJÀ en prod (créées via MCP lors des sessions PROMÉTHÉE/HÉPHAISTOS) mais
-- n'avaient jamais été portées dans le repo. Cette migration les documente
-- (CREATE ... IF NOT EXISTS → no-op sur l'existant, création sur un env neuf) et
-- ajoute la table `copilot_preferences` qui manquait (position du FAB +
-- activation du mode proactif).
-- ============================================================================

-- L'extension vector est nécessaire pour le type `vector(1536)` (RAG Copilot).
CREATE EXTENSION IF NOT EXISTS vector;

-- ----- copilot_memory : mémoire long-terme RAG (pgvector 1536-d) -------------
CREATE TABLE IF NOT EXISTS public.copilot_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS copilot_memory_embedding_idx
  ON public.copilot_memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS copilot_memory_user_idx ON public.copilot_memory(user_id);

-- ----- copilot_conversations : mémoire court-terme cross-device --------------
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS copilot_conversations_user_session_idx
  ON public.copilot_conversations(user_id, session_id, created_at);

-- ----- voice_corrections : auto-apprentissage des corrections vocales --------
CREATE TABLE IF NOT EXISTS public.voice_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field varchar(100) NOT NULL,
  original_value text NOT NULL,
  corrected_value text NOT NULL,
  context varchar(50) DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

-- ----- copilot_preferences : NOUVELLE (position FAB + mode proactif) ---------
CREATE TABLE IF NOT EXISTS public.copilot_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fab_position jsonb,
  proactive_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----- RLS : tout est scopé par propriétaire (user_id = auth.uid()) ----------
ALTER TABLE public.copilot_memory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_corrections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_preferences   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_memory_owner ON public.copilot_memory;
CREATE POLICY copilot_memory_owner ON public.copilot_memory
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_conversations_owner ON public.copilot_conversations;
CREATE POLICY copilot_conversations_owner ON public.copilot_conversations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS voice_corrections_owner ON public.voice_corrections;
CREATE POLICY voice_corrections_owner ON public.voice_corrections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_preferences_owner ON public.copilot_preferences;
CREATE POLICY copilot_preferences_owner ON public.copilot_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----- trigger updated_at sur copilot_memory --------------------------------
CREATE OR REPLACE FUNCTION public.touch_copilot_memory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS copilot_memory_touch ON public.copilot_memory;
CREATE TRIGGER copilot_memory_touch
  BEFORE UPDATE ON public.copilot_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_copilot_memory_updated_at();
