-- AXIOM (CIBLE 1) — Purge de la surcharge dupliquée de create_invoice_atomique.
--
-- CONTEXTE : la migration SAGE (payment_terms atomique) a ajouté un paramètre
-- p_payment_terms à create_invoice_atomique. Or CREATE OR REPLACE ne peut PAS
-- modifier la signature d'une fonction existante en Postgres : cela crée une
-- NOUVELLE surcharge au lieu de remplacer l'ancienne. Résultat : DEUX fonctions
-- coexistent — V1 (18 params, sans p_payment_terms) et V2 (19 params, avec).
-- Tout appel RPC sans p_payment_terms (OCR, création manuelle, certains chemins
-- voix) matche les deux candidats -> erreur :
--   "Could not choose the best candidate function between:
--    public.create_invoice_atomique(...)"
--
-- FIX : on supprime V1 (signature à 18 params). V2 est un superset strict
-- (mêmes 18 params, types et défauts identiques, + p_payment_terms DEFAULT NULL),
-- donc tous les appelants existants (avec ou sans p_payment_terms) résolvent
-- vers V2 sans rupture.

-- V1 (18 params — SANS p_payment_terms) : on cible la signature EXACTE par types
-- d'arguments pour ne toucher que celle-ci. V2 (19 params) ne matche pas ce DROP.
DROP FUNCTION IF EXISTS public.create_invoice_atomique(
  uuid,    -- p_user_id
  uuid,    -- p_client_id
  text,    -- p_client_name_override
  text,    -- p_document_type
  text,    -- p_status
  date,    -- p_issue_date
  date,    -- p_due_date
  jsonb,   -- p_items
  numeric, -- p_subtotal
  numeric, -- p_vat_amount
  numeric, -- p_discount_percent
  numeric, -- p_discount_amount
  numeric, -- p_total
  text,    -- p_notes
  text,    -- p_prefix
  uuid,    -- p_linked_invoice_id
  uuid,    -- p_idempotency_id
  text     -- p_client_type
);

-- Garde-fou : on s'assure qu'il ne reste qu'UNE seule fonction create_invoice_atomique.
-- (Ne lèvera pas d'erreur si tout est correct ; sert de vérification post-fix.)
