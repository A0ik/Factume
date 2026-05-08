-- ────────────────────────────────────────────────────────────────────────────────
-- Migration: Fix Critical Legal Issue - Unique Invoice Numbers
-- ────────────────────────────────────────────────────────────────────────────────
-- PROBLÈME CRITIQUE LÉGAL :
-- Il n'y a AUCUNE contrainte unique sur les numéros de facture.
-- Cela permet de créer deux factures avec le même numéro, ce qui est ILLÉGAL
-- en France (article L441-9 du Code de commerce) et risque des sanctions lourdes.
--
-- CAUSE RACINE :
-- - createInvoice() et duplicateInvoice() utilisent increment_invoice_count RPC
-- - MAIS l'insertion finale n'a PAS de contrainte unique
-- - En cas de race condition (2 requêtes simultanées), le RPC peut retourner
--   le même numéro pour les deux factures
--
-- SOLUTION :
-- 1. Ajouter une contrainte unique sur (user_id, number)
-- 2. Créer une fonction améliorée qui génère ET insère de manière atomique
-- 3. Ajouter une colonne invoice_month pour faciliter les requêtes
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Ajouter une colonne invoice_month si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_month'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN invoice_month text;
  END IF;
END $$;

-- 2. Mettre à jour les factures existantes qui n'ont pas invoice_month
UPDATE public.invoices
SET invoice_month = TO_CHAR(created_at, 'YYYY-MM')
WHERE invoice_month IS NULL;

-- 3. Nettoyer les doublons existants (garder la plus ancienne)
WITH ranked_invoices AS (
  SELECT
    id,
    user_id,
    number,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id, number ORDER BY created_at ASC) as rn
  FROM public.invoices
)
DELETE FROM public.invoices
WHERE id IN (
  SELECT id FROM ranked_invoices WHERE rn > 1
);

-- 4. Créer un index unique partiel pour les factures (pas pour les brouillons)
DROP INDEX IF EXISTS idx_invoices_unique_number;
CREATE UNIQUE INDEX idx_invoices_unique_number
ON public.invoices(user_id, number)
WHERE status != 'draft';

-- Note: On permet les doublons en status='draft' car l'utilisateur peut
-- créer plusieurs brouillons avant de finaliser. Dès que status != 'draft',
-- l'unicité est stricte.

-- 5. Créer une fonction améliorée qui génère ET insère de manière atomique
-- Cela élimine TOUTE race condition possible
DROP FUNCTION IF EXISTS public.create_invoice_atomic;

