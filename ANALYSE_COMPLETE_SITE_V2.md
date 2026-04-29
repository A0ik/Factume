# FacturmeWeb - Analyse Complète du Site Internet

**Date**: 29 Avril 2026  
**Type de projet**: SaaS de Facturation / Gestion CRM / Gestion de Contrats  
**Technologies**: Next.js 15, Supabase, Resend, Tailwind CSS, TypeScript  
**Design System**: Glassmorphism avec effets 3D et animations Framer Motion  

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Fonctionnalités par module](#fonctionnalités-par-module)
4. [Design System & UI/UX](#design-system--uiux)
5. [Stores & State Management](#stores--state-management)
6. [API & Services](#api--services)
7. [Sécurité & Performance](#sécurité--performance)
8. [Points forts](#points-forts)
9. [Axes d'amélioration](#axes-damélioration)
10. [Conclusion](#conclusion)

---

## 🎯 Vue d'ensemble

**FacturmeWeb** est une plateforme SaaS B2B complète destinée aux freelances, TPE/PME et entrepreneurs individuels français. Elle combine plusieurs outils essentiels en une seule interface :

- **Facturation** : Devis, factures, avoirs, bons de commande, bons de livraison
- **CRM** : Pipeline de ventes avec gestion des opportunités
- **Contrats** : Gestion complète des contrats de travail (CDI, CDD, autres)
- **Notes de frais** : Suivi des dépenses professionnelles avec OCR IA
- **Clients** : Gestion de la base clients avec statistiques
- **Agenda** : Calendrier interactif avec synchronisation Google
- **Produits** : Catalogue d'articles/services

### Positionnement

- **Cible**: Freelances, consultants, agences, petites entreprises françaises
- **Pays**: France (interface FR, mentions légales FR, TVA FR, conformité Code du travail)
- **Modèle économique**: Freemium avec plans mensuels (Free/Trial → Solo → Pro → Business)

### Promesse de valeur

1. **Tout-en-un**: Facturation + CRM + Contrats + Notes de frais en un seul outil
2. **Conformité française**: Templates de contrats conformes au Code du travail 2026
3. **Automatisation IA**: OCR des justificatifs, catégorisation automatique
4. **Export comptable**: Format FEC français natif
5. **Glassmorphism moderne**: Interface 3D professionnelle et responsive

---

## 🏗️ Architecture Technique

### Stack technologique

#### Frontend
```json
{
  "framework": "Next.js 15 (App Router)",
  "react": "19.0.0",
  "typescript": "5.x",
  "styling": "Tailwind CSS 3.4.17",
  "animations": "Framer Motion 12.38.0",
  "charts": "Recharts 2.15.3",
  "icons": "Lucide React 0.511.0",
  "state": "Zustand 5.0.4",
  "notifications": "Sonner 2.0.7",
  "pdf": "@react-pdf/renderer 4.5.1"
}
```

#### Backend
```json
{
  "database": "Supabase (PostgreSQL)",
  "auth": "Supabase Auth",
  "storage": "Supabase Storage",
  "edge": "Supabase Edge Functions",
  "email": "Resend 6.12.2 (migré de Brevo)",
  "payments": "Stripe 17.7.0 + SumUp",
  "ai": "Groq SDK 0.13.0 + OpenAI 4.100.0",
  "webhooks": "Custom webhook system"
}
```

### Structure du projet

```
app/
├── (app)/                          # Application protégée (auth requise)
│   ├── dashboard/                  # Tableau de bord principal
│   ├── documents/                  # Gestion des documents
│   │   ├── factures/              # Factures clients
│   │   ├── devis/                 # Devis
│   │   ├── avoirs/                # Avoirs
│   │   ├── commandes/             # Bons de commande
│   │   ├── livraisons/            # Bons de livraison
│   │   └── acomptes/              # Acomptes
│   ├── contracts/                  # Gestion des contrats
│   │   ├── [id]/                  # Détail du contrat
│   │   ├── new/                   # Création par type
│   │   ├── list/                  # Liste par type
│   │   └── reports/               # Rapports
│   ├── crm/                       # Pipeline CRM
│   ├── expenses/                  # Notes de frais
│   ├── clients/                   # Gestion clients
│   ├── products/                  # Catalogue produits
│   ├── calendar/                  # Agenda
│   ├── offline/                   # Pages hors-ligne (PWA)
│   ├── notifications/             # Centre de notifications
│   ├── settings/                  # Paramètres
│   └── paywall/                   # Page d'upgrade
├── (auth)/                         # Flux d'authentification
│   ├── login/                     # Connexion
│   ├── register/                  # Inscription
│   └── callback/                  # OAuth callback
├── (onboarding)/                   # Onboarding utilisateur
│   └── onboarding/                # Étapes de configuration
├── api/                           # API routes
│   ├── ai/                        # Endpoints IA
│   ├── stripe/                    # Webhooks Stripe
│   ├── contract-signing/          # Signature contrats
│   ├── contracts/                 # CRUD contrats
│   ├── cron/                      # Tâches programmées
│   └── account/                   # Gestion compte
├── legal/                         # Pages légales
│   ├── pdp/                       # Politique confidentialité
│   └── factur-x/                  # Aide Factur-X
└── share/                         # Pages publiques de partage

components/
├── layout/                        # Layout components
│   ├── Sidebar.tsx               # Navigation principale
│   ├── Header.tsx                # Header desktop
│   ├── MobileDrawer.tsx          # Menu mobile
│   └── BottomNav.tsx             # Navigation mobile
├── ui/                            # Composants réutilisables
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Calendar.tsx
│   ├── CommandPalette.tsx        # ⌘K search
│   ├── FacturXButton.tsx         # Export Factur-X
│   ├── ThemeToggle.tsx           # Dark/Light mode
│   └── ...
├── calendar/                      # Composants agenda
├── contracts/                     # Composants contrats
├── labor-law/                    # Composants droit du travail
└── clients/                      # Composants clients

stores/                             # State management (Zustand)
├── authStore.ts                  # Authentification + profile
├── dataStore.ts                  # Clients + factures + stats
├── crmStore.ts                   # Opportunities + tasks + activities
├── contractStore.ts              # Contrats + lifecycle
├── workspaceStore.ts             # Workspaces + notifications
└── themeStore.ts                 # Thème (dark/light)

lib/
├── supabase.ts                   # Client Supabase
├── supabase-server.ts            # Server client
├── utils.ts                      # Helpers (cn, formatCurrency...)
├── facturx.ts                    # Export Factur-X
├── templates.ts                  # Templates documents
├── pdf.ts                        # Génération PDF
├── groq-translator.ts            # Traduction IA
├── services/                     # Services métier
│   ├── ai-models-config.ts       # Configuration IA
│   ├── contract-*-service.ts     # Services contrats
│   └── lia-service.ts            # Service LIA
└── labor-law/                    # Logique droit du travail
    ├── smic-service.ts           # Calcul SMIC
    ├── contract-templates.ts     # Templates contrats
    ├── clauses-library.ts        # Bibliothèque clauses
    ├── cotisations.ts            # Calcul cotisations
    ├── bulletin-paie.ts          # Fiches paie
    ├── docx-export-service.ts    # Export DOCX
    └── rules.ts                  # Règles légales

hooks/
├── useSubscription.ts            # Hook abonnement
└── useWorkspace.ts               # Hook workspace

types/
└── index.ts                      # Types TypeScript
```

---

## 🧩 Fonctionnalités par Module

### 1. 📊 Dashboard (Tableau de bord)

**Page**: [`/dashboard`](app/(app)/dashboard/page.tsx)

#### Fonctionnalités détaillées

1. **Header personnalisé**
   - Message selon l'heure (Bonjour/Bon après-midi/Bonsoir)
   - Nom de l'entreprise avec gradient
   - Bouton "Nouveau" avec animation hover

2. **KPIs principaux** (4 cartes animées)
   - **CA du mois** (carte principale)
     - Gradient: `from-primary via-primary/95 to-primary-dark`
     - Indicateur de croissance (+12.5% vs mois dernier)
   - **En attente** (bleu)
   - **En retard** (rouge si > 0)
   - **Total encaissé** (vert)

3. **Actions rapides** (5 boutons)
   - Gradients colorés par type
   - Animation shimmer au hover
   - Icons: FileText, Clipboard, RefreshCw, ShoppingCart, Truck

4. **Graphique d'évolution**
   - Diagramme en barres (Recharts)
   - Comparatif Facturé vs Encaissé
   - Période ajustable : 1, 3, 6, 12 mois
   - Tooltip personnalisé avec animation

5. **Taux de recouvrement**
   - Barre de progression animée (spring)
   - Couleur dynamique (vert ≥ 80%, orange sinon)
   - Pourcentage avec compteur animé

6. **Top 5 clients**
   - Avatars colorés avec initiales
   - Barre de progression comparative
   - Compteur de factures
   - Animation stagger

7. **Trésorerie prévisionnelle (90 jours)**
   - Tableau mois par mois
   - À encaisser (factures envoyées/en retard)
   - Récurrents prévus (projection)
   - Cumulatif

8. **Documents récents**
   - Liste des 5 derniers documents
   - Badge de statut animé
   - Lien vers détails

#### Code clé
```typescript
// KPIs calculation
const paid = invoices.filter((i) => i.status === 'paid');
const pending = invoices.filter((i) => i.status === 'sent');
const overdue = invoices.filter((i) => i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date());
const mrr = invoices.filter((i) => i.status === 'paid' && new Date(i.created_at) >= startOfMonth).reduce((s, i) => s + i.total, 0);

// Animated progress
const progressValue = useSpring(recoveryRate, { stiffness: 50, damping: 30 });
const progressWidth = useTransform(progressValue, (v) => `${v}%`);
```

---

### 2. 📄 Documents (Factures, Devis, Avoirs...)

**Module**: [`/documents/*`](app/(app)/documents/)

#### Types de documents

| Type | Route | Template |
|------|-------|----------|
| **Facture** | `/documents/factures` | Minimaliste, Classique, Moderne |
| **Devis** | `/documents/devis` | Idem facture |
| **Avoir** | `/documents/avoirs` | Idem facture |
| **Bon de commande** | `/documents/commandes` | Spécifique |
| **Bon de livraison** | `/documents/livraisons` | Spécifique |
| **Acompte** | `/documents/acomptes` | Spécifique |

#### Fonctionnalités avancées

**Incrément atomique**:
```typescript
// RPC call pour éviter les race conditions
const { data: invoiceCount } = await supabase.rpc('increment_invoice_count', { 
  p_user_id: user.id 
});
```

**Idempotency**:
- Génération d'ID unique côté client
- Vérification avant création
- Empêche les duplicatas en cas de retry

**Conversion devis → facture**:
- Conservation du client
- Copie des lignes
- Génération nouveau numéro

**Factures récurrentes**:
- Fréquences: weekly, monthly, quarterly, yearly
- Automatisation de la création
- Historique des envois

#### Modèles de documents

**3 templates intégrés**:
1. **Minimaliste**: Épuré, moderne
2. **Classique**: Tableau traditionnel
3. **Moderne**: Mise en page contemporaine

**Template personnalisé IA**:
- Upload d'une facture existante
- Analyse IA de la structure
- Génération de template réutilisable

---

### 3. 🎯 CRM / Pipeline ([`/crm`](app/(app)/crm/page.tsx))

**Design System**: Glassmorphism avec effets 3D

#### Composants 3D personnalisés

**KanbanCard** ([code source](app/(app)/crm/page.tsx:97-189)):
```typescript
// Perspective 3D avec hover
style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
whileHover={{ y: -4, scale: 1.02, rotateX: 2 }}

// Glassmorphism
bg-white/80 dark:bg-slate-800/80
backdrop-blur-xl
border border-white/50 dark:border-white/10
shadow-xl shadow-gray-200/50 dark:shadow-black/20

// Gradient overlay au hover
<div className={cn('absolute inset-0 bg-gradient-to-br opacity-0', s.gradient)}
     animate={{ opacity: isHovered ? 0.15 : 0 }} />

// Shine effect animé
<motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          initial={{ x: '-100%' }}
          animate={{ x: isHovered ? '200%' : '-100%' }} />
```

**StageDropdown** ([code source](app/(app)/crm/page.tsx:193-253)):
- Menu déroulant personnalisé
- Animation scale/fade
- Gradients pour chaque option
- Icônes Lucide React

**DetailPanel** ([code source](app/(app)/crm/page.tsx:320-632)):
- Panneau latéral slide-in
- Animation spring: `stiffness: 350, damping: 35`
- Pipeline visuel interactif
- Informations cliquables (mailto:, tel:)

#### Fonctionnalités CRM

**Vue Kanban**:
- 6 colonnes avec headers 3D
- Drag & drop fluide
- Tri automatique par valeur
- Badge compteur par colonne

**Vue Liste**:
- Tableau triable
- Colonnes: Client/Valeur/Étape/Prob/Priorité/Échéance
- Actions au survol

**Gestion des tâches**:
- Ajout de tâches par deal
- Barre de progression visuelle
- Animation de complétion

**Timeline d'activité**:
- Types: note, stage_change, task, email
- Horodatage FR
- Icônes distinctes par type

**Statistiques temps réel**:
1. Pipeline pondéré: Σ valeur × probabilité / 100
2. Revenue gagné: Σ valeur (won)
3. Taux de conversion: won / (won + lost)
4. Deals chauds: Σ valeur (negotiation)

---

### 4. 💰 Notes de Frais ([`/expenses`](app/(app)/expenses/page.tsx))

**Design**: Cartes 3D avec glassmorphism

#### Catégories avec gradients

```typescript
const CATEGORIES = [
  { value: 'transport',  icon: Car,    color: 'from-blue-500 to-blue-600' },
  { value: 'meals',      icon: Coffee, color: 'from-amber-500 to-amber-600' },
  { value: 'accommodation', icon: Home, color: 'from-green-500 to-green-600' },
  { value: 'equipment',  icon: Laptop, color: 'from-purple-500 to-purple-600' },
  { value: 'office',     icon: Briefcase, color: 'from-cyan-500 to-cyan-600' },
  { value: 'shopping',   icon: ShoppingCart, color: 'from-pink-500 to-pink-600' },
  { value: 'other',      icon: MoreHorizontal, color: 'from-gray-500 to-gray-600' },
];
```

#### Fonctionnalités IA détaillées

**OCR automatique** ([`/api/ai/ocr-receipt`](app/api/ai/ocr-receipt/route.ts)):
```typescript
// Upload → Analyse → Remplissage
const formData = new FormData();
formData.append('file', file);
const res = await fetch('/api/ai/ocr-receipt', { 
  method: 'POST', 
  body: formData 
});
// Extraction: vendor, amount, vat_amount, date, description, category
```

**Catégorisation IA** ([`/api/ai/categorize-expense`](app/api/ai/categorize-expense/route.ts)):
```typescript
const res = await fetch('/api/ai/categorize-expense', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vendor, description }),
});
// Suggestion de catégorie basée sur fournisseur/description
```

#### Workflow de validation

**Statuts** avec badges glassmorphism:
```typescript
pending: 'bg-amber-50/80 text-amber-600 border-amber-200/50'
validated: 'bg-green-50/80 text-green-600 border-green-200/50'
rejected: 'bg-red-50/80 text-red-600 border-red-200/50'
```

**Actions rapides sur cards**:
- Validation en 1 clic
- Édition via modal
- Suppression avec confirmation

#### Composants personnalisés

**Expense3DCard** ([code source](app/(app)/expenses/page.tsx:66-153)):
- Perspective 3D: `1000px`
- Hover: `y: -4, scale: 1.01`
- Gradient overlay au hover
- Actions au survol uniquement

**CustomDropdown** ([code source](app/(app)/expenses/page.tsx:156-216)):
- Menu élégant personnalisé
- Animation scale/fade
- Backdrop pour fermeture

---

### 5. 📝 Contrats de Travail ([`/contracts`](app/(app)/contracts/page.tsx))

**Module complet de gestion des contrats**

#### Types de contrats

**CDI** ([`contracts_cdi`](lib/labor-law/contract-templates.ts)):
- Classification professionnelle
- Heures de travail (35h hebdomadaires par défaut)
- Convention collective
- Clause d'essai (max 2-4 mois selon statut)
- Clause de non-concurrence
- Clause de mobilité

**CDD** ([`contracts_cdd`](lib/labor-law/contract-templates.ts)):
- Date de fin obligatoire
- Motif de recours (obligatoire):
  - Remplacement d'un salarié
  - Accroissement temporaire d'activité
  - Saisonnalité
  - Commande exceptionnelle
- Renouvellement possible (1 fois max, 18 mois max)
- Indemnité de fin de contrat (10% ou 20%)

**Autres**:
- Stage (convention de stage obligatoire)
- Apprentissage (contrat, durée, objectifs)
- Professionnalisation
- CUI/CIE
- Portage salarial
- Intérim
- Travail à domicile
- Freelance

#### Services métier

**contract-lifecycle-service** ([lib/services/contract-lifecycle-service.ts](lib/services/contract-lifecycle-service.ts)):
```typescript
export const TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['pending_signature', 'cancelled'],
  pending_signature: ['signed', 'cancelled'],
  signed: ['active', 'cancelled'],
  active: ['ended', 'terminated'],
  ended: [],
  terminated: [],
  cancelled: [],
};
```

**contract-renewal-service** ([lib/services/contract-renewal-service.ts](lib/services/contract-renewal-service.ts)):
- Automatisation du renouvellement
- Calcul des nouvelles dates
- Historique des renouvellements
- Notification des parties

**contract-notification-service** ([lib/services/contract-notification-service.ts](lib/services/contract-notification-service.ts)):
- Email de signature
- Rappel d'échéance
- Notification de renouvellement

#### Fonctionnalités

**Signature électronique** ([`/api/contract-signing`](app/api/contract-signing/)):
- Token unique avec expiration
- Compteur de vues
- Validation de l'identité
- Horodatage légal

**Amendements** ([`/api/contracts/amendments`](app/api/contracts/amendments/route.ts)):
- Modification du contrat en cours
- Types: salaire, horaires, lieu, poste, autre
- Génération PDF de l'amendement
- Historique des modifications

**Pièces jointes** ([`/api/contracts/attachments`](app/api/contracts/attachments/route.ts)):
- Upload de documents
- Catégories: identité, diplôme, contrat, autre
- Prévisualisation

**Commentaires** ([`/api/contracts/comments`](app/api/contracts/comments/route.ts)):
- Discussion sur le contrat
- Horodatage
- Notifications

---

### 6. 👥 Clients ([`/clients`](app/(app)/clients/page.tsx))

#### Fonctionnalités détaillées

**Vue grille avec GlassCard** ([code source](app/(app)/clients/page.tsx:37-51)):
```typescript
const GlassCard = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={cn(
      'relative bg-white/70 dark:bg-white/5 backdrop-blur-xl',
      'border border-white/20 dark:border-white/10 rounded-3xl',
      'shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10',
      className
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent 
                opacity-0 hover:opacity-100 transition-opacity duration-500" />
    {children}
  </motion.div>
);
```

**StatCard** avec pattern animé ([code source](app/(app)/clients/page.tsx:54-92)):
- Background pattern SVG
- Animation rotate subtil
- Gradients par statut
- Icons Lucide React

**Recherche entreprise** ([`CompanySearch`](components/ui/CompanySearch.tsx)):
- API SIRENE intégrée
- Autocomplete par nom ou SIRET
- Remplissage automatique des champs

**Import IA** ([`ImportClientsModal`](components/ui/ImportClientsModal.tsx)):
- Import en masse via IA
- Analyse de documents
- Validation des données

---

## 🎨 Design System & UI/UX

### Couleurs principales

```css
--primary: #1D9E75 (Émeraude)
--primary-dark: #0F7355
--success: #10B981 (Emerald)
--warning: #F59E0B (Amber)
--error: #EF4444 (Red)
--neutral: grays (50-900)
```

### Glassmorphism System

**Base glassmorphism**:
```css
bg-white/70 dark:bg-slate-800/70
backdrop-blur-xl
border border-white/50 dark:border-white/10
shadow-xl shadow-gray-200/50 dark:shadow-black/20
```

**Cards 3D**:
```css
perspective: "1000px"
transform-style: "preserve-3d"
whileHover={{ y: -4, scale: 1.02, rotateX: 2 }}
```

**Overlay effects**:
```css
/* Gradient overlay */
bg-gradient-to-br from-white/40 to-transparent

/* Shine effect */
bg-gradient-to-r from-transparent via-white/40 to-transparent
skew-x-12
```

### Gradients par module

**Primary**: `from-primary to-primary-dark`

**CRM (par étape)**:
- Prospect: `from-slate-500 to-slate-600`
- Qualifié: `from-blue-500 to-blue-600`
- Proposition: `from-violet-500 to-violet-600`
- Négociation: `from-amber-500 to-amber-600`
- Gagné: `from-emerald-500 to-emerald-600`
- Perdu: `from-red-500 to-red-600`

**Expenses (par catégorie)**:
- Transport: `from-blue-500 to-blue-600`
- Repas: `from-amber-500 to-amber-600`
- Hébergement: `from-green-500 to-green-600`
- Matériel: `from-purple-500 to-purple-600`
- Bureau: `from-cyan-500 to-cyan-600`
- Achats: `from-pink-500 to-pink-600`

### Animations

**Spring physics**:
```typescript
// Micro-interactions
transition={{ type: "spring", stiffness: 300, damping: 20 }}

// Panels slide-in
transition={{ type: "spring", stiffness: 350, damping: 35 }}

// Heavy cards
transition={{ type: "spring", stiffness: 200, damping: 25 }}
```

**AnimatePresence**:
- Fade + scale pour les modales
- Slide + fade pour les panels
- Stagger children pour les listes

**Progressive values**:
```typescript
const progressValue = useSpring(recoveryRate, { stiffness: 50, damping: 30 });
const progressWidth = useTransform(progressValue, (v) => `${v}%`);
```

### Typography

```css
/* Headings */
font-black (900) - Titres principaux, KPIs

/* Body */
font-medium (500) - Texte standard

/* UI elements */
font-bold (700) - Labels, boutons

/* Captions */
font-semibold (600) - Notes, metadata
```

### Responsive Design

**Breakpoints**:
- Mobile: < 640px (1 colonne)
- Tablet: 640px - 1024px (2 colonnes)
- Desktop: > 1024px (3-4 colonnes)

**Navigation**:
- Desktop: Sidebar fixe gauche ([`Sidebar.tsx`](components/layout/Sidebar.tsx))
- Mobile: BottomNav + MobileDrawer ([`MobileDrawer.tsx`](components/layout/MobileDrawer.tsx))

**Grid adaptatif**:
- Dashboard: 2 → 4 colonnes
- CRM: 1 → 6 colonnes (Kanban)
- Expenses: 1 → 3 colonnes
- Clients: 1 → 3 colonnes

---

## 🗄️ Stores & State Management

### [authStore.ts](stores/authStore.ts)

**État**:
- `user`: User Supabase
- `profile`: Profile complet avec toutes les propriétés
- `loading`, `initialized`

**Actions principales**:
- `initialize()`: Initialisation auth + auto-expiration trial
- `signIn()`, `signUp()`: Connexion/inscription
- `signInWithGoogle()`: OAuth Google (à compléter)
- `signOut()`: Déconnexion complète
- `updateProfile()`: Mise à jour profil avec upsert
- `fetchProfile()`: Récupération + auto-expiration trial

**Particularités**:
- Expiration automatique de l'essai via `rpc('expire_trials')`
- Notification web push à l'init
- Gestion des tokens OAuth (Stripe, SumUp)
- Auto-refresh des sessions Supabase

### [dataStore.ts](stores/dataStore.ts)

**État**:
- `clients`: Client[]
- `invoices`: Invoice[] (avec jointure client)
- `recurringInvoices`: RecurringInvoice[]
- `stats`: DashboardStats

**Actions principales**:
- `fetchClients()`, `createClient()`, `bulkCreateClients()`
- `fetchInvoices()`, `createInvoice()`, `duplicateInvoice()`
- `updateInvoice()`, `updateInvoiceStatus()`, `deleteInvoice()`
- `fetchRecurringInvoices()`, `createRecurringInvoice()`
- `computeStats()`: Calcul automatique des KPIs

**Particularités**:
- Incrément atomique via `rpc('increment_invoice_count')`
- Gestion des quotas par plan (free: 5/mois)
- Idempotency pour éviter les duplicatas
- Stats calculées automatiquement à chaque changement

### [crmStore.ts](stores/crmStore.ts)

**État**:
- `opportunities`: Opportunity[]
- `tasks`: Record<opportunityId, CrmTask[]>
- `activities`: Record<opportunityId, CrmActivity[]>

**Actions principales**:
- `fetchOpportunities()`, `createOpportunity()`
- `updateOpportunity()`, `deleteOpportunity()`
- `fetchTasks()`, `addTask()`, `toggleTask()`, `deleteTask()`
- `fetchActivities()`, `addActivity()`

**Types**:
- `OpportunityStage`: prospect | qualified | proposal | negotiation | won | lost
- `OpportunityPriority`: low | medium | high | urgent
- `CrmActivityType`: note | stage_change | task | email

**Particularités**:
- Log automatique des changements de stage
- Calcul automatique de la probabilité selon l'étape
- Horodatage de toutes les activités

### [contractStore.ts](stores/contractStore.ts)

**État**:
- `contracts`: ContractSummary[]
- `stats`: ContractDashboardStats
- `loading`

**Actions principales**:
- `fetchContracts()`: Récupération depuis 3 tables (CDI, CDD, other)
- `createContract()`: Création avec incrément atomique
- `updateContract()`, `updateContractStatus()`: Avec validation
- `deleteContract()`, `duplicateContract()`
- `renewContract()`: Via service dédié
- `getContractDetail()`: Détails complets
- `computeStats()`: KPIs dashboard

**Particularités**:
- Tables séparées par type de contrat
- Jointure avec tokens de signature actifs
- Suivi des renouvellements (`renewal_count`)
- Validation des transitions via `canTransition()`

### [workspaceStore.ts](stores/workspaceStore.ts)

**État**:
- `workspaces`: Workspace[]
- `notifications`: Notification[]
- `unreadCount`: number

**Actions principales**:
- `fetchWorkspaces()`, `createWorkspace()`
- `switchWorkspace()`, `deleteWorkspace()`
- `fetchNotifications()`, `markAsRead()`

---

## 🔌 API & Services

### API Routes IA

**[ocr-receipt](app/api/ai/ocr-receipt/route.ts)**:
- Upload de justificatif (PDF/image)
- Extraction via Groq SDK
- Retourne: vendor, amount, vat_amount, date, description, category

**[categorize-expense](app/api/ai/categorize-expense/route.ts)**:
- Classification basée sur fournisseur + description
- Suggestion de catégorie
- Endpoint léger et rapide

**[analyze-document](app/api/ai/analyze-document/route.ts)**:
- Analyse complète de document
- Extraction structurée des données

**[analyze-invoice-template](app/api/ai/analyze-invoice-template/route.ts)**:
- Upload d'une facture existante
- Génération de template réutilisable

**[generate-invoice](app/api/ai/generate-invoice/route.ts)**:
- Génération de facture via IA
- Paramètres: client, produits, montants

### API Routes Contrats

**[pdf](app/api/contracts/pdf/route.ts)**:
- Génération PDF via @react-pdf/renderer
- Templates conformes Code du travail
- Signature intégrée

**[docx](app/api/contracts/docx/route.ts)**:
- Export DOCX via docx library
- Modifiable dans Word

**[html-pdf](app/api/contracts/html-pdf/route.ts)**:
- Conversion HTML vers PDF
- Pour templates personnalisés

**[amendments](app/api/contracts/amendments/route.ts)**:
- CRUD des amendements
- Génération PDF des amendements

**[attachments](app/api/contracts/attachments/route.ts)**:
- Upload de fichiers
- Catégorisation automatique
- Suppression

**[comments](app/api/contracts/comments/route.ts)**:
- Discussion sur les contrats
- Horodatage
- Notifications

### API Signature Contrat

**[create](app/api/contract-signing/create/route.ts)**:
- Création d'un token de signature unique
- Expiration configurable
- Limitation du nombre de vues

**[[token]/route](app/api/contract-signing/[token]/route.ts)**:
- Accès à la page de signature
- Validation du token
- Comptage des vues

**[[token]/sign](app/api/contract-signing/[token]/sign/route.ts)**:
- Signature du contrat
- Validation de l'identité
- Horodatage légal

**[[token]/cancel](app/api/contract-signing/[token]/cancel/route.ts)**:
- Annulation de la signature
- Invaliditation du token

### API Cron

**[contract-expirations](app/api/cron/contract-expirations/route.ts)**:
- Vérification des contrats arrivant à échéance
- Notification automatique
- Mise à jour des statuts

**[reminders](app/api/cron/reminders/route.ts)**:
- Rappels de factures en retard
- Relances automatiques

### Services Métier

**[contract-lifecycle-service](lib/services/contract-lifecycle-service.ts)**:
```typescript
canTransition(current, next): boolean
TRANSITIONS: Record<ContractStatus, ContractStatus[]>
validateTransition(status, nextStatus): void
```

**[contract-renewal-service](lib/services/contract-renewal-service.ts)**:
```typescript
renewContract(id, type, newDate, reason, profile)
checkRenewals(): Promise<ContractRenewal[]>
```

**[contract-amendment-service](lib/services/contract-amendment-service.ts)**:
```typescript
createAmendment(contractId, changes, effectiveDate)
generateAmendmentPDF(amendment)
```

**[contract-notification-service](lib/services/contract-notification-service.ts)**:
```typescript
sendContractNotification({ userId, type, contractId, ... })
notifyExpiration(contract)
notifySignature(contract, email)
```

**[lia-service](lib/services/lia-service.ts)**:
- Logique d'information légale
- Mises à jour en temps réel du Code du travail
- Validation de la conformité

---

## 🔒 Sécurité & Performance

### Sécurité

**Authentification**:
- Supabase Auth (email/password)
- Sessions avec refresh tokens automatiques
- RLS (Row Level Security) sur toutes les tables
- Validation des tokens à chaque requête

**Isolation des données**:
- Workspace isolation via `user_id` dans RLS
- Filtre systématique par utilisateur
- Suppression en cascade des données liées
- Pas de fuite de données entre workspaces

**Validation**:
- Validation des inputs côté client (HTML5 + custom)
- Validation API côté serveur
- Validation SIRET (`/^\d{14}$/`)
- Validation TVA (`/^[A-Z]{2}[A-Z0-9]{2}[0-9]{9}$/`)

**Permissions**:
- Gestion des droits par plan (free/solo/pro/business)
- Vérification des quotas (factures, workspaces)
- Limitation des fonctionnalités par tier
- Upsell intelligent via paywall

**Protection CSRF**:
- Tokens de synchronisation pour les mutations
- Validation Origin header
- Double soumission cookie

### Performance

**Optimisations frontend**:
- Chargement lazy des modules (dynamic import)
- Pagination des listes (infinite scroll ou pages)
- Compression des images avant upload
- Code splitting par route

**Optimisations backend**:
- Indexation des tables fréquemment interrogées
- RPC pour les opérations atomiques (incréments)
- Cache des données clientes (Zustand)
- Pagination côté serveur

**PWA**:
- Service Worker pour offline
- Manifest pour installation progressive
- Cache stratégies: NetworkFirst pour API, CacheFirst pour assets
- Offline pages pour les modules principaux

**Monitoring** (à implémenter):
- Error tracking avec Sentry
- Performance monitoring
- Analytics (Plausible ou Matomo pour la confidentialité)

---

## ✅ Points forts

### 1. Fonctionnalités complètes et cohérentes

L'application couvre l'ensemble du cycle de gestion d'une entreprise :
- ✅ **Facturation**: Devis, factures, avoirs, bons de commande, bons de livraison, acomptes
- ✅ **CRM**: Pipeline Kanban moderne avec gestion des opportunités et tâches
- ✅ **Contrats**: Gestion complète CDI/CDD/Autres conforme Code du travail 2026
- ✅ **Notes de frais**: OCR IA + catégorisation automatique
- ✅ **Agenda**: Calendrier interactif avec synchronisation Google
- ✅ **Clients**: Gestion complète avec statistiques
- ✅ **Produits**: Catalogue avec gestion des stocks

### 2. Design System professionnel et moderne

- ✅ **Glassmorphism cohérent**: `bg-white/70 backdrop-blur-xl` sur tous les modules
- ✅ **Effets 3D**: Perspective, rotation, elevation sur les cards
- ✅ **Animations fluides**: Spring physics, stagger children, smooth transitions
- ✅ **Icônes Lucide React**: Professionnelles, pas d'emojis
- ✅ **Gradients uniformes**: Palette cohérente sur tout le site
- ✅ **Responsive parfait**: Mobile-first avec breakpoints adaptés

### 3. Intégration IA pertinente et utile

L'IA résout de vrais problèmes métier :
- ✅ **OCR des justificatifs**: Extraction automatique des données (fournisseur, montant, TVA, date)
- ✅ **Catégorisation automatique**: Classification intelligente des dépenses
- ✅ **Analyse de template**: Création de templates personnalisés
- ✅ **Indicateurs visuels**: Feedback pendant traitement IA

### 4. Architecture solide et maintenable

- ✅ **RLS**: Sécurité des données au niveau base de données
- ✅ **Workspace isolation**: Multi-tenancy propre
- ✅ **API routes**: Structure claire et logique
- ✅ **TypeScript**: Sécurité des types sur tout le projet
- ✅ **Zustand**: State management léger et performant
- ✅ **Services métier**: Séparation des préoccupations

### 5. Conformité française native

- ✅ **Code du travail 2026**: Templates de contrats conformes
- ✅ **Export FEC**: Format comptable français standard
- ✅ **TVA intracommunautaire**: Validation et gestion
- ✅ **SIRET**: Validation automatique
- ✅ **Mentions légales**: RGPD, CGV, Politique de confidentialité

### 6. Expérience utilisateur soignée

- ✅ **Feedback visuel**: Toasts (Sonner), loaders, badges
- ✅ **Command Palette**: ⌘K pour recherche globale
- ✅ **Notifications**: Web push + in-app
- ✅ **Mode dark**: Classes prêtes, toggle à implémenter
- ✅ **Multi-workspaces**: Gestion de plusieurs entités

---

## ⚠️ Axes d'amélioration

### 1. Expérience utilisateur

| Priorité | Amélioration | Description | Statut |
|----------|-------------|-------------|--------|
| 🔴 Haute | Onboarding | Tour guidé pour les nouveaux utilisateurs | À faire |
| 🟠 Moyenne | Mode sombre | Toggle dark/light complet | Classes prêtes |
| 🟠 Moyenne | Raccourcis clavier | Support de keyboard shortcuts | À faire |
| 🟢 Faible | Sauvegarde auto | Indicateur "Sauvegardé..." visible | À faire |
| 🟢 Faible | Undo/Redo | Annulation des actions récentes | À faire |

### 2. Fonctionnalités

| Priorité | Amélioration | Description | Statut |
|----------|-------------|-------------|--------|
| 🟠 Moyenne | Relances automatiques | Système de relance par email (Resend) | À faire |
| 🟠 Moyenne | Statistiques avancées | Graphiques détaillés, export Excel | À faire |
| 🟢 Faible | Tags/Labels | Système de tags pour clients et factures | À faire |
| 🟢 Faible | Commentaires | Possibilité d'ajouter des commentaires sur factures | À faire |
| 🟢 Faible | Filtres avancés | Filtres personnalisables sauvegardables | À faire |

### 3. Technique

| Priorité | Amélioration | Description |
|----------|-------------|-------------|
| 🟠 Moyenne | Tests unitaires | Tests Jest/React Testing Library |
| 🟠 Moyenne | E2E tests | Tests Playwright/Cypress |
| 🟢 Faible | Monitoring | Sentry pour error tracking |
| 🟢 Faible | Analytics | Plausible ou Matomo |
| 🟢 Faible | Performance | Web Vitals optimization |

### 4. Contenu

| Priorité | Amélioration | Description |
|----------|-------------|-------------|
| 🟠 Moyenne | Documentation complète | Aide contextuelle sur chaque page |
| 🟠 Moyenne | Vidéos tutoriel | Courtes vidéos explicatives |
| 🟢 Faible | Blog | Blog avec astuces comptables |

---

## 📝 Conclusion

### Verdict global

**FacturmeWeb est une application SaaS complète et moderne**, avec une interface glassmorphism professionnelle et des animations fluides. Elle répond aux besoins fondamentaux de facturation, de gestion CRM et de gestion des contrats des freelances et petites entreprises françaises. L'ajout du module de gestion des contrats de travail conforme au Code du travail 2026 constitue un avantage concurrentiel majeur.

### Score global (sur 10) - 29 Avril 2026

| Critère | Score | Notes |
|---------|-------|-------|
| **Fonctionnalités** | 9/10 | Facturation + CRM + Contrats + Expenses + Agenda |
| **UI/UX** | 9/10 | Glassmorphism 3D + Animations fluides |
| **Code quality** | 8.5/10 | TypeScript + Services bien séparés + Zustand |
| **Performance** | 8/10 | Animations optimisées + PWA |
| **Sécurité** | 8/10 | RLS + Workspace isolation + Validation |
| **Documentation** | 7.5/10 | Fichiers CLAUDE.md + ANALYSE_COMPLETE_SITE.md |
| **Conformité FR** | 9/10 | Code du travail 2026 + FEC + TVA |
| **Moyenne** | **8.3/10** | |

### Améliorations majeures (Avril 2026)

1. ✅ **CRM refait**: Design glassmorphism avec cartes 3D, menus déroulants magnifiques
2. ✅ **Notes de frais refaites**: OCR IA, catégorisation, glassmorphism
3. ✅ **Contrats**: Module complet avec CDI/CDD/Autres conformes 2026
4. ✅ **Navigation réorganisée**: CRM et Notes de frais dans nav principale
5. ✅ **Icônes professionnelles**: Lucide React (pas d'emojis)
6. ✅ **Animations**: Framer Motion avec spring physics
7. ✅ **Services métier**: Architecture propre et maintenable
8. ✅ **Documentation**: Fichiers de projet à jour

### Recommandations prioritaires

1. **Onboarding guidé** pour les nouveaux utilisateurs
2. **Compléter le mode sombre** (toggle fonctionnel)
3. **Module de relances automatiques** via Resend
4. **Tests automatisés** (unitaires + E2E avec Playwright)
5. **Monitoring** avec Sentry pour error tracking

### Pistes de développement

1. **Module Analyse OCR** (interface publique)
2. **Connexions API** (gestion des intégrations)
3. **Comptabilité avancée** (FEC amélioré)
4. **Application mobile native** (React Native)
5. **Multi-devises** avancé avec conversion automatique
6. **Gestion des équipes** avec permissions granulaires
7. **API publique** pour intégrations tierces

### Stack technique 2026

```
Frontend:  Next.js 15 + React 19 + TypeScript 5
UI:         Tailwind CSS 3 + Framer Motion 12 + Radix UI
State:      Zustand 5
Backend:    Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Email:      Resend (migré de Brevo)
Paiements:  Stripe Connect + SumUp
IA:         Groq (OCR + catégorisation) + OpenAI
PDF:        @react-pdf/renderer + docx
Icons:      Lucide React (professionnels, pas d'emojis)
```

---

*Analyse complète réalisée par Claude Code*  
*Date: 29 Avril 2026*  
*Version: 4.0.0*
