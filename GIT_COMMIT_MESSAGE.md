fix: corriger race condition critique sur numéros de facture (légal)

## 🚨 Problème Critique Corrigé

**Race Condition** pouvant générer des numéros de facture en double,
ce qui est ILLÉGAL en France (L441-9 du Code de commerce).

## 📋 Changements

### Migration SQL (supabase/migrations/)
- **20250509000000_fix_invoice_unique_constraint.sql** (NOUVEAU)
  - Ajout index unique sur (user_id, number) pour status != 'draft'
  - Création fonction atomique create_invoice_atomique()
  - Ajout colonne invoice_month avec trigger automatique
  - Nettoyage automatique des doublons existants

- **test_invoice_uniqueness.sql** (NOUVEAU)
  - Script de validation de la correction

### Code Client (stores/)
- **dataStore.ts** (MODIFIÉ)
  - createInvoice(): Utilise create_invoice_atomique RPC
  - duplicateInvoice(): Utilise create_invoice_atomique RPC
  - IdempotencyId systématique avec crypto.randomUUID()

### Scripts (scripts/)
- **check-invoice-fix.ts** (NOUVEAU)
  - Script de vérification automatisé de la correction

### Documentation
- **INVOICE_FIX_SUMMARY.md** (NOUVEAU)
  - Documentation technique complète

- **DEPLOYMENT_GUIDE.md** (NOUVEAU)
  - Guide étape par étape pour le déploiement

## 🔒 Pourquoi Cette Solution Fonctionne

### Avant (Vulnérable)
```
Thread 1: RPC → count=5 → insert FACT-2025-005
Thread 2: RPC → count=5 → insert FACT-2025-005 ❌ DOUBLON
```

### Après (Sûr)
```
Thread 1: Lock → increment to 5 → insert FACT-2025-005 → commit
Thread 2: Wait → increment to 6 → insert FACT-2025-006 → commit ✅
```

### Défense en Profondeur
1. Verrouillage FOR UPDATE sur le profil
2. Transaction atomique (tout ou rien)
3. Contrainte unique en dernier recours
4. Idempotence côté client

## 📦 Déploiement

1. Appliquer la migration dans le SQL Editor Supabase
2. Redéployer l'application
3. Exécuter: npm run check:invoice-fix

## ⚠️ Action Requise

Cette migration doit être appliquée MANUELLEMENT dans le Dashboard
Supabase avant le prochain déploiement en production.

Voir DEPLOYMENT_GUIDE.md pour les instructions détaillées.

---

**Conformité légale** : Article L441-9 du Code de commerce
**Risque** : Sanctions fiscales en cas de non-conformité
**Priorité** : CRITIQUE

---

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
