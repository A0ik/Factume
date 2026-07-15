-- ============================================================
-- ASTRÉE (CIBLE 1) — Carve-out des champs CONTACT du verrou d'immuabilité.
-- ============================================================
-- CONTEXTE : le trigger prevent_non_draft_invoice_update_v2 → enforce_invoice_immutability_v2()
-- verrouillait client_email, client_name_override ET client_id sur toute facture non-draft.
-- Le carve-out applicatif /api/invoices/[id]/recipient (relance sur facture "sent" sans client)
-- écrit précisément ces 3 champs via le service role — qui contourne la RLS mais PAS les triggers.
-- Résultat : l'UPDATE levait une exception → HTTP 500 → "Impossible d'enregistrer le destinataire".
--
-- FIX : retirer ces 3 champs de la liste verrouillée. Ce sont des champs de LIVRAISON/OPÉRATIONNELS
-- (email du destinataire, nom affiché, lien client), pas du contenu fiscal ni l'identité légale
-- (adresse/SIRET/TVA du tiers, qui restent verrouillés). Conformité Art. L.441-9 intacte :
-- montants, items, TVA, dates, numéro, document_type, pdf_url, identité tiers = toujours immuables.
--
-- Note : le trigger existant pointe vers cette fonction ; CREATE OR REPLACE met à jour le corps
-- utilisé par le trigger sans devoir le recréer. Idempotent.
-- ============================================================

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
       OR COALESCE(OLD.issue_date::text, '') IS DISTINCT FROM COALESCE(NEW.issue_date::text, '')
       OR COALESCE(OLD.due_date::text, '') IS DISTINCT FROM COALESCE(NEW.due_date::text, '')
       OR COALESCE(OLD.notes, '') IS DISTINCT FROM COALESCE(NEW.notes, '')
       OR COALESCE(OLD.number, '') IS DISTINCT FROM COALESCE(NEW.number, '')
       OR COALESCE(OLD.document_type, '') IS DISTINCT FROM COALESCE(NEW.document_type, '')
       OR COALESCE(OLD.linked_invoice_id::text, '') IS DISTINCT FROM COALESCE(NEW.linked_invoice_id::text, '')
       OR COALESCE(OLD.pdf_url, '') IS DISTINCT FROM COALESCE(NEW.pdf_url, '')
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

-- ============================================================
-- 2ᵉ COUCHE : la fonction vanguard prevent_non_draft_invoice_update()
-- (trigger enforce_invoice_immutability) verrouillait AUSSI client_id et client_name_override.
-- Or les triggers BEFORE UPDATE s'exécutent par ordre alphabétique : vanguard tire AVANT v2.
-- Sans ce carve-out, vanguard aurait continué à bloquer le carve-out relance (client_name_override).
-- On retire donc client_id + client_name_override de vanguard également (client_email n'y figure pas).
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_non_draft_invoice_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status NOT IN ('draft') AND NEW.status = OLD.status THEN
    IF OLD.items IS DISTINCT FROM NEW.items
       OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
       OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
       OR OLD.total IS DISTINCT FROM NEW.total
       OR OLD.discount_percent IS DISTINCT FROM NEW.discount_percent
       OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
       OR OLD.issue_date IS DISTINCT FROM NEW.issue_date
       OR OLD.due_date IS DISTINCT FROM NEW.due_date
       OR OLD.notes IS DISTINCT FROM NEW.notes
       OR OLD.linked_invoice_id IS DISTINCT FROM NEW.linked_invoice_id THEN
      RAISE EXCEPTION 'Modification impossible : document en statut « % » (Art. L441-9 Code de commerce)', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
