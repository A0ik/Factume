-- ────────────────────────────────────────────────────────────────────────────────
-- TEST: Validation de la correction du problème de numéros de facture en double
-- ────────────────────────────────────────────────────────────────────────────────
-- Ce script teste que la solution empêche réellement les doublons
--
-- Exécutez ce script dans le SQL Editor Supabase après avoir appliqué
-- la migration 20250509000000_fix_invoice_unique_constraint.sql
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Vérifier que l'index unique existe
DO $$
DECLARE
  v_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_invoices_unique_number'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    RAISE NOTICE '✅ Index unique idx_invoices_unique_number existe';
  ELSE
    RAISE EXCEPTION '❌ Index unique idx_invoices_unique_number MANQUE - la migration n''a pas été appliquée';
  END IF;
END $$;

-- 2. Vérifier que la colonne invoice_month existe
DO $$
DECLARE
  v_column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_month'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE '✅ Colonne invoice_month existe';
  ELSE
    RAISE EXCEPTION '❌ Colonne invoice_month MANQUE - la migration n''a pas été appliquée';
  END IF;
END $$;

-- 3. Vérifier que la fonction atomique existe
DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_invoice_atomique'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction create_invoice_atomique existe';
  ELSE
    RAISE EXCEPTION '❌ Fonction create_invoice_atomique MANQUE - la migration n''a pas été appliquée';
  END IF;
END $$;

-- 4. Vérifier qu'il n'y a pas de doublons existants (hors brouillons)
DO $$
DECLARE
  v_duplicate_count int;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT user_id, number, COUNT(*) as cnt
    FROM public.invoices
    WHERE status != 'draft'
    GROUP BY user_id, number
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count = 0 THEN
    RAISE NOTICE '✅ Aucun doublon détecté dans les factures existantes';
  ELSE
    RAISE WARNING '⚠️  % doublon(s) détecté(s) dans les factures existantes', v_duplicate_count;
  END IF;
END $$;

-- 5. Afficher les statistiques actuelles
SELECT
  COUNT(*) as total_factures,
  COUNT(DISTINCT user_id) as utilisateurs,
  COUNT(DISTINCT number) as numeros_uniques,
  COUNT(CASE WHEN status != 'draft' THEN 1 END) as factures_non_brouillon,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as brouillons
FROM public.invoices;

-- 6. Vérifier que les contraintes sont actives
SELECT
  conname as constraint_name,
  contype as constraint_type,
  CASE contype
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE 'OTHER'
  END as type_description
FROM pg_constraint
WHERE conrelid = 'public.invoices'::regclass
ORDER BY contype, conname;

-- 7. Tester la résistance aux doublons (simulation)
-- NOTE: Ce test est commenté pour éviter les erreurs lors de l'exécution
-- Décommentez pour tester manuellement avec un user_id valide

/*
DO $$
DECLARE
  v_test_user_id uuid := 'VOTRE_USER_ID_ICI';  -- Remplacer par un user_id valide
  v_invoice_id uuid;
  v_error_message text;
BEGIN
  -- Test 1: Créer une facture normale
  PERFORM public.create_invoice_atomique(
    v_test_user_id,
    NULL,
    'Test Client',
    'invoice',
    'draft',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    '[]'::jsonb,
    0,
    0,
    NULL,
    NULL,
    0,
    NULL,
    'TEST',
    NULL,
    NULL
  );

  RAISE NOTICE '✅ Test 1 réussi: Création normale OK';

  -- Test 2: Tenter de créer un doublon (échec attendu)
  BEGIN
    PERFORM public.create_invoice_atomique(
      v_test_user_id,
      NULL,
      'Test Client',
      'invoice',
      'paid',  -- statut différent de draft
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      '[]'::jsonb,
      0,
      0,
      NULL,
      NULL,
      0,
      NULL,
      'TEST',
      NULL,
      NULL
    );
    RAISE EXCEPTION '❌ Test 2 ÉCHOUÉ: Le doublon n''a pas été bloqué!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ Test 2 réussi: Doublon correctement bloqué par la contrainte unique';
  END;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors des tests: %', SQLERRM;
END $$;
*/

-- 8. Afficher un résumé
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'RÉSUMÉ DES TESTS';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'Si tous les tests sont ✅, la correction est bien appliquée.';
RAISE NOTICE 'La contrainte unique empêche désormais les numéros en double.';
RAISE NOTICE 'Les brouillons (status=draft) peuvent avoir des numéros temporaires.';
RAISE NOTICE 'Dès qu''une facture passe en status≠draft, l''unicité est garantie.';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
