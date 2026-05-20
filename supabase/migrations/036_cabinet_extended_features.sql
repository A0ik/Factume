-- Cabinet extended features for accountant mode
-- Adds tables for: invoices, reminders, social tracking, employees, missions, legal acts, fiscal deadlines

-- Cabinet invoices (separate from user invoices)
CREATE TABLE IF NOT EXISTS public.cabinet_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.cabinet_clients(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  amount_ht numeric(12,2) NOT NULL DEFAULT 0,
  amount_tva numeric(12,2) NOT NULL DEFAULT 0,
  amount_ttc numeric(12,2) NOT NULL DEFAULT 0,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  description text,
  objet text,
  payment_method text,
  items jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cabinet_id, number)
);
ALTER TABLE public.cabinet_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_invoices" ON public.cabinet_invoices
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet reminders
CREATE TABLE IF NOT EXISTS public.cabinet_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.cabinet_invoices(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_reminders" ON public.cabinet_reminders
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet social tracking (monthly per client)
CREATE TABLE IF NOT EXISTS public.cabinet_social_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.cabinet_clients(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  nb_employees integer DEFAULT 0,
  bs_issued integer DEFAULT 0,
  bs_validated integer DEFAULT 0,
  dsn_status text CHECK (dsn_status IN ('sent', 'pending', 'blocked', 'na')),
  stc_status text,
  contracts_count integer DEFAULT 0,
  amendments_count integer DEFAULT 0,
  at_mp boolean DEFAULT false,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cabinet_id, client_id, month, year)
);
ALTER TABLE public.cabinet_social_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_social" ON public.cabinet_social_tracking
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet employees
CREATE TABLE IF NOT EXISTS public.cabinet_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.cabinet_clients(id) ON DELETE CASCADE,
  last_name text NOT NULL,
  first_name text NOT NULL,
  birth_date date,
  birth_place text,
  nationality text DEFAULT 'Française',
  social_security_number text,
  address text,
  gender text CHECK (gender IN ('M.', 'Mme')),
  job_title text,
  contract_type text NOT NULL DEFAULT 'CDI' CHECK (contract_type IN ('CDI', 'CDD', 'CDD_usage', 'Interim', 'Stage', 'Apprentissage', 'Professionnalisation', 'Portage', 'Freelance')),
  salary_brut_monthly numeric(10,2),
  hourly_rate numeric(6,2),
  hours_per_week numeric(4,2) DEFAULT 35,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'ended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_employees" ON public.cabinet_employees
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet mission letters
CREATE TABLE IF NOT EXISTS public.cabinet_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.cabinet_clients(id) ON DELETE CASCADE,
  mission_type text NOT NULL CHECK (mission_type IN ('expertise_comptable', 'paie_social', 'cac', 'conseil_fiscal', 'juridique', 'autre')),
  description text,
  start_date date NOT NULL,
  end_date date,
  auto_renew boolean DEFAULT true,
  monthly_fee numeric(10,2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'signed', 'expired', 'to_renew', 'cancelled')),
  responsible text,
  signed_at timestamptz,
  signed_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_missions" ON public.cabinet_missions
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet legal acts
CREATE TABLE IF NOT EXISTS public.cabinet_legal_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.cabinet_clients(id) ON DELETE CASCADE,
  act_type text NOT NULL CHECK (act_type IN (
    'pv_ag', 'statuts_modification', 'nomination', 'radiation',
    'transfert_siege', 'capital_variation', 'dissolution', 'autre'
  )),
  description text,
  act_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'filed')),
  responsible text,
  notes text,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_legal_acts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_legal" ON public.cabinet_legal_acts
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet fiscal deadlines
CREATE TABLE IF NOT EXISTS public.cabinet_fiscal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.cabinet_clients(id) ON DELETE SET NULL,
  deadline_type text NOT NULL CHECK (deadline_type IN ('bilan', 'tva', 'social', 'fiscal', 'is', 'autre')),
  description text NOT NULL,
  deadline_date date NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'overdue')),
  responsible text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_fiscal_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_deadlines" ON public.cabinet_fiscal_deadlines
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Cabinet company creations
CREATE TABLE IF NOT EXISTS public.cabinet_company_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.cabinet_clients(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  legal_form text NOT NULL DEFAULT 'SAS' CHECK (legal_form IN ('SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'SCI', 'SELARL')),
  capital numeric(12,2),
  head_office text,
  corporate_purpose text,
  manager text,
  naf_code text,
  associates text,
  constitution_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'registered', 'abandoned')),
  checklist jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cabinet_company_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabinet_members_manage_creations" ON public.cabinet_company_creations
  FOR ALL USING (
    cabinet_id IN (SELECT cabinet_id FROM public.cabinet_members WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cabinet_invoices_cabinet ON public.cabinet_invoices(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_invoices_status ON public.cabinet_invoices(cabinet_id, status);
CREATE INDEX IF NOT EXISTS idx_cabinet_social_client_month ON public.cabinet_social_tracking(cabinet_id, client_id, year, month);
CREATE INDEX IF NOT EXISTS idx_cabinet_employees_client ON public.cabinet_employees(cabinet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_missions_client ON public.cabinet_missions(cabinet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_legal_acts_client ON public.cabinet_legal_acts(cabinet_id, client_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_deadlines_date ON public.cabinet_fiscal_deadlines(cabinet_id, deadline_date);
CREATE INDEX IF NOT EXISTS idx_cabinet_company_creations_cabinet ON public.cabinet_company_creations(cabinet_id);
