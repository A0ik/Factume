const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const createTablesSQL = `
-- Table pour les tokens de signature de devis
CREATE TABLE IF NOT EXISTS public.quote_signing_tokens (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token                 text NOT NULL UNIQUE,
  client_email          text NOT NULL,
  client_name           text NOT NULL,
  signed_at             timestamptz,
  signer_name           text,
  signature_data_url    text,
  expires_at            timestamptz NOT NULL,
  view_count            int DEFAULT 0,
  created_at            timestamptz DEFAULT now()
);

-- Table pour les logs de signature de devis
CREATE TABLE IF NOT EXISTS public.quote_signature_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              uuid NOT NULL,
  token_id              uuid,
  event_type            text NOT NULL,
  ip_address            text,
  user_agent            text,
  metadata              jsonb,
  created_at            timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.quote_signing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_signature_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own quote signing tokens" ON public.quote_signing_tokens;
DROP POLICY IF EXISTS "Service role can manage all quote signing tokens" ON public.quote_signing_tokens;
DROP POLICY IF EXISTS "Users can view logs for their quotes" ON public.quote_signature_logs;
DROP POLICY IF EXISTS "Service role can insert quote signature logs" ON public.quote_signature_logs;

-- Créer les nouvelles politiques RLS
CREATE POLICY "Users can view their own quote signing tokens"
  ON public.quote_signing_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quote signing tokens"
  ON public.quote_signing_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view logs for their quotes"
  ON public.quote_signature_logs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.invoices WHERE id = quote_id
    )
  );

CREATE POLICY "Service role can insert quote signature logs"
  ON public.quote_signature_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_quote_signing_tokens_token ON public.quote_signing_tokens(token);
CREATE INDEX IF NOT EXISTS idx_quote_signing_tokens_quote_id ON public.quote_signing_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_signing_tokens_expires_at ON public.quote_signing_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_quote_signature_logs_quote_id ON public.quote_signature_logs(quote_id);
`;

async function createTables() {
  try {
    // Utiliser l'endpoint RPC pour exécuter du SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createTablesSQL
    });

    if (error) {
      console.error('Error creating tables:', error);
      process.exit(1);
    }

    console.log('✅ Tables created successfully!');
    console.log('Created tables:');
    console.log('  - quote_signing_tokens');
    console.log('  - quote_signature_logs');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createTables();
