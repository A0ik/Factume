-- ============================================================
-- 20260620000002_superpdp_connections_and_fixes.sql
-- PROMETHEUS — CIBLE 1 : déblocage e-invoicing SuperPDP.
--
-- 1) CRÉE la table superpdp_connections — référencée par tout le flux OAuth2
--    (lib/superPdpClient.ts) mais JAMAIS créée par une migration. Sans elle,
--    le callback OAuth échoue à l'upsert → toute la feature était morte.
-- 2) Ajoute 'not_required_b2c' au CHECK de invoices.pdp_status (sinon
--    send-invoice lève une violation CHECK sur les factures B2C).
-- 3) Ajoute UNIQUE(invoice_id) sur pdp_transmissions pour permettre l'upsert
--    d'audit lors de la transmission (la table était « morte »).
-- ============================================================

-- (1) Table des connexions OAuth2 SuperPDP (1 ligne active par utilisateur).
CREATE TABLE IF NOT EXISTS public.superpdp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  siren TEXT,
  siret TEXT,
  company_name TEXT,
  platform_company_id TEXT,
  env TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT,
  access_token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Une seule connexion active par utilisateur (onConflict: 'user_id' côté code).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_superpdp_connections_user_id
  ON public.superpdp_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_superpdp_connections_user_active
  ON public.superpdp_connections(user_id)
  WHERE revoked_at IS NULL;

-- updated_at automatique
CREATE OR REPLACE FUNCTION public.update_superpdp_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS superpdp_connections_updated_at ON public.superpdp_connections;
CREATE TRIGGER superpdp_connections_updated_at
  BEFORE UPDATE ON public.superpdp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_superpdp_connections_updated_at();

-- RLS : un utilisateur ne gère que SA connexion. Le code serveur utilise le
-- client admin (outrepasse RLS), mais on active RLS par défense en profondeur.
ALTER TABLE public.superpdp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SuperPDP connection"
  ON public.superpdp_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SuperPDP connection"
  ON public.superpdp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SuperPDP connection"
  ON public.superpdp_connections FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.superpdp_connections IS 'Connexions OAuth2 SuperPDP (Authorization Code). Token = entreprise émettrice. 1 connexion active par utilisateur.';

-- (2) CHECK pdp_status : ajoute 'not_required_b2c' (B2C = pas de transmission).
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_pdp_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_pdp_status_check
  CHECK (pdp_status = ANY (ARRAY[
    'not_transmitted',
    'transmitting',
    'transmitted',
    'pending_retry',
    'failed',
    'not_required_b2c'
  ]));

-- (3) pdp_transmissions : 1 ligne par facture (upsert d'audit côté transmit).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pdp_transmissions_invoice_id
  ON public.pdp_transmissions(invoice_id);
