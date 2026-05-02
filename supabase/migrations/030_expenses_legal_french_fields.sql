-- Migration: Ajout des champs légaux français pour les notes de frais
-- Conforme à la législation française 2024

-- Ajout des champs légaux à la table expenses
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'France',
ADD COLUMN IF NOT EXISTS trip_type TEXT CHECK (trip_type IN ('professional', 'training', 'client_meeting', 'other')),
ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
ADD COLUMN IF NOT EXISTS mileage_rate NUMERIC,
ADD COLUMN IF NOT EXISTS meal_allowance NUMERIC,
ADD COLUMN IF NOT EXISTS tax_free_amount NUMERIC,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS is_deductible BOOLEAN DEFAULT true;

-- Ajout d'un index sur client_id pour les performances
CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_location_country ON expenses(location_country);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- Commentaires pour la documentation
COMMENT ON COLUMN expenses.location_city IS 'Ville de la dépense (obligatoire légalement pour distinguer frais domestiques/étrangers)';
COMMENT ON COLUMN expenses.location_country IS 'Pays de la dépense (France par défaut)';
COMMENT ON COLUMN expenses.trip_type IS 'Type de déplacement: professionnel, formation, réunion client, autre';
COMMENT ON COLUMN expenses.distance_km IS 'Distance parcourue en km pour les indemnités kilométriques';
COMMENT ON COLUMN expenses.mileage_rate IS 'Taux applicable pour les IK (calculé selon barème URSSAF)';
COMMENT ON COLUMN expenses.meal_allowance IS 'Plafond d''exonération repas appliqué (2024: 20.20€ journée, 9.80€ demi-journée)';
COMMENT ON COLUMN expenses.tax_free_amount IS 'Montant exonéré d''impôts (partie non imposable)';
COMMENT ON COLUMN expenses.client_id IS 'Client associé pour rattachement comptable';
COMMENT ON COLUMN expenses.project_code IS 'Code projet pour rattachement comptable et facturation';
COMMENT ON COLUMN expenses.is_deductible IS 'Dépense déductible fiscalement (true par défaut)';

-- Mettre à jour les dépenses existantes avec des valeurs par défaut
UPDATE expenses
SET
  location_country = COALESCE(location_country, 'France'),
  is_deductible = COALESCE(is_deductible, true)
WHERE location_country IS NULL OR is_deductible IS NULL;

-- Créer une vue pour les exports comptables
CREATE OR REPLACE VIEW accounting_expenses_view AS
SELECT
  id,
  date,
  vendor,
  description,
  category,
  amount,
  vat_amount,
  amount - vat_amount as amount_ht,
  payment_method,
  location_city,
  location_country,
  trip_type,
  distance_km,
  mileage_rate,
  meal_allowance,
  tax_free_amount,
  client_id,
  project_code,
  is_deductible,
  status,
  receipt_url,
  created_at,
  updated_at
FROM expenses
WHERE status = 'validated'
ORDER BY date DESC;

COMMENT ON VIEW accounting_expenses_view IS 'Vue comptable pour les exports légales (FEC, CSV)';

-- Trigger pour calculer automatiquement les montants exonérés pour les repas
CREATE OR REPLACE FUNCTION calculate_meal_tax_free()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est un repas et que le montant est défini
  IF NEW.category = 'meals' AND NEW.amount IS NOT NULL THEN
    -- Par défaut: journée complète (20.20€ en 2024)
    NEW.meal_allowance := COALESCE(NEW.meal_allowance, 20.20);
    NEW.tax_free_amount := LEAST(NEW.amount::NUMERIC, NEW.meal_allowance);
  END IF;

  -- Pour les IK, pas de TVA
  IF NEW.category = 'mileage' THEN
    NEW.vat_amount := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si'il n'existe pas
DROP TRIGGER IF EXISTS trigger_calculate_meal_tax_free ON expenses;
CREATE TRIGGER trigger_calculate_meal_tax_free
  BEFORE INSERT OR UPDATE OF amount, category, meal_allowance
  ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_meal_tax_free();

-- Politique RLS pour permettre l'accès aux données clients pour le rattachement
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their expenses with client info" ON expenses;
CREATE POLICY "Users can view their expenses with client info"
  ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert expenses with client attachment" ON expenses;
CREATE POLICY "Users can insert expenses with client attachment"
  ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their expenses" ON expenses;
CREATE POLICY "Users can update their expenses"
  ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id);
