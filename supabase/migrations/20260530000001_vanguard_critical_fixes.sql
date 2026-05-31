-- ============================================================================
-- VANGUARD AUDIT FIXES — Critical Database-Level Protections
-- ============================================================================
-- BUG-01: Prevent modification of non-draft invoices (Art. L441-9 Code commerce)
-- BUG-04: Prevent deletion of sent/paid/overdue invoices
-- BUG-05: Idempotency check BEFORE counter increment
-- BUG-09: Separate counters per document type (invoices vs quotes vs credit notes)
-- BUG-10: Soft delete for legal retention (deleted_at column)
-- BUG-19: Fix broken RLS on reminders_config
-- BUG-25: NULL return safety in create_invoice_atomique
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TRIGGER: Prevent content changes on non-draft invoices
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_non_draft_invoice_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('draft') AND NEW.status = OLD.status THEN
    IF OLD.items IS DISTINCT FROM NEW.items
       OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
       OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
       OR OLD.total IS DISTINCT FROM NEW.total
       OR OLD.discount_percent IS DISTINCT FROM NEW.discount_percent
       OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
       OR OLD.client_id IS DISTINCT FROM NEW.client_id
       OR OLD.client_name_override IS DISTINCT FROM NEW.client_name_override
       OR OLD.issue_date IS DISTINCT FROM NEW.issue_date
       OR OLD.due_date IS DISTINCT FROM NEW.due_date
       OR OLD.notes IS DISTINCT FROM NEW.notes
       OR OLD.linked_invoice_id IS DISTINCT FROM NEW.linked_invoice_id THEN
      RAISE EXCEPTION 'Modification impossible : document en statut « % » (Art. L441-9 Code de commerce)', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_invoice_immutability ON public.invoices;
CREATE TRIGGER enforce_invoice_immutability
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_non_draft_invoice_update();

-- ---------------------------------------------------------------------------
-- 2. TRIGGER: Prevent deletion of sent/paid/overdue invoices
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_paid_invoice_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('sent', 'paid', 'overdue', 'accepted', 'refunded') THEN
    RAISE EXCEPTION 'Suppression impossible : document en statut « % ». Créez un avoir.', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_invoice_deletion_rule ON public.invoices;
CREATE TRIGGER enforce_invoice_deletion_rule
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_paid_invoice_deletion();

-- ---------------------------------------------------------------------------
-- 3. TRIGGER: Prevent content changes on accepted/signed quotes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_signed_quote_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.document_type = 'quote' AND OLD.status = 'accepted' AND OLD.signed_at IS NOT NULL THEN
    IF OLD.items IS DISTINCT FROM NEW.items
       OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
       OR OLD.total IS DISTINCT FROM NEW.total
       OR OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      RAISE EXCEPTION 'Modification impossible : devis signé « % »', OLD.number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_signed_quote_immutability ON public.invoices;
CREATE TRIGGER enforce_signed_quote_immutability
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_signed_quote_update();

-- ---------------------------------------------------------------------------
-- 4. Fix broken RLS on reminders_config (BUG-19)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reminders_config_owner" ON public.reminders_config;
CREATE POLICY "reminders_config_owner" ON public.reminders_config
  FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Add soft delete + separate counters + signed_snapshot (BUG-10, BUG-09, BUG-17)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_snapshot jsonb DEFAULT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_note_count integer DEFAULT 0;

-- Index for soft-deleted rows filtering
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices (deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Recreate create_invoice_atomique with all fixes
--    - BUG-05: idempotency check BEFORE counter increment
--    - BUG-09: separate counters per document type
--    - BUG-25: explicit error on failure instead of silent NULL
-- ---------------------------------------------------------------------------
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
  p_idempotency_id uuid DEFAULT NULL
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

  -- ========================================================================
  -- BUG-05 FIX: IDEMPOTENCY CHECK FIRST (before any counter increment)
  -- ========================================================================
  IF p_idempotency_id IS NOT NULL THEN
    SELECT id INTO v_new_invoice_id
    FROM public.invoices
    WHERE id = p_idempotency_id AND deleted_at IS NULL;

    IF v_new_invoice_id IS NOT NULL THEN
      RETURN v_new_invoice_id;
    END IF;
  END IF;

  -- ========================================================================
  -- Lock profile and validate subscription
  -- ========================================================================
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable';
  END IF;

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

  -- ========================================================================
  -- BUG-09 FIX: Increment separate counters per document type
  -- ========================================================================
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
      -- purchase_order, delivery_note, deposit use main counter
      UPDATE public.profiles
      SET invoice_count = invoice_count + 1
      WHERE id = p_user_id
      RETURNING invoice_count INTO v_invoice_count;
  END CASE;

  v_invoice_number := p_prefix || '-' || v_year || '-' || LPAD(v_invoice_count::text, 3, '0');

  -- ========================================================================
  -- Insert invoice
  -- ========================================================================
  INSERT INTO public.invoices (
    id, user_id, client_id, client_name_override, number, document_type,
    status, issue_date, due_date, items, subtotal, vat_amount,
    discount_percent, discount_amount, total, notes, invoice_month,
    linked_invoice_id, created_at, updated_at
  ) VALUES (
    COALESCE(p_idempotency_id, gen_random_uuid()),
    p_user_id, p_client_id, p_client_name_override, v_invoice_number,
    v_doc_type, p_status, p_issue_date, p_due_date, p_items,
    p_subtotal, p_vat_amount, p_discount_percent, p_discount_amount,
    p_total, p_notes, v_current_month, p_linked_invoice_id, NOW(), NOW()
  )
  RETURNING id INTO v_new_invoice_id;

  -- ========================================================================
  -- BUG-25 FIX: Update monthly counter + trial counter AFTER successful insert
  -- ========================================================================
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

  -- BUG-25: Explicit error instead of silent NULL return
  RAISE EXCEPTION 'Impossible de créer le document — erreur interne';
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Add constraints on invoices
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_subtotal_non_negative') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_subtotal_non_negative CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_total_valid') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT chk_invoices_total_valid CHECK (total >= -99999999 AND total <= 99999999);
  END IF;
END $$;
