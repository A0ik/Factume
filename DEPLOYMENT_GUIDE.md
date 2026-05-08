# Guide de Déploiement : Correction Numéros Facture

## 🎯 Objectif

Déployer la correction du problème critique de numéros de facture en double.

## ⏱️ Durée Estimée

10-15 minutes

## 📋 Prérequis

- Accès au Dashboard Supabase
- Droits d'exécution SQL
- Accès au déploiement de l'application

## 🚀 Étape 1 : Appliquer la Migration (5 min)

1. **Aller sur le Dashboard Supabase**
   - Ouvrir https://app.supabase.com
   - Sélectionner votre projet

2. **Ouvrir le SQL Editor**
   - Menu de gauche → SQL Editor
   - Nouvelle requête

3. **Copier-Coller le contenu de la migration**
   ```bash
   # Ouvrir ce fichier
   c:\Users\salma\Desktop\FACTU.ME\supabase\migrations\20250509000000_fix_invoice_unique_constraint.sql
   ```
   - Copier tout le contenu
   - Coller dans le SQL Editor

4. **Exécuter**
   - Cliquer sur "Run" (ou Ctrl+Entrée)
   - Attendre la confirmation "Success"

5. **Vérifier le résultat**
   ```
   Vous devriez voir :
   - ✓ Index unique créé
   - ✓ Colonne invoice_month ajoutée
   - ✓ Fonction create_invoice_atomique créée
   - ✓ Trigger update_invoice_month créé
   ```

## ✅ Étape 2 : Valider la Migration (3 min)

1. **Exécuter le script de test**
   - Nouvelle requête dans le SQL Editor
   - Copier le contenu de `test_invoice_uniqueness.sql`
   - Exécuter

2. **Vérifier les résultats**
   ```
   ✅ Index unique idx_invoices_unique_number existe
   ✅ Colonne invoice_month existe
   ✅ Fonction create_invoice_atomique existe
   ✅ Aucun doublon détecté
   ```

3. **Si erreur**
   - Vérifier les logs dans le SQL Editor
   - Consulter la section "Dépannage" ci-dessous

## 🔄 Étape 3 : Mettre à jour le Code (2 min)

**Le code est déjà à jour !** Les modifications dans `stores/dataStore.ts` sont déjà en place.

Si vous utilisez git :
```bash
git status
# Vérifier que dataStore.ts est modifié
git diff stores/dataStore.ts
```

## 🚢 Étape 4 : Déployer l'Application (5 min)

### Option A : Redéploiement Manuel
```bash
npm run build
# Puis déployer selon votre méthode habituelle
```

### Option B : Commit + Push
```bash
git add .
git commit -m "fix: corriger race condition numéros facture (légal)"
git push
# Le déploiement automatique se lancera
```

### Option C : Vercel/Déployer
```bash
# Si vous utilisez Vercel CLI
vercel --prod
```

## 🧪 Étape 5 : Tests Post-Déploiement (5 min)

1. **Créer une facture**
   - Aller sur l'application en production
   - Créer une nouvelle facture
   - Vérifier qu'elle a un numéro unique

2. **Tester la duplication**
   - Dupliquer une facture existante
   - Vérifier que le numéro est différent

3. **Test de résistance (optionnel)**
   - Ouvrir 2 onglets
   - Créer 2 factures simultanément
   - Vérifier que les numéros sont différents

## ⚠️ Dépannage

### Erreur "relation does not exist"
**Cause** : La table `invoices` n'existe pas
**Solution** : Vérifier que vous êtes sur le bon schéma (`public`)

### Erreur "function already exists"
**Cause** : La fonction a déjà été créée
**Solution** : La migration utilise `DROP FUNCTION IF EXISTS`, ré-exécuter simplement

### Erreur "duplicate key value violates unique constraint"
**Cause** : Des doublons existent déjà
**Solution** : La migration inclut un nettoyage automatique. Si l'erreur persiste :
```sql
-- Nettoyage manuel des doublons
WITH duplicates AS (
  SELECT id, user_id, number,
    ROW_NUMBER() OVER (PARTITION BY user_id, number ORDER BY created_at ASC) as rn
  FROM public.invoices
  WHERE status != 'draft'
)
DELETE FROM public.invoices
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
```

### Erreur "permission denied"
**Cause** : Pas les droits nécessaires
**Solution** : Utiliser un compte avec droits admin sur Supabase

## 📊 Monitoring

Après déploiement, surveillez :

1. **Logs d'erreur** dans le Dashboard Supabase
   - Onglet Logs → chercher "create_invoice_atomique"

2. **Nouvelles factures**
   - Vérifier qu'elles ont toutes un numéro unique

3. **Performance**
   - La fonction atomique est plus lente que l'ancien RPC (normal à cause du verrouillage)
   - Mais garantit l'unicité

## 🔙 Rollback (si nécessaire)

En cas de problème grave :

```sql
-- Supprimer l'index unique
DROP INDEX IF EXISTS idx_invoices_unique_number;

-- Supprimer la fonction
DROP FUNCTION IF EXISTS public.create_invoice_atomique;

-- Revenir à l'ancien RPC
-- Note: dataStore.ts doit aussi être rollbacké
```

## ✅ Checklist de Validation

- [ ] Migration appliquée avec succès
- [ ] Script de test passé (tout est ✅)
- [ ] Code déployé en production
- [ ] Test création facture OK
- [ ] Test duplication facture OK
- [ ] Aucune erreur dans les logs
- [ ] Numéros uniques vérifiés

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs Supabase
2. Consulter `INVOICE_FIX_SUMMARY.md`
3. Vérifier que toutes les étapes ont été suivies

---

**Une fois déployé, votre application sera conforme aux exigences légales françaises pour la numérotation des factures.**
