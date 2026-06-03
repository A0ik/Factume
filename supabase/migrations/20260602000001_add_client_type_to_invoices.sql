-- Migration: Add client_type column to invoices table
-- This enables B2B/B2C classification for proper Super PDP routing
-- B2B invoices trigger electronic invoicing, B2C invoices skip PDP

-- 1. Add client_type column to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS client_type text
CHECK (client_type IS NULL OR client_type IN ('b2b', 'b2c'));

-- 2. Update the create_invoice_atomique function to accept and store client_type
CREATE OR REPLACE FUNCTION public.create_invoice_atomique(
  p_user_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_client_name_override text DEFAULT NULL,
  p_document_type text DEFAULT 'invoice',
  p_status text DEFAULT 'draft',
  p_issue_date date DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_items jsonb DEFAULT '[]',
  p_subtotal numeric DEFAULT 0,
  p_vat_amount numeric DEFAULT 0,
  p_discount_percent numeric DEFAULT NULL,
  p_discount_amount numeric DEFAULT NULL,
  p_total numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_prefix text DEFAULT 'FACT',
  p_linked_invoice_id uuid DEFAULT NULL,
  p_idempotency_id uuid DEFAULT NULL,
  p_client_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_month text := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_invoice_count int;
  v_invoice_number text;
  v_new_invoice_id uuid;
  v_profile RECORD;
  v_is_free boolean;
  v_doc_type text;
  v_year int;
BEGIN
  -- Auth check
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  -- Idempotency check first (before counter increment)
  IF p_idempotency_id IS NOT NULL THEN
    SELECT id INTO v_new_invoice_id
    FROM public.invoices
    WHERE id = p_idempotency_id AND deleted_at IS NULL;

    IF v_new_invoice_id IS NOT NULL THEN
      RETURN v_new_invoice_id;
    END IF;
  END IF;

  -- Lock profile and validate subscription
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable';
  END IF;

  -- Check subscription limits
  v_is_free := (
    v_profile.subscription_tier IS NULL
    OR v_profile.subscription_tier = 'free'
  ) AND (
    v_profile.is_trial_active IS NULL
    OR v_profile.is_trial_active = false
  );

  IF v_is_free THEN
    IF v_profile.invoice_month = v_current_month THEN
      IF v_profile.monthly_invoice_count >= 5 THEN
        RAISE EXCEPTION 'Limite de 5 factures mensuelles atteinte';
      END IF;
    END IF;
  END IF;

  IF v_profile.is_trial_active = true THEN
    IF COALESCE(v_profile.trial_document_count, 0) >= 3 THEN
      RAISE EXCEPTION 'Limite de 3 documents atteinte pendant l''essai gratuit';
    END IF;
  END IF;

  -- Increment separate counters per document type
  v_doc_type := COALESCE(p_document_type, 'invoice');
  v_year := EXTRACT(year FROM CURRENT_DATE);

  CASE v_doc_type
    WHEN 'invoice' THEN
      UPDATE public.profiles
      SET invoice_count = invoice_count + 1
      WHERE id = p_user_id
      RETURNING invoice_count INTO v_invoice_count;
    WHEN 'quote' THEN
      UPDATE public.profiles
      SET quote_count = COALESCE(quote_count, 0) + 1
      WHERE id = p_user_id
      RETURNING COALESCE(quote_count, 0) INTO v_invoice_count;
    WHEN 'credit_note' THEN
      UPDATE public.profiles
      SET credit_note_count = COALESCE(credit_note_count, 0) + 1
      WHERE id = p_user_id
      RETURNING COALESCE(credit_note_count, 0) INTO v_invoice_count;
    ELSE
      UPDATE public.profiles
      SET invoice_count = invoice_count + 1
      WHERE id = p_user_id
      RETURNING invoice_count INTO v_invoice_count;
  END CASE;

  v_invoice_number := p_prefix || '-' || v_year || '-' || LPAD(v_invoice_count::text, 3, '0');

  -- Insert invoice with client_type
  INSERT INTO public.invoices (
    id, user_id, client_id, client_name_override, number, document_type,
    status, issue_date, due_date, items, subtotal, vat_amount,
    discount_percent, discount_amount, total, notes, invoice_month,
    linked_invoice_id, client_type, created_at, updated_at
  ) VALUES (
    COALESCE(p_idempotency_id, gen_random_uuid()),
    p_user_id, p_client_id, p_client_name_override, v_invoice_number,
    v_doc_type, p_status, p_issue_date, p_due_date, p_items,
    p_subtotal, p_vat_amount, p_discount_percent, p_discount_amount,
    p_total, p_notes, v_current_month, p_linked_invoice_id,
    p_client_type, NOW(), NOW()
  )
  RETURNING id INTO v_new_invoice_id;

  -- Update monthly counter + trial counter after successful insert
  IF v_new_invoice_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      monthly_invoice_count = CASE
        WHEN invoice_month = v_current_month THEN monthly_invoice_count + 1
        ELSE 1
      END,
      invoice_month = v_current_month,
      trial_document_count = CASE
        WHEN is_trial_active = true THEN COALESCE(trial_document_count, 0) + 1
        ELSE trial_document_count
      END
    WHERE id = p_user_id;

    RETURN v_new_invoice_id;
  END IF;

  RAISE EXCEPTION 'Impossible de créer le document — erreur interne';
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_invoice_atomique TO authenticated;

-- 4. Create index for client_type queries
CREATE INDEX IF NOT EXISTS idx_invoices_client_type ON public.invoices (client_type)
WHERE client_type IS NOT NULL;
