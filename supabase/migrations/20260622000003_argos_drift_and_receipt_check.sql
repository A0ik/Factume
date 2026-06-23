-- ARGOS (CIBLE 4/6) — Résorption du drift entre le repo et la base PROD.
-- Ces tables/colonnes EXISTENT en prod (créées via MCP lors de sessions précédentes :
-- Dédalos / Prométhée) mais n'avaient jamais été écrites dans supabase/migrations/.
-- Conséquence : un `supabase db push` ou une branche neuve ne reproduisait PAS la prod,
-- et certains audits croyaient (à tort) ces tables « cassées ».
-- Toutes les opérations sont idempotentes (IF NOT EXISTS) → no-op sur la prod actuelle,
-- créatrices sur un environnement neuf.

-- ── cabinet_invitations (invitations clients par lien tokenisé — mémoire Prométhée) ──
CREATE TABLE IF NOT EXISTS public.cabinet_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE CASCADE,
  invited_email text,
  role text DEFAULT 'client',
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cabinet_invitations ENABLE ROW LEVEL SECURITY;

-- ── accountant_invitations (magic-link comptable — mémoire Dédalos) ──
CREATE TABLE IF NOT EXISTS public.accountant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id uuid REFERENCES public.cabinets(id) ON DELETE CASCADE,
  email text,
  role text DEFAULT 'accountant',
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accountant_invitations ENABLE ROW LEVEL SECURITY;

-- ── reminders_config / reminders_log (relances automatiques) ──
CREATE TABLE IF NOT EXISTS public.reminders_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  reminder_1_days integer DEFAULT 3,
  reminder_2_days integer DEFAULT 7,
  reminder_3_days integer DEFAULT 15,
  email_subject text DEFAULT 'Rappel: Facture {invoice_number} en retard',
  email_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.reminders_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_level integer,
  sent_at timestamptz DEFAULT now(),
  email_to text,
  email_subject text,
  status text DEFAULT 'sent',
  error_message text,
  metadata jsonb
);
ALTER TABLE public.reminders_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders_log ENABLE ROW LEVEL SECURITY;

-- Policies owner (idempotentes) — n'ajoute que si elles n'existent pas déjà.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reminders_config' AND policyname='reminders_config_owner') THEN
    CREATE POLICY reminders_config_owner ON public.reminders_config
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reminders_log' AND policyname='reminders_log_owner_select') THEN
    CREATE POLICY reminders_log_owner_select ON public.reminders_log
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- ── Colonnes profiles créées en prod mais absentes du repo ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_card_fingerprint text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_cabinet_id uuid;
CREATE INDEX IF NOT EXISTS idx_profiles_trial_card_fingerprint
  ON public.profiles(trial_card_fingerprint) WHERE trial_card_fingerprint IS NOT NULL;

-- ── Défense en profondeur : justificatif de note de frais obligatoire ──
-- NOT VALID : ne rejoue pas les lignes existantes, mais bloque tout INSERT/UPDATE futur
-- sans justificatif (sauf frais kilométriques). Le trigger applicatif reste la 1re ligne.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='expenses_must_have_receipt' AND conrelid='public.expenses'::regclass) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_must_have_receipt
      CHECK (has_receipt = true OR receipt_url IS NOT NULL OR category = 'mileage')
      NOT VALID;
  END IF;
END $$;
