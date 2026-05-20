-- =====================================================
-- Migration : Multi-Cabinet + Paie + DPAE + DSN
-- Date : 2026-05-20
-- Description : Refonte complète du module cabinet
-- =====================================================

-- ─── 1. ENRICHIR LA TABLE CABINETS ──────────────────
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS ape_code TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS urssaf_number TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS ccn_id TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS effectif INTEGER DEFAULT 0;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Générer un slug pour les cabinets existants
UPDATE cabinets SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL AND name IS NOT NULL;

-- ─── 2. TABLE CABINET_MEMBERS ───────────────────────
CREATE TABLE IF NOT EXISTS cabinet_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'collaborateur', 'invited')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cabinet_id, user_id)
);

-- Insérer les owners existants dans cabinet_members
INSERT INTO cabinet_members (cabinet_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM cabinets
WHERE owner_id IS NOT NULL
ON CONFLICT (cabinet_id, user_id) DO NOTHING;

-- ─── 3. ENRICHIR CABINET_EMPLOYEES ──────────────────
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS statut_cadre TEXT DEFAULT 'non_cadre' CHECK (statut_cadre IN ('cadre', 'non_cadre', 'alternance', 'stage'));
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS coef INTEGER DEFAULT 100;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS convention_collective TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS convention_collective_id TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS situation_familiale TEXT DEFAULT 'celibataire' CHECK (situation_familiale IN ('celibataire', 'marie', 'pacre', 'divorce', 'veuf', 'separe'));
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS nombre_enfants INTEGER DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS bank_iban TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS mutuelle_employeur NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS mutuelle_salarie NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS prevoyance_employeur NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS prevoyance_salarie NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS taux_at NUMERIC DEFAULT 0.70;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS transport_forfait NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS ticket_resto_nombre INTEGER DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS ticket_resto_employeur NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS ticket_resto_salarie NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS versement_mobilite NUMERIC DEFAULT 0;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS date_entree_entreprise DATE;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS numero_contrat TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS lieu_travail TEXT;
ALTER TABLE cabinet_employees ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 4. TABLE BULLETINS_PAIE ────────────────────────
CREATE TABLE IF NOT EXISTS bulletins_paie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES cabinet_employees(id) ON DELETE CASCADE,
  client_id UUID,
  mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020),
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  -- Montants
  salaire_brut NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_heures NUMERIC(8,2) DEFAULT 0,
  heures_supp_25 NUMERIC(8,2) DEFAULT 0,
  heures_supp_50 NUMERIC(8,2) DEFAULT 0,
  primes_total NUMERIC(12,2) DEFAULT 0,
  absences_retenue NUMERIC(12,2) DEFAULT 0,
  salaire_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_imposable NUMERIC(12,2) NOT NULL DEFAULT 0,
  cout_employeur NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- PAS (Prélèvement à la source)
  pas_montant NUMERIC(12,2) DEFAULT 0,
  pas_taux NUMERIC(6,4) DEFAULT 0,
  -- Cumuls annuels
  cumul_brut_annuel NUMERIC(12,2) DEFAULT 0,
  cumul_net_annuel NUMERIC(12,2) DEFAULT 0,
  cumul_net_imposable_annuel NUMERIC(12,2) DEFAULT 0,
  cumul_heures_annuel NUMERIC(10,2) DEFAULT 0,
  -- Détails JSON
  cotisations_salariales JSONB DEFAULT '{}',
  cotisations_patronales JSONB DEFAULT '{}',
  primes_detail JSONB DEFAULT '{}',
  absences_detail JSONB DEFAULT '{}',
  indemnites_detail JSONB DEFAULT '{}',
  -- Congés
  conges_acquis NUMERIC(6,2) DEFAULT 0,
  conges_pris NUMERIC(6,2) DEFAULT 0,
  conges_solde NUMERIC(6,2) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'valide', 'paye')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, mois, annee)
);

