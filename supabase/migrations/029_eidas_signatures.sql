-- ============================================
-- MIGRATION: Signatures électroniques conformes eIDAS
-- Règlement (UE) N° 910/2014
-- ============================================

-- Table des signatures eIDAS
CREATE TABLE IF NOT EXISTS eidas_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id TEXT UNIQUE NOT NULL,
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quote', 'contract', 'credit_note')),

  -- Informations du signataire
  signer_name TEXT NOT NULL,
  signer_email TEXT,

  -- Données de signature
  signature_url TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  location JSONB, -- {country, city, etc.}

  -- Conformité eIDAS
  eidas_level TEXT NOT NULL CHECK (eidas_level IN ('simple', 'advanced', 'qualified')),
  eidas_compliant BOOLEAN DEFAULT true,
  eidas_regulation TEXT DEFAULT 'Règlement (UE) N° 910/2014',

  -- Horodatage certifié (RFC 3161)
  tsa_url TEXT,
  tsa_token TEXT,
  timestamp TEXT NOT NULL,

  -- Intégrité du document
  document_hash TEXT NOT NULL,
  document_content_hash TEXT,

  -- Certificat (pour QES)
  certificate_id TEXT,
  certificate_url TEXT,

  -- Vérification
  verification_token TEXT UNIQUE NOT NULL,
  verification_url TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  valid BOOLEAN DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_eidas_signatures_document_id ON eidas_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_eidas_signatures_signature_id ON eidas_signatures(signature_id);
CREATE INDEX IF NOT EXISTS idx_eidas_signatures_verification_token ON eidas_signatures(verification_token);
CREATE INDEX IF NOT EXISTS idx_eidas_signatures_signer_email ON eidas_signatures(signer_email);
CREATE INDEX IF NOT EXISTS idx_eidas_signatures_created_at ON eidas_signatures(created_at DESC);

-- Journal immuable des signatures (traçabilité 10 ans)
CREATE TABLE IF NOT EXISTS eidas_signature_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT NOT NULL,
  eidas_level TEXT NOT NULL,
  certificate_id TEXT,

  -- Informations de contexte
  event_type TEXT NOT NULL DEFAULT 'signature', -- signature, verification, revocation
  user_agent TEXT,
  location JSONB,

  -- Ne peut pas être modifié (journal immuable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pour le journal
CREATE INDEX IF NOT EXISTS idx_eidas_signature_log_signature_id ON eidas_signature_log(signature_id);
CREATE INDEX IF NOT EXISTS idx_eidas_signature_log_document_id ON eidas_signature_log(document_id);
CREATE INDEX IF NOT EXISTS idx_eidas_signature_log_created_at ON eidas_signature_log(created_at DESC);

-- Ajouter les colonnes eIDAS aux factures existantes
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS eidas_signature_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eidas_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eidas_level TEXT CHECK (eidas_level IN ('simple', 'advanced', 'qualified')),
  ADD COLUMN IF NOT EXISTS eidas_verification_url TEXT;

-- Ajouter les colonnes eIDAS aux contrats existants
ALTER TABLE contracts_cdi
  ADD COLUMN IF NOT EXISTS eidas_signature_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eidas_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eidas_level TEXT CHECK (eidas_level IN ('simple', 'advanced', 'qualified')),
  ADD COLUMN IF NOT EXISTS eidas_verification_url TEXT;

ALTER TABLE contracts_cdd
  ADD COLUMN IF NOT EXISTS eidas_signature_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eidas_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eidas_level TEXT CHECK (eidas_level IN ('simple', 'advanced', 'qualified')),
  ADD COLUMN IF NOT EXISTS eidas_verification_url TEXT;

ALTER TABLE contracts_other
  ADD COLUMN IF NOT EXISTS eidas_signature_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eidas_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eidas_level TEXT CHECK (eidas_level IN ('simple', 'advanced', 'qualified')),
  ADD COLUMN IF NOT EXISTS eidas_verification_url TEXT;

-- Commentaires
COMMENT ON TABLE eidas_signatures IS 'Signatures électroniques conformes eIDAS (Règlement UE N° 910/2014)';
COMMENT ON TABLE eidas_signature_log IS 'Journal immuable des signatures (conservation 10 ans minimum)';
COMMENT ON COLUMN eidas_signatures.eidas_level IS 'Niveau de conformité eIDAS : simple, advanced (AdES), qualified (QES)';
COMMENT ON COLUMN eidas_signatures.document_hash IS 'Hash SHA-256 du document pour garantie d''intégrité';
COMMENT ON COLUMN eidas_signatures.tsa_token IS 'Token d''horodatage certifié (RFC 3161) pour valeur probante';

-- RLS (Row Level Security)
ALTER TABLE eidas_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE eidas_signature_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour eidas_signatures
CREATE POLICY "Users can view their own eidas signatures"
  ON eidas_signatures FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_cdi WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_cdd WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_other WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage eidas signatures"
  ON eidas_signatures FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politiques RLS pour eidas_signature_log (lecture seule après création)
CREATE POLICY "Users can view their own eidas signature logs"
  ON eidas_signature_log FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_cdi WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_cdd WHERE user_id = auth.uid()
      UNION
      SELECT id FROM contracts_other WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert eidas signature logs"
  ON eidas_signature_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fonction de mise à jour du timestamp updated_at
CREATE OR REPLACE FUNCTION update_eidas_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la mise à jour automatique
CREATE TRIGGER eidas_signatures_updated_at
  BEFORE UPDATE ON eidas_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_eidas_signatures_updated_at();

-- Vue pour les statistiques eIDAS
CREATE OR REPLACE VIEW eidas_statistics AS
SELECT
  eidas_level,
  document_type,
  COUNT(*) as total_signatures,
  COUNT(DISTINCT document_id) as unique_documents,
  COUNT(DISTINCT signer_email) as unique_signers,
  MIN(created_at) as first_signature,
  MAX(created_at) as last_signature
FROM eidas_signatures
GROUP BY eidas_level, document_type
ORDER BY eidas_level, document_type;

COMMENT ON VIEW eidas_statistics IS 'Statistiques des signatures eIDAS par niveau et type de document';
