-- ============================================================
-- GUARDIAN-PDP : Migration de conformité 2026
-- Fixes: GAP-1, GAP-2, GAP-3, GAP-4, GAP-5, GAP-6,
--        BUG-TRANS-01/02/03/04, BUG-NUM-01, BUG-AVOIR-01/02,
--        BUG-NUM-02, BUG-EDGE-02/03, constraint étendue
-- ============================================================

-- 0. Étendre la contrainte CHECK des statuts (support cancelled, refunded, partial, etc.)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY[
    'draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled',
    'accepted', 'refused', 'refunded', 'partial', 'delivered', 'expired', 'rejected'
  ]));

-- 1. TABLE invoice_audit_trail (PAF - Piste d'Audit Fiable)
CREATE TABLE IF NOT EXISTS invoice_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_invoice ON invoice_audit_trail(invoice_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON invoice_audit_trail(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON invoice_audit_trail(action);

ALTER TABLE invoice_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_trail_insert_only" ON invoice_audit_trail FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_trail_read_own" ON invoice_audit_trail FOR SELECT USING (user_id = auth.uid());

-- 2. Immuabilité renforcée (uniquement les colonnes qui existent vraiment)
CREATE OR REPLACE FUNCTION enforce_invoice_immutability_v2()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('draft', 'pending') AND NEW.status = OLD.status THEN
    IF COALESCE(OLD.items::text, '') IS DISTINCT FROM COALESCE(NEW.items::text, '')
       OR COALESCE(OLD.subtotal, 0) != COALESCE(NEW.subtotal, 0)
       OR COALESCE(OLD.vat_amount, 0) != COALESCE(NEW.vat_amount, 0)
       OR COALESCE(OLD.total, 0) != COALESCE(NEW.total, 0)
       OR COALESCE(OLD.discount_amount, 0) != COALESCE(NEW.discount_amount, 0)
       OR COALESCE(OLD.discount_percent, 0) != COALESCE(NEW.discount_percent, 0)
       OR COALESCE(OLD.client_id::text, '') IS DISTINCT FROM COALESCE(NEW.client_id::text, '')
       OR COALESCE(OLD.client_name_override, '') IS DISTINCT FROM COALESCE(NEW.client_name_override, '')
       OR COALESCE(OLD.issue_date::text, '') IS DISTINCT FROM COALESCE(NEW.issue_date::text, '')
       OR COALESCE(OLD.due_date::text, '') IS DISTINCT FROM COALESCE(NEW.due_date::text, '')
       OR COALESCE(OLD.notes, '') IS DISTINCT FROM COALESCE(NEW.notes, '')
       OR COALESCE(OLD.number, '') IS DISTINCT FROM COALESCE(NEW.number, '')
       OR COALESCE(OLD.document_type, '') IS DISTINCT FROM COALESCE(NEW.document_type, '')
       OR COALESCE(OLD.linked_invoice_id::text, '') IS DISTINCT FROM COALESCE(NEW.linked_invoice_id::text, '')
       OR COALESCE(OLD.pdf_url, '') IS DISTINCT FROM COALESCE(NEW.pdf_url, '')
       OR COALESCE(OLD.client_email, '') IS DISTINCT FROM COALESCE(NEW.client_email, '')
       OR COALESCE(OLD.client_address, '') IS DISTINCT FROM COALESCE(NEW.client_address, '')
       OR COALESCE(OLD.client_city, '') IS DISTINCT FROM COALESCE(NEW.client_city, '')
       OR COALESCE(OLD.client_postal_code, '') IS DISTINCT FROM COALESCE(NEW.client_postal_code, '')
       OR COALESCE(OLD.client_siret, '') IS DISTINCT FROM COALESCE(NEW.client_siret, '')
       OR COALESCE(OLD.client_vat_number, '') IS DISTINCT FROM COALESCE(NEW.client_vat_number, '')
    THEN
      RAISE EXCEPTION 'Facture non modifiable : statut "%". Art. L.441-9 Code de commerce.', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_non_draft_invoice_update ON invoices;
CREATE TRIGGER prevent_non_draft_invoice_update_v2
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION enforce_invoice_immutability_v2();

-- 3. RPC atomique pour transitions de statut (SELECT FOR UPDATE)
CREATE OR REPLACE FUNCTION transition_invoice_status(
  p_invoice_id UUID, p_user_id UUID, p_new_status TEXT,
  p_ip_address TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(from_status TEXT, to_status TEXT) AS $$
DECLARE
  v_invoice RECORD; v_allowed TEXT[]; v_current TEXT;
  v_original_total NUMERIC; v_existing_credit_total NUMERIC;
BEGIN
  SELECT user_id, status, document_type, linked_invoice_id, total INTO v_invoice
  FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
  IF v_invoice.user_id != p_user_id THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  v_current := v_invoice.status;
  v_allowed := CASE v_current
    WHEN 'draft'     THEN ARRAY['sent', 'cancelled', 'pending']
    WHEN 'pending'   THEN ARRAY['sent', 'cancelled', 'expired']
    WHEN 'sent'      THEN ARRAY['paid', 'cancelled', 'overdue', 'refused']
    WHEN 'overdue'   THEN ARRAY['paid', 'cancelled']
    WHEN 'paid'      THEN ARRAY['refunded', 'partial']
    WHEN 'partial'   THEN ARRAY['paid', 'refunded']
    WHEN 'refused'   THEN ARRAY['cancelled']
    WHEN 'delivered' THEN ARRAY['paid', 'cancelled']
    WHEN 'expired'   THEN ARRAY['draft']
    ELSE ARRAY[]::TEXT[]
  END;
  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Transition de statut invalide : "%" → "%"', v_current, p_new_status;
  END IF;

  -- Validation avoirs au moment de l'émission (pas en brouillon)
  IF v_invoice.document_type = 'credit_note' AND p_new_status NOT IN ('draft', 'cancelled') THEN
    IF v_invoice.linked_invoice_id IS NULL THEN
      RAISE EXCEPTION 'Un avoir doit être lié à une facture originale avant émission.';
    END IF;
    SELECT total INTO v_original_total FROM invoices WHERE id = v_invoice.linked_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Facture originale introuvable.'; END IF;
    SELECT COALESCE(SUM(ABS(total)), 0) INTO v_existing_credit_total
    FROM invoices WHERE linked_invoice_id = v_invoice.linked_invoice_id
      AND document_type = 'credit_note' AND status != 'cancelled' AND id != p_invoice_id;
    IF ABS(v_invoice.total) + v_existing_credit_total > ABS(v_original_total) + 0.01 THEN
      RAISE EXCEPTION 'Le montant total des avoirs dépasse la facture originale.';
    END IF;
  END IF;

  UPDATE invoices SET status = p_new_status, updated_at = NOW(),
    sent_at = CASE WHEN p_new_status = 'sent' THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
    paid_at = CASE WHEN p_new_status = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
  WHERE id = p_invoice_id;

  INSERT INTO invoice_audit_trail (invoice_id, user_id, action, from_status, to_status, ip_address, user_agent)
  VALUES (p_invoice_id, p_user_id, 'status_change:' || v_current || '->' || p_new_status, v_current, p_new_status, p_ip_address, p_user_agent);

  RETURN QUERY SELECT v_current, p_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Numérotation annuelle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invoice_year INT DEFAULT EXTRACT(YEAR FROM NOW());

-- 5. Validation issue_date (seulement quand la facture est émise, pas en brouillon)
CREATE OR REPLACE FUNCTION validate_invoice_issue_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'pending') AND NEW.issue_date IS NOT NULL THEN
    IF NEW.issue_date < (CURRENT_DATE - INTERVAL '1 day')::date THEN
      RAISE EXCEPTION 'Date d''émission invalide : antidatage détecté.';
    END IF;
    IF NEW.issue_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Date d''émission invalide : post-datage détecté.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_issue_date ON invoices;
CREATE TRIGGER validate_issue_date_trigger
  BEFORE INSERT OR UPDATE OF issue_date ON invoices
  FOR EACH ROW EXECUTE FUNCTION validate_invoice_issue_date();

-- 6. Validation avoirs (seulement à l'émission, pas en brouillon)
CREATE OR REPLACE FUNCTION validate_credit_note()
RETURNS TRIGGER AS $$
DECLARE v_original_total NUMERIC; v_existing_credit_total NUMERIC;
BEGIN
  IF NEW.document_type = 'credit_note' AND NEW.status NOT IN ('draft', 'pending') THEN
    IF NEW.linked_invoice_id IS NULL THEN
      RAISE EXCEPTION 'Un avoir doit être lié à une facture originale avant émission.';
    END IF;
    SELECT total INTO v_original_total FROM invoices WHERE id = NEW.linked_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Facture originale introuvable.'; END IF;
    SELECT COALESCE(SUM(ABS(total)), 0) INTO v_existing_credit_total
    FROM invoices WHERE linked_invoice_id = NEW.linked_invoice_id
      AND document_type = 'credit_note' AND status != 'cancelled' AND id != NEW.id;
    IF ABS(NEW.total) + v_existing_credit_total > ABS(v_original_total) + 0.01 THEN
      RAISE EXCEPTION 'Le montant total des avoirs dépasse la facture originale.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_credit_note_trigger ON invoices;
CREATE TRIGGER validate_credit_note_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION validate_credit_note();

-- 7. Log automatique des créations
CREATE OR REPLACE FUNCTION log_invoice_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO invoice_audit_trail (invoice_id, user_id, action, from_status, to_status, metadata)
  VALUES (NEW.id, NEW.user_id, 'created', NULL, NEW.status,
    jsonb_build_object('document_type', NEW.document_type, 'total', NEW.total, 'number', NEW.number));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_invoice_creation_trigger ON invoices;
CREATE TRIGGER log_invoice_creation_trigger
  AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION log_invoice_creation();

-- 8. Nettoyer les doublons de fonctions
DROP FUNCTION IF EXISTS public.create_invoice_atomique(
  p_user_id uuid, p_client_id uuid, p_client_name_override text,
  p_prefix text, p_document_type text, p_status text, p_issue_date date, p_due_date date,
  p_items jsonb, p_subtotal numeric, p_vat_amount numeric,
  p_discount_percent numeric, p_discount_amount numeric, p_total numeric,
  p_notes text, p_linked_invoice_id uuid, p_idempotency_id uuid
);

COMMENT ON TABLE invoice_audit_trail IS 'Piste d''Audit Fiable (PAF) — Art. 289 VII CGI. INSERT-ONLY, conservation 10 ans minimum.';
