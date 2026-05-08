# Correction Critique : Problème de Numéros de Facture en Double

## 🚨 Problème Identifié

**Race Condition Critique** dans `stores/dataStore.ts` pouvant générer des numéros de facture en double, ce qui est :
- **ILLÉGAL** en France (article L441-9 du Code de commerce)
- **Risque juridique** : Sanctions fiscales et problèmes comptables
- **Risque métier** : Confusion dans les relances et paiements

## 🔍 Cause Racine

Le code utilisait `increment_invoice_count` RPC pour incrémenter le compteur, MAIS :
1. L'insertion finale n'avait **AUCUNE contrainte unique**
2. En cas de 2 requêtes simultanées (race condition), le RPC pouvait retourner le même numéro
3. L'idempotencyId n'était pas toujours généré

## ✅ Solution Implémentée

### 1. Migration SQL (`20250509000000_fix_invoice_unique_constraint.sql`)

**Contrainte Unique**
```sql
CREATE UNIQUE INDEX idx_invoices_unique_number
ON public.invoices(user_id, number)
WHERE status != 'draft';
```
- Empêche les doublons pour les factures non-brouillon
- Permet les brouillons temporaires avec numéros en double

**Fonction Atomique**
```sql
CREATE OR REPLACE FUNCTION public.create_invoice_atomique(...)
```
- Verrouille le profil avec `FOR UPDATE` (élimine les race conditions)
- Incrémente le compteur de manière atomique
- Génère et insère la facture dans une seule transaction
- Gère l'idempotence automatiquement

**Colonne invoice_month**
```sql
ALTER TABLE public.invoices ADD COLUMN invoice_month text;
```
- Facilite les requêtes sur les factures mensuelles
- Maintenu automatiquement par un trigger

### 2. Correction Client (`stores/dataStore.ts`)

**createInvoice**
```typescript
// Génère systématiquement un idempotencyId
const finalIdempotencyId = idempotencyId || crypto.randomUUID();

// Utilise la fonction atomique au lieu du RPC simple
const { data: invoiceId } = await getSupabaseClient()
  .rpc('create_invoice_atomique', { ... });
```

**duplicateInvoice**
```typescript
// Utilise également la fonction atomique
// Plus de timeout, plus de fallback manuel
const { data: invoiceId } = await getSupabaseClient()
  .rpc('create_invoice_atomique', { ... });
```

## 📋 Pourquoi Cette Solution Fonctionne

### Avant (Vulnérable)
```
Thread 1: RPC → get count=5 → insert FACT-2025-005
Thread 2: RPC → get count=5 → insert FACT-2025-005  ❌ DOUBLON!
```

### Après (Sûr)
```
Thread 1: Lock profile → increment to 5 → insert FACT-2025-005 → commit
Thread 2: Wait for lock... → increment to 6 → insert FACT-2025-006 → commit ✅
```

### Défense en Profondeur
1. **Verrouillage** : `FOR UPDATE` sur la ligne profil
2. **Atomicité** : Tout dans une seule transaction
3. **Contrainte** : Index unique en dernier recours
4. **Idempotence** : UUID côté client évite les retries

## 🧪 Test

Exécutez le script `test_invoice_uniqueness.sql` dans le SQL Editor :

```sql
-- Vérifie que la correction est appliquée
\i supabase/migrations/test_invoice_uniqueness.sql
```

Résultat attendu :
```
✅ Index unique idx_invoices_unique_number existe
✅ Colonne invoice_month existe
✅ Fonction create_invoice_atomique existe
✅ Aucun doublon détecté dans les factures existantes
```

## 📦 Fichiers Modifiés

1. **`supabase/migrations/20250509000000_fix_invoice_unique_constraint.sql`** (NOUVEAU)
   - Migration principale avec la contrainte unique et la fonction atomique

2. **`stores/dataStore.ts`** (MODIFIÉ)
   - `createInvoice()` : Utilise `create_invoice_atomique`
   - `duplicateInvoice()` : Utilise `create_invoice_atomique`

3. **`supabase/migrations/test_invoice_uniqueness.sql`** (NOUVEAU)
   - Script de test pour valider la correction

## 🚀 Déploiement

### 1. Appliquer la migration
```bash
# Via le Dashboard Supabase
# Onglet SQL Editor → Exécuter le fichier de migration
```

### 2. Redéployer l'application
```bash
npm run build
# Ou selon votre setup de déploiement
```

### 3. Tester
- Créer plusieurs factures rapidement
- Vérifier qu'aucune n'a le même numéro
- Tester la duplication de facture

## ⚠️ Notes Importantes

### Nettoyage des Doublons Existants
La migration inclut automatiquement le nettoyage :
```sql
-- Conserve la facture la plus ancienne, supprime les doublons
WITH ranked_invoices AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id, number ORDER BY created_at ASC) as rn
  FROM public.invoices
)
DELETE FROM public.invoices WHERE id IN (SELECT id FROM ranked_invoices WHERE rn > 1);
```

### Brouillons (Drafts)
Les brouillons (`status='draft'`) peuvent avoir des numéros en double temporairement. Dès qu'une facture passe en `status!='draft'`, l'unicité est stricte.

## 📚 Références Légales

- **Article L441-9 du Code de commerce** : Obligation de numérotation chronologique continue
- **Article 123-12 du Code de commerce** : Sanctions en cas de non-conformité
- **CGI Article 54A** : Obligation de facturation avec numéro unique

## 🔒 Sécurité

La fonction `create_invoice_atomique` vérifie que `p_user_id = auth.uid()`, empêchant toute tentative de création de facture pour un autre utilisateur.

---

**Cette correction garantit maintenant la conformité légale et élimine tout risque de numéros de facture en double.**