-- ─── 5. TABLE CONTRATS_TRAVAIL ──────────────────────
CREATE TABLE IF NOT EXISTS contrats_travail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES cabinet_employees(id) ON DELETE CASCADE,
  client_id UUID,
  -- Type de contrat
  type_contrat TEXT NOT NULL CHECK (type_contrat IN ('CDI', 'CDD', 'CDD_usage', 'CDD_reconversion', 'Interim', 'Stage', 'Apprentissage', 'Professionnalisation', 'Portage', 'Freelance')),
  -- Dates
  date_debut DATE NOT NULL,
  date_fin DATE,
  date_signature DATE,
  -- CDD spécifique
  motif_cdd TEXT,
  motif_cdd_detail TEXT,
  -- Essai
  periode_essai_jours INTEGER DEFAULT 0,
  periode_essai_fin DATE,
  -- Rémunération
  salaire_brut_mensuel NUMERIC(12,2) NOT NULL,
  taux_horaire NUMERIC(8,4),
  heures_hebdo NUMERIC(5,2) DEFAULT 35,
  -- Classification
  statut_cadre TEXT DEFAULT 'non_cadre' CHECK (statut_cadre IN ('cadre', 'non_cadre', 'alternance', 'stage')),
  classification TEXT,
  coef INTEGER DEFAULT 100,
  convention_collective TEXT,
  convention_collective_id TEXT,
  -- Poste
  poste TEXT NOT NULL,
  lieu_travail TEXT,
  -- Clauses
  clauses JSONB DEFAULT '{}',
  -- Avenants
  avenants JSONB DEFAULT '[]',
  -- Rupture
  status TEXT DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'en_attente_signature', 'signe', 'suspendu', 'rompu', 'termine')),
  motif_rupture TEXT,
  date_rupture DATE,
  -- Documents
  docx_url TEXT,
  pdf_url TEXT,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. TABLE DPAE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dpae (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES cabinet_employees(id) ON DELETE CASCADE,
  client_id UUID,
  -- Infos employeur
  employeur_siret TEXT NOT NULL,
  employeur_urssaf TEXT,
  employeur_nom TEXT NOT NULL,
  employeur_adresse TEXT,
  employeur_code_postal TEXT,
  employeur_ville TEXT,
  -- Infos salarié
  salarie_nom TEXT NOT NULL,
  salarie_prenom TEXT NOT NULL,
  salarie_civilite TEXT,
  salarie_date_naissance DATE,
  salarie_lieu_naissance TEXT,
  salarie_departement_naissance TEXT,
  salarie_pays_naissance TEXT DEFAULT 'France',
  salarie_nationalite TEXT DEFAULT 'Française',
  salarie_nir TEXT,
  salarie_adresse TEXT,
  salarie_code_postal TEXT,
  salarie_ville TEXT,
  -- Infos contrat
  date_embauche DATE NOT NULL,
  type_contrat TEXT NOT NULL,
  poste TEXT,
  salaire_brut NUMERIC(12,2),
  heures_hebdo NUMERIC(5,2) DEFAULT 35,
  convention_collective TEXT,
  -- DPAE
  numero_dpae TEXT,
  status TEXT DEFAULT 'en_preparation' CHECK (status IN ('en_preparation', 'envoyee', 'confirmee', 'rejetee')),
  date_envoi TIMESTAMPTZ,
  date_confirmation TIMESTAMPTZ,
  observations TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. TABLE DSN ───────────────────────────────────
CREATE TABLE IF NOT EXISTS dsn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE,
  client_id UUID,
  -- Type
  type_dsn TEXT NOT NULL CHECK (type_dsn IN ('mensuelle', 'embauche', 'arret_maladie', 'reprise', 'fin_contrat', 'autre_evenement')),
  -- Période
  mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020),
  -- Stats
  nb_salaries INTEGER DEFAULT 0,
  total_brut NUMERIC(14,2) DEFAULT 0,
  total_cotisations_patronales NUMERIC(14,2) DEFAULT 0,
  total_cotisations_salariales NUMERIC(14,2) DEFAULT 0,
  total_net NUMERIC(14,2) DEFAULT 0,
  total_pas NUMERIC(14,2) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'en_preparation' CHECK (status IN ('en_preparation', 'controle', 'envoyee', 'acceptee', 'rejetee', 'a_corriger')),
  date_echeance DATE,
  date_envoi TIMESTAMPTZ,
  numero_dsn TEXT,
  -- Détails
  erreurs JSONB DEFAULT '[]',
  avertissements JSONB DEFAULT '[]',
  details JSONB DEFAULT '{}',
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. INDEX ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cabinet_members_user ON cabinet_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_members_cabinet ON cabinet_members(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_paie_cabinet ON bulletins_paie(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_paie_employee ON bulletins_paie(employee_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_paie_periode ON bulletins_paie(mois, annee);
CREATE INDEX IF NOT EXISTS idx_contrats_travail_cabinet ON contrats_travail(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_contrats_travail_employee ON contrats_travail(employee_id);
CREATE INDEX IF NOT EXISTS idx_dpae_cabinet ON dpae(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_dpae_employee ON dpae(employee_id);
CREATE INDEX IF NOT EXISTS idx_dsn_cabinet ON dsn(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_dsn_periode ON dsn(mois, annee);

-- ─── 9. RLS POLICIES ───────────────────────────────
ALTER TABLE cabinet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins_paie ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats_travail ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpae ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsn ENABLE ROW LEVEL SECURITY;

-- cabinet_members
CREATE POLICY "Users can view their cabinet memberships"
  ON cabinet_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their cabinet memberships"
  ON cabinet_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can manage their cabinet members"
  ON cabinet_members FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- bulletins_paie
CREATE POLICY "Cabinet members can manage bulletins"
  ON bulletins_paie FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid())
  );

-- contrats_travail
CREATE POLICY "Cabinet members can manage contrats"
  ON contrats_travail FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid())
  );

-- dpae
CREATE POLICY "Cabinet members can manage dpae"
  ON dpae FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid())
  );

-- dsn
CREATE POLICY "Cabinet members can manage dsn"
  ON dsn FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM cabinet_members WHERE user_id = auth.uid())
  );
