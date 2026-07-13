-- ============================================================
-- 20260712000001_athena_restore_create_invoice_atomique_v2.sql
-- ATHÉNA (CIBLE 1, BUG #1) — Restauration de la fonction RPC manquante.
--
-- CONTEXTE : la migration AXIOM (20260621000001_drop_duplicate_create_invoice_atomique.sql)
-- supprime la signature V1 (18 params, SANS p_payment_terms) en supposant qu'une
-- migration SAGE avait créé la V2 (19 params, AVEC p_payment_terms). Or AUCUNE
-- migration du dépôt ne crée cette V2 — preuve : grep "p_payment_terms" sur
-- supabase/migrations ne retourne QUE la migration DROP. La V2 n'existait que
-- via un patch manuel non versionné sur la base de prod.
--
-- CONSÉQUENCE (prouvée) : sur tout environnement neuf (staging, Vercel preview,
-- reprise après sinistre), la séquence est :
--   20260620000003 crée V1 (18 params)
--   20260621000001 DROP V1 (18 params)
--   → il ne reste AUCUNE fonction create_invoice_atomique
--   → l'appel RPC en app/api/invoices/create/route.ts:215 (passe p_payment_terms)
--     échoue : "function not found" / "Could not choose best candidate".
--
-- FIX : on recrée ici la fonction avec la signature V2 complète (19 params,
-- p_payment_terms DEFAULT NULL) ET on rend la persistance du terme RÉELLEMENT
-- atomique (INSERT dans la colonne invoices.payment_terms). C'est un superset
-- strict de V1 : tous les appelants (avec ou sans p_payment_terms) résolvent
-- vers cette unique fonction sans surcharge ni ambiguïté.
--
-- SÉCURITÉ : CREATE OR REPLACE est idempotent. Sur prod (si un patch manuel
-- 19-params existe), il standardise le corps. Sur un env neuf, il crée la
-- fonction. Aucun risque de double surcharge puisque la signature est unique.
-- ============================================================

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
  p_client_type text DEFAULT NULL,
  p_payment_terms text DEFAULT NULL
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

  -- Check subscription limits (FREE TIER: 3 invoices/month)
  v_is_free := (
    v_profile.subscription_tier IS NULL
    OR v_profile.subscription_tier = 'free'
  ) AND (
    v_profile.is_trial_active IS NULL
    OR v_profile.is_trial_active = false
  );

  IF v_is_free THEN
    IF v_profile.invoice_month = v_current_month THEN
      IF v_profile.monthly_invoice_count >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 factures mensuelles atteinte. Passez à un plan supérieur pour des factures illimitées.';
      END IF;
    END IF;
  END IF;

  -- TRIAL TIER : 15 documents sur la durée de l'essai (unifié).
  IF v_profile.is_trial_active = true THEN
    IF COALESCE(v_profile.trial_document_count, 0) >= 15 THEN
      RAISE EXCEPTION 'Limite de 15 documents atteinte pendant l''essai gratuit';
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

  -- Insert invoice with client_type + payment_terms (persistance atomique SAGE)
  INSERT INTO public.invoices (
    id, user_id, client_id, client_name_override, number, document_type,
    status, issue_date, due_date, items, subtotal, vat_amount,
    discount_percent, discount_amount, total, notes, invoice_month,
    linked_invoice_id, client_type, payment_terms, created_at, updated_at
  ) VALUES (
    COALESCE(p_idempotency_id, gen_random_uuid()),
    p_user_id, p_client_id, p_client_name_override, v_invoice_number,
    v_doc_type, p_status, p_issue_date, p_due_date, p_items,
    p_subtotal, p_vat_amount, p_discount_percent, p_discount_amount,
    p_total, p_notes, v_current_month, p_linked_invoice_id,
    p_client_type, p_payment_terms, NOW(), NOW()
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

-- Garde-fou post-fix : une seule signature doit exister. Si une V1 fantôme
-- réapparaît (ex: restore de sauvegarde), on la supprime pour éviter toute
-- ambiguïté de résolution (l'appel nommé du routeur tombe toujours sur V2).
-- Signature exacte de V1 (18 params, 2e arg = uuid p_client_id) :
DROP FUNCTION IF EXISTS public.create_invoice_atomique(
  uuid, uuid, text, text, text, date, date, jsonb,
  numeric, numeric, numeric, numeric, numeric, text, text, uuid, uuid, text
);

REVOKE EXECUTE ON FUNCTION public.create_invoice_atomique(uuid, uuid, text, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, numeric, text, text, uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomique(uuid, uuid, text, text, text, text, date, date, jsonb, numeric, numeric, numeric, numeric, numeric, text, text, uuid, uuid, text, text) TO authenticated;
