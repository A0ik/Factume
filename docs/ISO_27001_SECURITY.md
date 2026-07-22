# Factu.me — Dossier Sécurité ISO/IEC 27001:2022

> ODIN · CIBLE 1 · 2026-07-22
> Projet Supabase audité : **A0ik's Project** (`ggrwyfhptxwpahwkeoyj`).
> Objet : amener le socle **technique** de factu.me au niveau « audit-ready » ISO 27001, et fournir le cadre documentaire (politiques, SoA, registre des risques).

> ⚠️ Note d'honnêteté : la **certification ISO 27001 est un SMSI organisationnel** (politiques, analyse de risques, SoA, audits internes, revue de direction) audité par un tiers. Supabase est *déjà* certifié ISO 27001 (couche infrastructure). Ce document couvre les **contrôles techniques applicatifs** + l'**ébauche des politiques** ; la certification finale exige un audit tierce partie (2-6 mois).

---

## 1. Étendue (scope)

Système d'information factu.me : application Next.js 15 (App Router) hébergée Vercel, base PostgreSQL Supabase (`ggrwyfhptxwpahwkeoyj`), Storage Supabase, Auth Supabase, paiements Stripe, email Resend, IA Groq/OpenAI.

Exclusions : infrastructure Supabase (sous sa propre certif), infrastructure Vercel (socis 2 / ISO 27001).

---

## 2. Constat d'audit (preuves par code/BDD)

### 2.1 Couche BDD — BLANCHE + durcie
- ✅ **RLS activée sur 100 % des tables applicatives** (vérifié via advisor Supabase : aucune table RLS-off).
- ✅ **IDOR SECURITY DEFINER éliminé** : toutes les fonctions exposées qui reçoivent un `p_user_id` vérifient `p_user_id != auth.uid()` ; 10 fonctions sensibles (`activate_trial`, `consume_ocr/voice_quota`, `*_ai_slot`, `get_cron_secret`, `pdp_trigger_*`) ont **EXECUTE révoqué** pour anon ET authenticated.
- ✅ **search_path pinné** sur toutes les fonctions du schéma public (migration `odin_search_path_pin`).
- ✅ **Storage durci** (migration `odin_storage_hardening`) : bucket `receipts` privé figé ; listing des buckets publics (`assets`/`client-logos`/`logos`) verrouillé (0 appel `.list()` dans le code — accès par URL préservé).

### 2.2 Couche API — failles colmatées
| Sévé | Faille | Correctif |
|---|---|---|
| 🔴 HIGH | Escalade de rôle intra-cabinet (SSN/emails des autres locataires) | Scoping `getScopedClientIds` + `requireCabinetStaff` sur 12 routes cabinet (employees, reminders, messages, missions, legal, social, deadlines, clients/[id], clients, clients/[id]/data, 2 routes PDF) |
| 🔴 HIGH | Path traversal forgery d'URL signée | Normalisation + rejet `..` + vérification du 1er segment = uid ([signed-url/route.ts](app/api/storage/signed-url/route.ts)) |
| 🟠 MED | Injection nom de table `contracts_${type}` | Allowlist `CONTRACT_TABLE_BY_TYPE` (version + amendments) |
| 🟠 MED | `getSession()` au lieu de `getUser()` (contrats) | Swap defense-in-depth (attachments, amendments, comments, comments/[id], attachments/[id]) |
| 🟠 MED | Nom de fichier non-sanitisé (storage path) | Sanitization `[a-zA-Z0-9._-]` (attachments) |
| 🟠 MED | `.or()` non-sanitisé (vendors) | Sanitization PostgREST |

### 2.3 Couche frontend — BLANCHE (vérifiée)
- ✅ XSS propre (17 `dangerouslySetInnerHTML` = JSON-LD statiques).
- ✅ Aucun secret client (`server-only` gardé, import-graph contrôlé).
- ✅ Cookies `httpOnly + sameSite=lax + secure(prod)` ([lib/auth-cookies.ts](lib/auth-cookies.ts)).
- ✅ CSRF couvert par `SameSite=lax` + secrets/hmac sur routes publiques.
- ✅ Routes token (portail client, signature devis/contrat, share, download) : validation serveur + ownership.

---

## 3. Actions manuelles requêtes (hors code)