CREATE OR REPLACE FUNCTION public.create_invoice_atomique(
  p_user_id uuid,
  p_client_id uuid,
  p_client_name_override text,
  p_document_type text,
  p_status text,
  p_issue_date date,
  p_due_date date,
  p_items jsonb,
  p_subtotal numeric,
  p_vat_amount numeric,
  p_discount_percent numeric,
  p_discount_amount numeric,
  p_total numeric,
  p_notes text,
  p_prefix text DEFAULT 'FACT',
  p_linked_invoice_id uuid DEFAULT NULL,
  p_idempotency_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month text := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_invoice_count int;
  v_invoice_number text;
  v_new_invoice_id uuid;
  v_profile RECORD;
  v_is_free boolean;
BEGIN
  -- Sécurité: Vérifier que p_user_id = auth.uid()
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- Verrouiller le profil pour éviter les race conditions
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- CRITIQUE: Verrouille la ligne jusqu'à la fin de la transaction

  -- Vérifier existence du profil
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable';
  END IF;

  -- Déterminer si l'utilisateur est sur le plan gratuit
  v_is_free := (
    v_profile.subscription_tier IS NULL
    OR v_profile.subscription_tier = 'free'
  ) AND (
    v_profile.is_trial_active IS NULL
    OR v_profile.is_trial_active = false
  );

  -- Vérifier la limite mensuelle pour les utilisateurs gratuits
  IF v_is_free THEN
    IF v_profile.invoice_month = v_current_month THEN
      IF v_profile.monthly_invoice_count >= 5 THEN
        RAISE EXCEPTION 'Limite de 5 factures mensuelles atteinte';
      END IF;
    END IF;
  END IF;

  -- Incrémenter les compteurs de manière atomique (déjà verrouillé)
  UPDATE public.profiles
  SET
    monthly_invoice_count = CASE
      WHEN invoice_month = v_current_month THEN monthly_invoice_count + 1
      ELSE 1
    END,
    invoice_month = v_current_month,
    invoice_count = invoice_count + 1
  WHERE id = p_user_id
  RETURNING monthly_invoice_count INTO v_invoice_count;

  -- Générer le numéro de facture
  v_invoice_number := p_prefix || '-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(v_invoice_count::text, 3, '0');

  -- Si idempotencyId est fourni, vérifier si la facture existe déjà
  IF p_idempotency_id IS NOT NULL THEN
    SELECT id INTO v_new_invoice_id
    FROM public.invoices
    WHERE id = p_idempotency_id;
    IF v_new_invoice_id IS NOT NULL THEN
      RETURN v_new_invoice_id;  -- Idempotent: retourner la facture existante
    END IF;
  END;

  -- Insérer la facture avec le numéro généré
  INSERT INTO public.invoices (
    id,
    user_id,
    client_id,
    client_name_override,
    number,
    document_type,
    status,
    issue_date,
    due_date,
    items,
    subtotal,
    vat_amount,
    discount_percent,
    discount_amount,
    total,
    notes,
    invoice_month,
    linked_invoice_id,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_idempotency_id, gen_random_uuid()),
    p_user_id,
    p_client_id,
    p_client_name_override,
    v_invoice_number,
    p_document_type,
    p_status,
    p_issue_date,
    p_due_date,
    p_items,
    p_subtotal,
    p_vat_amount,
    p_discount_percent,
    p_discount_amount,
    p_total,
    p_notes,
    v_current_month,
    p_linked_invoice_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, number) WHERE status != 'draft' DO NOTHING
  RETURNING id INTO v_new_invoice_id;

  -- Si l'insertion a échoué à cause d'un conflit (rare avec le verrou)
  IF v_new_invoice_id IS NULL THEN
    -- Réessayer avec un numéro incrémenté
    v_invoice_count := v_invoice_count + 1;
    v_invoice_number := p_prefix || '-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(v_invoice_count::text, 3, '0');

    INSERT INTO public.invoices (
      id,
      user_id,
      client_id,
      client_name_override,
      number,
      document_type,
      status,
      issue_date,
      due_date,
      items,
      subtotal,
      vat_amount,
      discount_percent,
      discount_amount,
      total,
      notes,
      invoice_month,
      linked_invoice_id,
      created_at,
      updated_at
    ) VALUES (
      p_idempotency_id,
      p_user_id,
      p_client_id,
      p_client_name_override,
      v_invoice_number,
      p_document_type,
      p_status,
      p_issue_date,
      p_due_date,
      p_items,
      p_subtotal,
      p_vat_amount,
      p_discount_percent,
      p_discount_amount,
      p_total,
      p_notes,
      v_current_month,
      p_linked_invoice_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_new_invoice_id;
  END IF;

  RETURN v_new_invoice_id;
END;
$$;

-- 6. Accorder les permissions
GRANT EXECUTE ON FUNCTION public.create_invoice_atomique(
  uuid, uuid, text, text, text, date, date, jsonb, numeric, numeric,
  numeric, numeric, numeric, text, text, uuid
) TO authenticated;

-- 7. Ajouter un commentaire sur la table
COMMENT ON CONSTRAINT idx_invoices_unique_number ON public.invoices IS
  'Garantit l''unicité des numéros de facture par utilisateur (sauf brouillons). Obligation légale en France (L441-9 du Code de commerce).';

-- 8. Créer un trigger pour mettre à jour invoice_month automatiquement
DROP TRIGGER IF EXISTS update_invoice_month ON public.invoices;
DROP FUNCTION IF EXISTS public.update_invoice_month_trigger();

CREATE OR REPLACE FUNCTION public.update_invoice_month_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.issue_date IS NOT NULL THEN
    NEW.invoice_month := TO_CHAR(NEW.issue_date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_month
  BEFORE INSERT OR UPDATE OF issue_date ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_month_trigger();

-- 9. Index pour les performances sur invoice_month
CREATE INDEX IF NOT EXISTS idx_invoices_month ON public.invoices(user_id, invoice_month)
WHERE status != 'draft';
