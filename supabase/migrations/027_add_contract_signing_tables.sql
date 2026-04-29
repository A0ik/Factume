-- Migration: Add Contract Signing Tokens and Logs Tables
-- Ces tables sont nécessaires pour la fonctionnalité de signature électronique

-- Table pour stocker les tokens de signature expirables
CREATE TABLE IF NOT EXISTS public.contract_signing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  contract_id UUID NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi', 'cdd', 'other')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.contract_signing_tokens ENABLE ROW LEVEL SECURITY;

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS contract_signing_tokens_token_idx ON public.contract_signing_tokens(token);
CREATE INDEX IF NOT EXISTS contract_signing_tokens_contract_idx ON public.contract_signing_tokens(contract_id, contract_type);
CREATE INDEX IF NOT EXISTS contract_signing_tokens_expires_idx ON public.contract_signing_tokens(expires_at);

-- RLS pour contract_signing_tokens
CREATE POLICY "Users can view own signing tokens" ON public.contract_signing_tokens
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can insert own signing tokens" ON public.contract_signing_tokens
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Service role can manage signing tokens" ON public.contract_signing_tokens
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Table pour logger les événements de signature (audit trail)
CREATE TABLE IF NOT EXISTS public.contract_signature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi', 'cdd', 'other')),
  token_id UUID REFERENCES public.contract_signing_tokens(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_signature_logs ENABLE ROW LEVEL SECURITY;

-- Index pour les logs
CREATE INDEX IF NOT EXISTS contract_signature_logs_contract_idx ON public.contract_signature_logs(contract_id);
CREATE INDEX IF NOT EXISTS contract_signature_logs_token_idx ON public.contract_signature_logs(token_id);
CREATE INDEX IF NOT EXISTS contract_signature_logs_event_type_idx ON public.contract_signature_logs(event_type);
CREATE INDEX IF NOT EXISTS contract_signature_logs_created_idx ON public.contract_signature_logs(created_at DESC);

-- RLS pour contract_signature_logs (lecture seule pour les utilisateurs)
CREATE POLICY "Users can view own signature logs" ON public.contract_signature_logs
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM public.contracts_cdi WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_cdd WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_other WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert signature logs" ON public.contract_signature_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Commentaires
COMMENT ON TABLE public.contract_signing_tokens IS 'Tokens de signature électronique pour les contrats (valides 7 jours)';
COMMENT ON TABLE public.contract_signature_logs IS 'Journal d''audit des événements de signature';