| # | Action | Où | Pourquoi |
|---|---|---|---|
| M1 | **Activer « Leaked password protection » (HIBP)** | Dashboard Supabase → Authentication → Settings | Empêche les mots de passe compromis (HaveIBeenPwned). Actuellement DÉSACTIVÉ (advisor WARN). |
| M2 | Vérifier `DOCUMENT_SIGNING_SECRET` défini et ≥ 16 car. en prod | Variables d'env Vercel | Le fail-closed (recommandé) ne doit pas casser la signature — s'assurer du secret AVANT de durcir. |
| M3 | Rotation des clés de service (quarterly) | Supabase + Stripe + Resend | Bonne pratique ISO (A.5.17). |

---

## 4. Déclaration d'applicabilité (SoA) — Annex A 27001:2022

| Contrôle | Applicable ? | Mise en œuvre à factu.me |
|---|---|---|
| A.5.1 Politiques de sécurité | Oui | Présent document + CGU `/legal/cgu` |
| A.5.15 Contrôle d'accès | Oui | RLS Supabase + `getUser()` + scoping cabinet |
| A.5.16 Gestion des identités | Oui | Auth Supabase (email/OTP), profils, rôles cabinet |
| A.5.17 Authentification | Oui | Cookies httpOnly/secure ; ⚠️ HIBP à activer (M1) |
| A.5.18 Droits d'accès | Oui | RLS ligne + RPC SECURITY DEFINER verrouillés |
| A.5.23 Ségrégation réseaux/services | Oui | Buckets privés (receipts) + signed URLs |
| A.5.30 ICT pour traitement d'incidents | Partiel | Logs console + Sentry — à compléter (runbook) |
| A.5.32 Modifications techniques | Oui | Git + revue de code (sessions successives) |
| A.5.34 Protection vie privée | Oui | Minimisation PII, portail client tokenisé |
| A.6.3 Formation | À faire | Sensibilisation équipe (processus org) |
| A.8.2 Gestion des privilèges | Oui | Service role server-only, EXECUTE révoqué |
| A.8.3 Limitation des informations divulguées | Oui | `server-only`, aucun secret client |
| A.8.4 Accès au code source | Oui | Git, branches, revue |
| A.8.7 Détection de logiciels malveillants | Hébergé | Vercel/Supabase gèrent |
| A.8.12 Fuite de données | Partiel | Backups Supabase ; BCP à formaliser |
| A.8.16 Activités de monitoring | Partiel | Logs + advisors Supabase + Sentry |
| A.8.23 Filtrage web | Oui | CSP, middleware rate-limit |
| A.8.25 Cycle de vie développement sécurisé | Oui | Présentes pratiques (allowlist, ownership, sanitize) |
| A.8.28 Codage sécurisé | Oui | Implicit via revues |
| A.8.29 Tests de sécurité en dév | Partiel | À formaliser (tests automatisés de RLS) |

Légende : **Oui** = contrôle technique en place ; **Partiel/À faire** = action organisationnelle à compléter pour la certif.

---

## 5. Registre des risques (résiduels)

| Risque | Probabilité | Impact | Traitement |
|---|---|---|---|
| Mot de passe compromis (HIBP off) | Moyen | Élevé | **M1** (action manuelle immédiate) |
| Signature devis sans rate-limit/identité | Faible | Moyen | Backlog : rate-limit route `quote-signing/[token]/sign` |
| TOCTOU verify-then-mutat sans `.eq('user_id')` (7 routes) | Faible | Faible | Backlog : ajouter `.eq('user_id', user.id)` aux mutations |
| Validation MIME manquante (routes upload legacy) | Faible | Faible | Backlog : étendre `validateVoiceData` |
| Drift migration / secret court | Faible | Moyen | M2 + revue migrations |

---

## 6. Backlog technique (items LOW non traités ce cycle)

- Rate-limit + identité signataire sur `app/api/quote-signing/[token]/sign/route.ts`.
- `.eq('user_id', user.id)` sur 7 routes verify-then-mutat (TOCTOU).
- Validation MIME/taille sur `app/api/import-clients`, `analyze-contract-file`, `process-voice-*`.
- Tests automatisés de policies RLS (multi-utilisateurs) — recommandé pour certif.

---

## 7. Conclusion

Le socle **technique** de factu.me atteint un niveau **audit-ready** : aucune faille HIGH/MED non traitée sur les flux argent/PII. Les **3 actions manuelles** (HIBP, secret signing, rotation) + la **formalisation organisationnelle** (formation, BCP, runbook incident, tests RLS) restent à mener pour viser la certification finale.
