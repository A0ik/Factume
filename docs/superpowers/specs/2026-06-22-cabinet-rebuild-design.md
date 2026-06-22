# Cabinet Comptable — Reconstruction complète (spec de design)

**Date** : 2026-06-22  
**Auteur** : Dédalos  
**Cible** : reconstruire le module `/cabinet` de factu.me à partir de `CabinetComptable_V5.html`, intégré nativement à React/Next.js + Supabase, thème-adaptatif.

---

## 1. Contexte et décisions validées

Le HTML fourni (« Lexis Cabinet ») est une SPA claire de 12 sections (DM Sans + Playfair, navy/gold/teal/coral), persistance 100% `localStorage`, emojis partout. L'ancien `/cabinet` React est un module sombre (24 sous-routes) qui **ignore le système de thème** et code les couleurs en dur.

Décisions arbitries par l'utilisateur :

| Axe | Décision |
|---|---|
| Thème | **Adaptatif** clair/sombre, branché sur le système de thème existant |
| Portée | **Module complet** — les 12 sections du HTML |
| Marque | **White-label dynamique** (`cabinets.primary_color` / `logo_url` / `white_label_name`) |
| Typo | **Inter uniquement** (pas de Playfair) |

Projet Supabase : `ggrwyfhptxwpahwkeoyj` (A0ik's Project, eu-west-3, actif).

---

## 2. Stratégie de thème (décision architecturale clé)

Le système de thème existant repose sur :
- `tailwind.config.ts` → `darkMode: 'class'`
- Script anti-flash dans `app/layout.tsx` (lit `localStorage.theme`, défaut `dark`, supporte `system`)
- `stores/themeStore.ts` + `components/providers/ThemeProvider.tsx` (appliquent `.dark` sur `<html>`)
- **Couche d'override dans `app/globals.css`** : en `.dark`, les utilitaires clairs (`bg-white`, `bg-gray-50/100/200`, `text-gray-300..900`, `text-slate-*`, `border-gray-*`, `divide-gray-*`, `hover:bg-gray-*`, `bg-brand-*`, statuts red/green/amber) sont **remappés vers les neutres OBSIDIAN** via `!important`, sauf sur `#landing`.

**Règle de mise en œuvre ( absolue )** :
- Tous les composants cabinet sont écrits avec des **utilitaires clairs standards** (`bg-white`, `text-gray-900`, `text-slate-500/600`, `border-gray-200`, `bg-gray-50`, `divide-gray-100`, `hover:bg-gray-50`…).
- **Interdits** : couleurs hex en dur (`bg-[#09090B]`), `zinc-*` (non mappés par l'override), et toute logique `dark:` manuelle redondante.
- Accent white-label : via `style={{ color: primaryColor }}` / `style={{ backgroundColor: primaryColor }}` (comme `layout.tsx` le fait déjà). `primaryColor = cabinet.primary_color || '#10b981'`.
- Résultat : un seul jeu de classes → rendu correct en clair ET en sombre, sans duplication.

---

## 3. Architecture cible

### 3.1 Arborescence de composants
```
app/(app)/cabinet/
  layout.tsx                 → CabinetShell (recodé thème-adaptatif)
  page.tsx                   → Dashboard
  clients/                   → Portefeuille Clients
  facturation/               → Suivi Facturation
  relances/                  → Relances Auto
  social/                    → Suivi Social (matrice DSN/bulletins)
  contrats/                  → Contrats & DPAE
  salaries/                  → Dossiers Salariés
  missions/                  → Lettres de Mission
  juridique/                 → Juridique
  agenda/                    → Agenda & RDV
  echeances/                 → Échéances Fiscales
  settings/                  → Mon Cabinet (white-label + sauvegarde)

components/cabinet/
  shell/  CabinetSidebar, CabinetTopbar, CabinetMobileNav
  ui/     KpiCard, DataTable, StatusBadge, Avatar, Modal, Tabs,
          DateBlock, DonutChart, BarChart, SirenLookup, EmptyState, Skeleton
  sections/  (un dossier par section)

stores/cabinetStore.ts       → conservé + étendu
hooks/useCabinetData.ts      → conservé (read stable)
hooks/useCabinetFetch.ts     → conservé (cache, retry, refresh token)
```

### 3.2 Couche données — règles de stabilité (zéro boucle)
- **Lecture** : `useCabinetData<T>(url)` exclusivement. Pas de `useEffect`+`fetch` maison.
- **Écriture** : `useCabinetMutation` → `cabinetMutation(url, method, body)` → `clearCabinetCache` + `refresh()`.
- **Pas de `setState` croisé** store ↔ hook. Le store Zustand reste source unique pour ce qui est déjà dedans ; le hook reste source pour les agrégats dashboard.
- États de chargement : **skeletons** (pas de spinner plein écran qui scintille).
- Abort + déduplication déjà gérés par `useCabinetFetch` (conservés).

---

## 4. Mapping données (HTML → Supabase)

| Section HTML | Table(s) Supabase | API (existant) |
|---|---|---|
| Clients | `cabinet_clients` + join `profiles` + agrégat `invoices` | `/api/cabinet/clients`, `/api/cabinet/dashboard` |
| Facturation | `invoices` (par client, server-side service role) | `/api/cabinet/invoices` |
| Relances | `invoices`(retard) + `cabinet_reminders` | `/api/cabinet/invoices` (+ route relances) |
| Social | `cabinet_social_tracking` (bs_issued/validated, dsn_status, at_mp, month/year) | `/api/cabinet/social` |
| Salariés | `cabinet_employees` (+ `contrats_travail`, `bulletins_paie`) | `/api/cabinet/employees` |
| Missions | `cabinet_missions` (mission_type, monthly_fee) | `/api/cabinet/missions` |
| Juridique | `cabinet_legal_acts`, `cabinet_fiscal_deadlines` | `/api/cabinet/legal`, `/api/cabinet/deadlines` |
| Échéances | `cabinet_fiscal_deadlines` | `/api/cabinet/deadlines` |
| Config cabinet | `cabinets` (name, siret, primary_color, logo_url, white_label_name, hide_factu_branding) | `/api/cabinet/clients` (PATCH), `/api/cabinet/list` |

**Persistance garantie** : toute mutation → route API (service role + vérification d'appartenance) → BDD → invalidation cache → refresh. Aucune donnée métier ne reste en `localStorage` (le cache lecture est le seul usage localStorage).

### RLS (vérifié, conforme — pas de modification requise phase 1)
- Tables `cabinet_*` : RLS via `cabinet_members` (un membre lit tout son cabinet ; écriture `admin`/`manager`). ✅
- `invoices` / `clients` : RLS owner-only → lecture client impossible côté navigateur. **Architecture conservée** : agrégation server-side en service role après vérification de membership (routes `/api/cabinet/*`).

---

## 5. Phasage d'exécution

| Phase | Périmètre | Livrable vérifiable |
|---|---|---|
| **1 — Fondation** | Tokens thème cabinet, primitives UI (`KpiCard`, `DataTable`, `StatusBadge`, `Avatar`, `Modal`, `Tabs`, `Skeleton`), `CabinetShell` (sidebar/topbar/mobile) thème-adaptatif, **Dashboard** refait | `/cabinet` responsive clair/sombre, KPI + portefeuille + graphiques branchés |
| **2 — Facturation** | Clients, Facturation, Relances | Tables filtrables, modales (création facture, email, visionneuse), persistance statut |
| **3 — Social** | Suivi Social (matrice), Dossiers Salariés, Contrats & DPAE | Matrice mois × client, CRUD salariés, génération DPAE |
| **4 — Conseil** | Lettres de Mission, Juridique, Échéances | CRUD missions/actes/échéances + templates |
| **5 — Calendrier & marque** | Agenda, Mon Cabinet (white-label + aperçu live), polish global | Agenda 3 vues, paramètres white-label, audit contraste |

Chaque phase est autonome et déployable. Les phases 2 à 5 préservent les fonctionnalités existantes (CIBLE 1 : ne rien oublier) en les restylant vers la structure Lexis + adaptation thème.

---

## 6. Hors-scope / reporté
- Nouveaux modules absents de l'existant ET non essentiels (ex. générateur de statuts SAS complet, OCR salarié réel) → marqués « à suivre » si rencontrés.
- Pas de refonte du `CabinetGuard` ni des routes d'invitation/accept (conservés).
- `next-themes` non introduit (le système maison existe et fonctionne).

---

## 7. Risques et mitigations
- **Régression thème** : on écrit utilitaires clairs → test clair + sombre à chaque composant.
- **Boucle useEffect** : usage strict de `useCabinetData`/`useCabinetMutation`, revue de chaque `useEffect`.
- **RLS owner-only factures** : ne jamais appeler `supabase.from('invoices')` côté client dans le cabinet ; passer par les routes API.
- **White-label** : `primaryColor` résolu une fois par render du shell, propagé via props/context (pas de recompute par feuille).
