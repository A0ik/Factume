-- ============================================================
-- SUPER PDP INTEGRATION : Champs de transmission électronique
-- Ajoute les colonnes nécessaires pour le suivi des transmissions
-- via Super PDP (PDP agréée).
-- ============================================================

-- 1. Ajouter les colonnes PDP à la table invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_transmission_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_status TEXT
  DEFAULT 'not_transmitted'
  CHECK (pdp_status = ANY (ARRAY[
    'not_transmitted',  -- Pas encore transmise (défaut)
    'transmitting',     -- En cours de transmission
    'transmitted',      -- Transmise avec succès
    'pending_retry',    -- Échec temporaire, en attente de retry
    'failed'            -- Échec définitif
  ]));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_last_error TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_transmitted_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_retry_count INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdp_next_retry_at TIMESTAMPTZ;

-- 2. Index pour le cron de retry
CREATE INDEX IF NOT EXISTS idx_invoices_pdp_retry
  ON invoices(id, user_id, pdp_status, pdp_next_retry_at)
  WHERE pdp_status = 'pending_retry';

-- 3. Index pour rechercher les factures transmises
CREATE INDEX IF NOT EXISTS idx_invoices_pdp_transmission
  ON invoices(pdp_transmission_id)
  WHERE pdp_transmission_id IS NOT NULL;

-- 4. Commentaires pour la documentation
COMMENT ON COLUMN invoices.pdp_transmission_id IS 'ID de transmission Super PDP (retourné par l''API)';
COMMENT ON COLUMN invoices.pdp_status IS 'Statut de transmission électronique: not_transmitted, transmitting, transmitted, pending_retry, failed';
COMMENT ON COLUMN invoices.pdp_last_error IS 'Dernière erreur de transmission Super PDP';
COMMENT ON COLUMN invoices.pdp_transmitted_at IS 'Date/heure de la transmission réussie';
COMMENT ON COLUMN invoices.pdp_retry_count IS 'Nombre de tentatives de transmission';
COMMENT ON COLUMN invoices.pdp_next_retry_at IS 'Date/heure du prochain retry programmé';
