# ANALYSE COMPLÈTE — Facturme Web (ESPOIR)
> Dernière mise à jour : 03/05/2026  
> Analysé par : Claude Sonnet 4.6

---

## TABLE DES MATIÈRES

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Plans tarifaires & fonctionnalités](#4-plans-tarifaires--fonctionnalités)
5. [Pages & routes](#5-pages--routes)
6. [Fonctionnalités détaillées](#6-fonctionnalités-détaillées)
7. [Base de données — schéma complet](#7-base-de-données--schéma-complet)
8. [API Routes — liste complète](#8-api-routes--liste-complète)
9. [Authentification & sécurité](#9-authentification--sécurité)
10. [Intégrations tierces](#10-intégrations-tierces)
11. [Intelligence Artificielle](#11-intelligence-artificielle)
12. [Signature électronique eIDAS](#12-signature-électronique-eidas)
13. [Conformité légale française](#13-conformité-légale-française)
14. [Composants UI principaux](#14-composants-ui-principaux)
15. [Variables d'environnement](#15-variables-denvironnement)
16. [Flux métier clés](#16-flux-métier-clés)
17. [Internationalisation](#17-internationalisation)
18. [PWA & Notifications](#18-pwa--notifications)

---

## 1. PRÉSENTATION GÉNÉRALE

**Nom du produit** : Facturme (factu.me)  
**Type** : SaaS B2B — Logiciel de facturation et gestion d'entreprise  
**Cible** : Freelances, TPE, PME françaises  
**URL production** : https://factu.me  
**Domaine** : Facturation, gestion clients, contrats de travail, CRM, conformité fiscale française

### Résumé

Facturme est un SaaS tout-en-un conçu pour les entrepreneurs français. Il couvre :
- La **facturation complète** (factures, devis, avoirs, acomptes, bons de commande, bons de livraison)
- La **gestion clients** avec CRM intégré
- Les **contrats de travail** (CDI, CDD, stages, alternance, freelance…) avec conformité droit français
- Les **paiements en ligne** (Stripe, SumUp)
- La **signature électronique** conforme eIDAS (niveau Avancé gratuit)
- La **conformité 2026** (Factur-X EN 16931, export FEC, PDP)
- L'**intelligence artificielle** (génération de factures, OCR, assistant contrats LIA)

---

## 2. STACK TECHNIQUE

### Frontend
| Technologie | Version | Usage |
|---|---|---|
| Next.js | 15.5.14 | Framework React (App Router) |
| React | 19.0.0 | UI |
| TypeScript | 5.x | Typage statique |
| Tailwind CSS | 3.4.17 | Styles |
| Framer Motion | 12.38.0 | Animations |
| Recharts | 2.15.3 | Graphiques dashboard |
| Lucide React | 0.511.0 | Icônes |
| Iconify React | 6.0.2 | Icônes étendues (1000+) |
| Radix UI | latest | Composants headless accessibles |
| Zustand | 5.0.4 | State management global |
| i18next | 24.2.3 | Internationalisation (FR/EN) |
| Sonner | 2.0.7 | Toasts/notifications UI |
| class-variance-authority | 0.7.1 | Variants CSS composants |

### Backend & API
| Technologie | Version | Usage |
|---|---|---|
| Next.js API Routes | 15.5.14 | Endpoints REST (Edge + Node) |
| Supabase JS | 2.50.0 | Client DB + Auth |
| @supabase/ssr | 0.6.1 | Auth SSR Next.js |
| Stripe | 17.7.0 | Paiements & abonnements |

### Base de données
| Technologie | Usage |
|---|---|
| Supabase (PostgreSQL 15+) | BDD principale |
| Row Level Security (RLS) | Isolation données par utilisateur |
| Webhooks Supabase | Événements temps réel |

### PDF & Documents
| Bibliothèque | Version | Usage |
|---|---|---|
| @react-pdf/renderer | 4.5.1 | Génération PDF côté client (React) |
| pdf-lib | 1.17.1 | Manipulation PDF (signature, merge) |
| pdf-parse | 1.1.1 | Extraction texte depuis PDF |
| html-pdf-node | 1.0.8 | Rendu HTML → PDF serveur |
| docx | 9.6.1 | Export DOCX (contrats) |
| jszip | 3.10.1 | Archives ZIP multi-documents |

### IA & LLM
| Service | Usage |
|---|---|
| OpenRouter API | Modèles gratuits (Llama 3.1, Mistral) — parsing texte→facture |
| Groq SDK 0.13.0 | Whisper — transcription vocale |
| OpenAI SDK 4.100.0 | Client compatible OpenRouter |
| LIA Service | Assistant IA custom — contrats & bulletins de paie |

### Email & Notifications
| Service | Usage |
|---|---|
| Resend 6.12.2 | Envoi emails transactionnels |
| @react-email/render 2.0.8 | Templates HTML emails |
| web-push 3.6.7 | Notifications push (PWA) |
| Web Push API | Notifications navigateur |

### Utilitaires
| Bibliothèque | Version | Usage |
|---|---|---|
| date-fns | 4.1.0 | Manipulation dates |
| uuid | 11.1.0 | Génération UUID |

---

## 3. STRUCTURE DU PROJET

```
FacturmeWeb-ESPOIR/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Routes protégées (auth requise)
│   │   ├── dashboard/            # Tableau de bord
│   │   ├── invoices/             # Factures
│   │   ├── documents/            # Documents variés
│   │   │   ├── factures/
│   │   │   ├── devis/
│   │   │   ├── avoirs/
│   │   │   ├── acomptes/
│   │   │   ├── commandes/
│   │   │   └── livraisons/
│   │   ├── clients/              # Gestion clients
│   │   ├── crm/                  # Pipeline CRM + tâches
│   │   ├── contracts/            # Contrats de travail
│   │   │   ├── cdi/
│   │   │   ├── cdd/
│   │   │   ├── other/
│   │   │   ├── list/
│   │   │   └── reports/
│   │   ├── products/             # Catalogue produits/services
│   │   ├── recurring/            # Factures récurrentes
│   │   ├── expenses/             # Frais & dépenses
│   │   ├── calendar/             # Calendrier + sync Google
│   │   ├── settings/             # Paramètres compte
│   │   ├── help/                 # Aide (Factur-X, PDP)
│   │   ├── notifications/        # Centre notifications
│   │   ├── paywall/              # Écran upgrade plan
│   │   ├── trial/                # Écran essai gratuit
│   │   └── offline/              # Mode offline (capture, CRM, dépenses)
│   ├── (auth)/                   # Routes d'authentification
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/
│   ├── (onboarding)/             # Flux onboarding
│   │   ├── language/
│   │   ├── company/
│   │   ├── address/
│   │   ├── template/
│   │   └── done/
│   ├── api/                      # API Routes Next.js
│   │   ├── stripe/
│   │   ├── sumup/
│   │   ├── ai/
│   │   ├── contracts/
│   │   ├── invoices/
│   │   ├── documents/
│   │   ├── google/
│   │   ├── export/
│   │   ├── import/
│   │   ├── push/
│   │   ├── reminders/
│   │   ├── recurring/
│   │   ├── payslips/
│   │   ├── eidas/
│   │   └── webhooks/
│   ├── share/[invoiceId]/        # Partage public facture
│   ├── client/[token]/           # Portail client (paiement)
│   ├── sign/[token]/             # Signature contrat (client)
│   ├── sign-quote/[token]/       # Signature devis (client)
│   ├── verify/[signatureId]/     # Vérification signature eIDAS
│   ├── demo/                     # Mode démo (sans compte)
│   ├── pricing/                  # Page tarifs publique
│   ├── legal/                    # Pages légales
│   │   ├── mentions-legales/
│   │   ├── confidentialite/
│   │   └── cgu/
│   └── page.tsx                  # Landing page
│
├── components/                   # Composants React
│   ├── ui/                       # Design system
│   ├── layout/                   # Navbar, sidebar, footer
│   ├── invoices/                 # Composants facturation
│   ├── clients/                  # Composants clients
│   ├── contracts/                # Composants contrats
│   ├── calendar/                 # Composants calendrier
│   ├── crm/                      # Composants CRM
│   ├── emails/                   # Templates emails
│   ├── onboarding/               # Wizard onboarding
│   ├── admin/                    # Dashboards admin
│   ├── labor-law/                # Composants droit du travail
│   └── pdf-document.tsx          # Composant PDF factures
│
├── lib/                          # Logique métier
├── hooks/                        # Hooks React personnalisés
├── stores/                       # Stores Zustand
├── types/                        # Types TypeScript
├── supabase/                     # Migrations DB
│   └── migrations/               # 029 migrations SQL
├── i18n/                         # Fichiers traduction FR/EN
├── public/                       # Assets statiques
└── scripts/                      # Scripts utilitaires
```

---

## 4. PLANS TARIFAIRES & FONCTIONNALITÉS

### Vue d'ensemble

| Plan | Prix mensuel | Prix annuel | Économie annuelle |
|---|---|---|---|
| Découverte | **Gratuit** | Gratuit | — |
| Solo | **14,99€/mois** | 12€/mois | 36€/an |
| Pro | **29,99€/mois** | 24€/mois | 72€/an |
| Business | **59,99€/mois** | 48€/mois | 144€/an |

> **Réduction annuelle : -20% sur tous les plans payants**  
> **Essai gratuit Business : 4 jours sans engagement (avec carte bancaire)**  
> **Garantie : Satisfait ou remboursé sous 30 jours**  
> **Sans engagement, annulation en 1 clic**

---

### Plan DÉCOUVERTE — Gratuit (0€/mois)

**Description** : "L'essentiel pour tester l'outil."

| Fonctionnalité | Limite / Statut |
|---|---|
| Factures & Devis | **5 par mois** (limite stricte) |
| Clients enregistrés | **10 maximum** |
| Templates PDF | **1 template basique** |
| Envoi par email | ❌ Non inclus |
| Lien de paiement en ligne | ❌ Non inclus |
| Signature électronique | ❌ Non inclus |
| Contrats de travail | ❌ Non inclus |
| CRM & Pipeline | ❌ Non inclus |
| Export FEC | ❌ Non inclus |
| IA & Automatisation | ❌ Non inclus |
| Factures récurrentes | ❌ Non inclus |
| Multi-workspaces | ❌ Non inclus |

**Paywall** : La limite mensuelle est trackée dans `profiles.monthly_invoice_count` + `profiles.invoice_month`. Réinitialisation automatique chaque mois. Au-delà de 5 factures → redirection vers `/paywall`.

---

### Plan SOLO — 14,99€/mois (12€/mois en annuel)

**Description** : "Idéal pour démarrer — Pour les freelances qui veulent être pros et sereins."

| Fonctionnalité | Limite / Statut |
|---|---|
| Factures & Devis | ✅ **Illimités** |
| Clients | ✅ **Illimités** |
| Templates PDF | ✅ **6 templates professionnels** |
| Personnalisation (logo & couleurs) | ✅ Inclus |
| Envoi par email | ✅ Inclus (via Resend) |
| Paiement en ligne | ✅ Stripe + SumUp |
| Relances automatiques | ✅ Inclus |
| Voice-to-invoice | ✅ Transcription vocale (Groq Whisper) |
| Signature électronique eIDAS | ✅ Niveau Avancé (AdES) gratuit |
| Modifier / Supprimer factures | ✅ Inclus |
| Workspaces | 1 workspace |
| Contrats de travail | ❌ Non inclus |
| IA avancée & Automatisation | ❌ Non inclus |
| Pipeline CRM | ❌ Non inclus |
| Export FEC | ❌ Non inclus |
| Factures récurrentes | ❌ Non inclus |
| Templates personnalisés | ❌ Non inclus |
| Multi-workspaces | ❌ Non inclus |
| API & Webhooks | ❌ Non inclus |

---

### Plan PRO — 29,99€/mois (24€/mois en annuel)

**Description** : "Pour grandir"  
**Badge** : Populaire

| Fonctionnalité | Limite / Statut |
|---|---|
| **Tout ce qui est dans Solo** | ✅ Inclus |
| Contrats de travail | ✅ **CDI, CDD + signatures électroniques** |
| Factures électroniques | ✅ Inclus |
| IA & Relances automatiques | ✅ Inclus |
| Export FEC (comptabilité) | ✅ Inclus |
| Factur-X (conforme réforme 2026) | ✅ Inclus |
| Pipeline CRM | ✅ Inclus |
| Notes de frais | ✅ Inclus |
| Factures récurrentes | ✅ Inclus |
| Signature client (devis) | ✅ Inclus |
| Templates personnalisés | ✅ Inclus |
| Workspaces | Jusqu'à **3 workspaces** |
| Multi-espaces | ❌ Non inclus (Pro → max 3) |
| API & Webhooks | ❌ Non inclus |

---

### Plan BUSINESS — 59,99€/mois (48€/mois en annuel)

**Description** : "Accès total + Outils avancés"  
**Badge** : Recommandé

| Fonctionnalité | Limite / Statut |
|---|---|
| **Tout ce qui est dans Pro** | ✅ Inclus |
| Outils avancés IA (OCR, Analyse) | ✅ **Dext-like OCR reçus** |
| Factur-X + Transmission PDP | ✅ Inclus (EDI facturation B2B) |
| Workspaces | ✅ **10 espaces de travail** |
| API & Webhooks | ✅ Avancés |
| Multi-utilisateurs | ✅ Inclus |
| Rapports avancés | ✅ Inclus |
| Support prioritaire | ✅ Inclus |
| Onboarding dédié | ✅ Inclus |
| SLA garanti | ✅ Inclus |

---

### Essai gratuit (Trial — 4 jours)

| Détail | Valeur |
|---|---|
| Durée | **4 jours** |
| Plan inclus | Accès **complet Business** |
| Engagement | **Aucun** |
| Méthode | Enregistrement carte (SetupIntent Stripe, pas de débit immédiat) |
| Déclencheur | `setup_intent.succeeded` webhook Stripe |
| Expiration | Retour automatique en plan Découverte (free) |
| Accès | Toutes fonctionnalités Business sans restriction |
| Activation | Via page `/trial` ou `/?plan=business&trial=true` |

---

### Résumé des limites par plan

| Capacité | Découverte | Solo | Pro | Business |
|---|---|---|---|---|
| Factures/mois | 5 | ∞ | ∞ | ∞ |
| Clients | 10 | ∞ | ∞ | ∞ |
| Templates | 1 | 6 | Tous | Tous |
| Workspaces | 1 | 1 | 3 | 10 |
| Email | ❌ | ✅ | ✅ | ✅ |
| Paiement en ligne | ❌ | ✅ | ✅ | ✅ |
| Relances auto | ❌ | ✅ | ✅ | ✅ |
| Voice-to-invoice | ❌ | ✅ | ✅ | ✅ |
| Signature eIDAS | ❌ | ✅ | ✅ | ✅ |
| Contrats CDI/CDD | ❌ | ❌ | ✅ | ✅ |
| CRM & Pipeline | ❌ | ❌ | ✅ | ✅ |
| Factures récurrentes | ❌ | ❌ | ✅ | ✅ |
| Export FEC | ❌ | ❌ | ✅ | ✅ |
| Factur-X | ❌ | ❌ | ✅ | ✅ |
| OCR IA (Dext-like) | ❌ | ❌ | ❌ | ✅ |
| PDP (EDI) | ❌ | ❌ | ❌ | ✅ |
| API & Webhooks | ❌ | ❌ | ❌ | ✅ |
| Support prioritaire | ❌ | ❌ | ❌ | ✅ |
| SLA garanti | ❌ | ❌ | ❌ | ✅ |

---

## 5. PAGES & ROUTES

### Routes publiques (sans authentification)

| Route | Description |
|---|---|
| `/` | Landing page (présentation, pricing, CTA) |
| `/pricing` | Page tarification publique |
| `/demo` | Mode démo (exploration sans compte) |
| `/share/[invoiceId]` | Partage public d'une facture (lien envoyé au client) |
| `/client/[token]` | Portail client — paiement en ligne sécurisé |
| `/sign/[token]` | Signature électronique d'un contrat (côté client/salarié) |
| `/sign-quote/[token]` | Signature électronique d'un devis (côté client) |
| `/verify/[signatureId]` | Vérification publique d'une signature eIDAS |
| `/legal/mentions-legales` | Mentions légales |
| `/legal/confidentialite` | Politique de confidentialité / RGPD |
| `/legal/cgu` | Conditions Générales d'Utilisation |

### Routes d'authentification

| Route | Description |
|---|---|
| `/login` | Connexion (email + mot de passe, Google OAuth) |
| `/register` | Inscription nouveau compte |
| `/auth/callback` | Callback OAuth Google |

### Routes d'onboarding (premier lancement)

| Route | Description |
|---|---|
| `/onboarding/language` | Choix de la langue (FR/EN) |
| `/onboarding/company` | Informations entreprise (nom, SIRET, statut légal) |
| `/onboarding/address` | Adresse professionnelle |
| `/onboarding/template` | Choix du template facture |
| `/onboarding/done` | Fin d'onboarding → dashboard |

### Routes de l'application (protégées)

#### Dashboard & Facturation

| Route | Description |
|---|---|
| `/dashboard` | Vue d'ensemble : MRR, factures récentes, statistiques clients |
| `/invoices` | Liste de toutes les factures |
| `/invoices/new` | Créer une nouvelle facture |
| `/invoices/[id]` | Détail d'une facture |
| `/invoices/[id]/edit` | Modifier une facture |

#### Documents métiers

| Route | Description |
|---|---|
| `/documents/factures` | Liste des factures (vue documents) |
| `/documents/factures/new` | Nouvelle facture |
| `/documents/devis` | Liste des devis |
| `/documents/devis/new` | Nouveau devis |
| `/documents/avoirs` | Liste des avoirs (notes de crédit) |
| `/documents/avoirs/new` | Nouvel avoir |
| `/documents/acomptes` | Liste des acomptes |
| `/documents/acomptes/new` | Nouvel acompte |
| `/documents/commandes` | Bons de commande |
| `/documents/commandes/new` | Nouveau bon de commande |
| `/documents/livraisons` | Bons de livraison |
| `/documents/livraisons/new` | Nouveau bon de livraison |
| `/documents/factures/recurring` | Factures récurrentes |

#### Clients & CRM

| Route | Description |
|---|---|
| `/clients` | Liste clients avec filtres, recherche, tags |
| `/clients/[id]` | Fiche client détaillée (historique, notes, factures) |
| `/crm` | Pipeline de ventes, tâches, analytics CRM |

#### Contrats de travail

| Route | Description |
|---|---|
| `/contracts` | Page d'accueil contrats |
| `/contracts/cdi` | Créer un CDI |
| `/contracts/cdd` | Créer un CDD |
| `/contracts/other` | Créer autre contrat (stage, alternance, freelance…) |
| `/contracts/new/cdi` | Formulaire nouveau CDI |
| `/contracts/new/cdd` | Formulaire nouveau CDD |
| `/contracts/new/other` | Formulaire autre type |
| `/contracts/list/cdi` | Liste CDI |
| `/contracts/list/cdd` | Liste CDD |
| `/contracts/list/other` | Liste autres contrats |
| `/contracts/[id]` | Détail d'un contrat |
| `/contracts/[id]/edit` | Modifier un contrat |
| `/contracts/reports` | Rapports et statistiques contrats |

#### Autres modules

| Route | Description |
|---|---|
| `/products` | Catalogue produits & services avec prix |
| `/recurring` | Gestion factures récurrentes (fréquence, clients) |
| `/expenses` | Notes de frais, dépenses professionnelles |
| `/calendar` | Calendrier événements + sync Google Calendar |
| `/settings` | Paramètres : profil, logo, intégrations, notifications, paiements |
| `/help` | Centre d'aide |
| `/help/factur-x` | Guide Factur-X et réforme 2026 |
| `/help/pdp` | Guide PDP (Portail De Publicité) |
| `/notifications` | Centre de notifications |
| `/paywall` | Écran d'upgrade (limitation plan gratuit atteinte) |
| `/trial` | Écran démarrage essai gratuit Business |
| `/offline/*` | Mode offline : capture, CRM, dépenses (PWA) |

---

## 6. FONCTIONNALITÉS DÉTAILLÉES

### 6.1 Facturation & Documents

**Types de documents supportés :**
- Factures
- Devis
- Avoirs (notes de crédit)
- Acomptes
- Bons de commande
- Bons de livraison

**Fonctionnalités communes :**
- Numérotation automatique configurable (préfixe personnalisable, ex: `FAC-2026-001`)
- Templates HTML/PDF professionnels (6 templates Solo, illimité Pro/Business)
- Sélection TVA multi-taux : 0%, 5,5%, 20%
- Remises (en % ou en montant)
- Acomptes et paiements partiels
- Conditions de paiement personnalisables
- Notes et commentaires internes
- Pièces jointes (photos, PDF)
- Statuts : Brouillon, Envoyé, Payé, Retard, Annulé, Partiel
- Envoi par email avec PDF joint
- Lien de partage public (URL unique)
- Téléchargement PDF
- Signature électronique eIDAS intégrée
- QR code de paiement

**Factures récurrentes :**
- Fréquences : hebdomadaire, mensuelle, trimestrielle, annuelle
- Auto-envoi par email configurable
- Prochaine date de génération trackée
- Désactivation/réactivation

**Gestion des statuts :**
- Changement manuel ou automatique (webhook Stripe/SumUp)
- Marquage partiel (`amount_paid` vs `total`)
- Historique des changements de statut

### 6.2 Paiements en ligne

**Stripe (principal) :**
- Checkout Stripe intégré (Elements natifs)
- Lien de paiement persistant (mémorisé sur la facture)
- Paiement par carte bancaire
- Webhooks automatiques → mise à jour statut facture
- Stripe Customer Portal (gestion abonnement client)
- Stripe Connect Standard pour marketplace (comptes séparés commerçants)
- Prélèvement SEPA (mandat)
- Prorata sur changement de plan

**SumUp :**
- OAuth 2.0 (Authorization Code Flow)
- Création checkouts via API SumUp
- Auto-refresh token avant expiration
- Webhooks paiements confirmés → statut facture

**Portail client :**
- URL unique `/client/[token]` pour chaque facture
- Paiement sans compte requis
- Sécurisé par token JWT

### 6.3 Gestion clients

**Fonctionnalités :**
- Fiche client complète (nom, email, téléphone, SIRET, TVA intracommunautaire, adresse)
- Historique de toutes les factures par client
- Notes internes (texte libre)
- Tags de segmentation (tableau `TEXT[]`)
- Import/Export CSV
- Champ SEPA (IBAN, mandat)
- Logo client
- Statistiques client (chiffre d'affaires, impayés)
- Lien Stripe Customer (Customer Portal)

### 6.4 CRM & Pipeline commercial

**Fonctionnalités :**
- Pipeline de ventes avec étapes personnalisées
- Tâches assignables avec dates d'échéance
- Historique des interactions client
- Analytics : taux de conversion, valeur pipeline
- Notes d'appel et suivi
- Vue Kanban ou liste
- Filtres avancés
- Accessible depuis le plan Pro/Business

### 6.5 Contrats de travail

**Types de contrats :**

| Type | Sous-types disponibles |
|---|---|
| CDI | Standard, Cadre, Télétravail |
| CDD | Remplacement, Accroissement activité, Saisonnier |
| Stage | Convention stage |
| Apprentissage | Contrat apprentissage (alternance) |
| Professionnalisation | Contrat pro (alternance) |
| Intérim | Mission intérimaire |
| Portage salarial | Contrat de portage |
| Freelance | Contrat de prestation |

**Fonctionnalités contrats :**
- Génération HTML automatique conforme droit français
- Champs employeur et salarié complets
- Clauses optionnelles : Période d'essai, Non-concurrence, Mobilité géographique
- Convention collective (IDCC intégré avec clauses spécifiques)
- SMIC automatique (API INSEE avec cache/fallback 2026)
- Calcul cotisations sociales
- Bulletins de paie automatiques (React PDF)
- Avenants contractuels
- Renouvellements (CDD → CDI, prorogation CDD)
- Workflow de signature bilatéral (employeur + salarié)
- Statuts : Brouillon → En attente signature → Signé → Actif → Terminé
- Pièces jointes (diplômes, justificatifs d'identité)
- Commentaires internes
- Versions et historique des modifications
- Notifications d'expiration (CDD)
- Export PDF + DOCX
- Rapports consolidés

**Conformité légale :**
- Conforme Code du Travail français
- SMIC vérifié via INSEE (fallback 2026 : 1 801,80€ brut)
- Conventions collectives intégrées (500+ clauses)
- Calcul charges patronales et salariales
- FEC compatible (export comptable)

### 6.6 Produits & Catalogue

- Catalogue produits/services réutilisables
- Prix unitaire HT configurable
- Taux TVA par produit/service
- Catégories
- Insertion en 1 clic dans une facture
- Description détaillée
- Gestion unités

### 6.7 Frais & Dépenses

- Saisie manuelle des dépenses professionnelles
- Catégorisation automatique par IA
- Capture de reçus avec OCR (plan Business)
- Liaison avec Google Calendar
- Synchronisation marchands (Amazon Business, Orange Business, Uber)
- Export comptable

### 6.8 Calendrier

- Vue mensuelle/hebdomadaire des événements
- Création d'événements manuels
- Synchronisation bidirectionnelle Google Calendar
- Liaison factures/devis avec rendez-vous
- Mode offline (capture PWA)

### 6.9 Notifications

- Centre de notifications in-app
- Notifications push PWA (navigateur)
- Alertes : facture impayée, rappel de paiement, signature reçue, expiration contrat
- Configuration des rappels automatiques

### 6.10 Multi-workspaces

- Séparation complète des données par workspace
- Invitations membres
- Workspaces illimités (Business) / 3 (Pro) / 1 (Solo/Gratuit)
- Chaque workspace a ses propres clients, factures, contrats

### 6.11 Export & Conformité

| Export | Description |
|---|---|
| PDF standard | Factures, devis, contrats |
| Factur-X (PDF/XML) | Format EN 16931 — réforme facturation électronique 2026 |
| FEC | Fichier d'Échanges Comptable (DGFiP) |
| DOCX | Contrats de travail en Word |
| ZIP | Export en lot (batch) |
| RGPD | Export complet données utilisateur |
| CSV | Import/export clients |

---

## 7. BASE DE DONNÉES — SCHÉMA COMPLET

### Table `profiles`

```sql
id                              UUID (PK → auth.users)
email                           TEXT
company_name                    TEXT
first_name                      TEXT
last_name                       TEXT
siret                           TEXT
address                         TEXT
city                            TEXT
postal_code                     TEXT
country                         TEXT
phone                           TEXT
vat_number                      TEXT
logo_url                        TEXT
template_id                     TEXT
accent_color                    TEXT
legal_status                    TEXT
subscription_tier               TEXT ('free'|'trial'|'solo'|'pro'|'business')
invoice_count                   INTEGER (total cumulé)
monthly_invoice_count           INTEGER (ce mois-ci)
invoice_month                   TEXT (format YYYY-MM)
invoice_prefix                  TEXT
currency                        TEXT (défaut: EUR)
language                        TEXT (défaut: fr)
onboarding_done                 BOOLEAN
custom_template_html            TEXT
stripe_customer_id              TEXT
stripe_subscription_id          TEXT
stripe_connect_account_id       TEXT
stripe_connect_access_token     TEXT
stripe_connect_refresh_token    TEXT
stripe_connect_token_expires_at TIMESTAMPTZ
stripe_connect_onboarding_completed BOOLEAN
sumup_access_token              TEXT
sumup_refresh_token             TEXT
sumup_token_expires_at          TIMESTAMPTZ
sumup_merchant_id               TEXT
signature_url                   TEXT
trial_start_date                TIMESTAMPTZ
trial_end_date                  TIMESTAMPTZ
is_trial_active                 BOOLEAN
web_push_subscription           JSONB
sector                          TEXT
bank_name                       TEXT
iban                            TEXT
bic                             TEXT
payment_terms                   TEXT
legal_mention                   TEXT
custom_payment_terms            TEXT
website                         TEXT
```

**RLS** : SELECT et UPDATE uniquement sur son propre profil (`auth.uid() = id`)

---

### Table `invoices`

```sql
id                         UUID (PK, gen_random_uuid())
user_id                    UUID (FK → auth.users)
client_id                  UUID (FK → clients, ON DELETE SET NULL)
client_name_override       TEXT
number                     TEXT (ex: FAC-2026-001)
document_type              TEXT ('invoice'|'quote'|'credit_note'|'deposit'|'order'|'delivery')
status                     TEXT ('draft'|'sent'|'paid'|'overdue'|'partial'|'cancelled')
issue_date                 DATE
due_date                   DATE
items                      JSONB (lignes facture: [{ description, quantity, unit_price, vat_rate, total }])
subtotal                   DECIMAL
vat_amount                 DECIMAL
total                      DECIMAL
discount_percent           DECIMAL
discount_amount            DECIMAL
notes                      TEXT
pdf_url                    TEXT
payment_link               TEXT
payment_method             TEXT
stripe_payment_url         TEXT
stripe_payment_link_id     TEXT
stripe_payment_link_url    TEXT
sumup_checkout_id          TEXT
amount_paid                DECIMAL (paiements partiels)
voice_transcript           TEXT (transcription vocale originale)
linked_invoice_id          UUID (acompte → facture liée)
sent_at                    TIMESTAMPTZ
paid_at                    TIMESTAMPTZ
client_signature_url       TEXT
signed_at                  TIMESTAMPTZ
signed_by                  TEXT
signed_ip                  TEXT
client_email               TEXT
client_phone               TEXT
client_address             TEXT
client_city                TEXT
client_postal_code         TEXT
client_siret               TEXT
client_vat_number          TEXT
payment_terms_id           TEXT
created_at                 TIMESTAMPTZ
updated_at                 TIMESTAMPTZ
```

**Index** : `(user_id)`, `(user_id, status)`, `(stripe_payment_link_id)`

---

### Table `clients`

```sql
id                    UUID (PK)
user_id               UUID (FK → auth.users)
name                  TEXT
email                 TEXT
phone                 TEXT
siret                 TEXT
address               TEXT
city                  TEXT
postal_code           TEXT
country               TEXT
vat_number            TEXT
notes                 TEXT
tags                  TEXT[]
website               TEXT
logo_url              TEXT
stripe_customer_id    TEXT
stripe_sepa_mandate_id TEXT
sepa_iban_last4       TEXT
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

---

### Table `contracts`

```sql
id                      UUID (PK)
user_id                 UUID (FK → auth.users)
contract_number         TEXT
contract_type           TEXT ('cdi'|'cdd'|'other')
document_status         TEXT ('draft'|'pending_signature'|'signed'|'active'|'ended'|'cancelled')

-- Informations salarié
employee_first_name     TEXT
employee_last_name      TEXT
employee_address        TEXT
employee_postal_code    TEXT
employee_city           TEXT
employee_email          TEXT
employee_phone          TEXT
employee_birth_date     DATE
employee_nationality    TEXT

-- Informations employeur
company_name            TEXT
company_address         TEXT
company_postal_code     TEXT
company_city            TEXT
company_siret           TEXT
employer_name           TEXT
employer_title          TEXT

-- Poste & rémunération
job_title               TEXT
work_location           TEXT
work_schedule           TEXT
salary_amount           DECIMAL
salary_frequency        TEXT

-- Avantages
has_transport           BOOLEAN
has_meal                BOOLEAN
has_health              BOOLEAN
has_other               BOOLEAN
other_benefits          TEXT

-- Dates et conditions
contract_start_date     DATE
trial_period_days       INTEGER
contract_html           TEXT (HTML généré)

-- CDD spécifique
contract_end_date       DATE
collective_agreement    TEXT

-- Clauses optionnelles
probation_clause        BOOLEAN
non_compete_clause      BOOLEAN
mobility_clause         BOOLEAN

created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

---

### Table `recurring_invoices`

```sql
id                    UUID (PK)
user_id               UUID (FK → auth.users)
client_id             UUID (FK → clients)
client_name_override  TEXT
document_type         TEXT
frequency             TEXT ('weekly'|'monthly'|'quarterly'|'yearly')
items                 JSONB
notes                 TEXT
next_run_date         DATE
last_run_date         DATE
is_active             BOOLEAN
auto_send             BOOLEAN
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

---

### Table `products`

```sql
id            UUID (PK)
user_id       UUID (FK → auth.users)
name          TEXT
description   TEXT
unit_price    DECIMAL
vat_rate      DECIMAL
category      TEXT
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

---

### Table `eidas_signatures`

```sql
signature_id         UUID (PK)
document_id          UUID
document_type        TEXT ('invoice'|'contract'|'quote')
signer_name          TEXT
signer_email         TEXT
signature_url        TEXT
signed_at            TIMESTAMPTZ
ip_address           TEXT
user_agent           TEXT
document_hash        TEXT (SHA-256)
tsa_url              TEXT (freeTSA.org)
tsa_token            TEXT (RFC 3161)
eidas_level          TEXT ('simple'|'advanced'|'qualified')
eidas_compliant      BOOLEAN
eidas_regulation     TEXT (Règlement (UE) N° 910/2014)
verification_token   TEXT (token URL vérification publique)
created_at           TIMESTAMPTZ
```

---

### Autres tables (identifiées via migrations)

- `webhook_endpoints` — Endpoints webhooks personnalisés (URL, secret, événements)
- `crm_interactions` — Interactions CRM (appels, emails, notes)
- `crm_tasks` — Tâches CRM avec assignation et statut
- `contract_versions` — Historique versions contrats
- `contract_amendments` — Avenants contractuels
- `contract_attachments` — Pièces jointes contrats
- `expenses` — Dépenses professionnelles
- `payslips` — Bulletins de paie
- `notifications` — Notifications in-app
- `workspaces` — Espaces de travail
- `workspace_members` — Membres workspaces

---

## 8. API ROUTES — LISTE COMPLÈTE

### Authentification & Compte

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/account/delete` | Suppression RGPD complète du compte |

### Stripe — Abonnements

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/stripe/subscription` | Créer un abonnement (Checkout Stripe) |
| POST | `/api/stripe/trial-subscription` | Démarrer essai 4 jours (SetupIntent) |
| POST | `/api/stripe/change-subscription` | Changer de plan (avec prorata) |
| GET | `/api/stripe/change-subscription` | Calculer prorata changement |
| POST | `/api/stripe/portal` | Accès Customer Portal Stripe |
| POST | `/api/stripe/payment-link` | Créer lien paiement pour une facture |
| POST | `/api/stripe/connect` | OAuth Stripe Connect |
| GET | `/api/stripe/connect` | Statut Connect |
| POST | `/api/stripe/webhook` | Webhook Stripe (checkout, subscription, setup_intent) |
| POST | `/api/stripe/sepa` | Prélèvement SEPA |

### SumUp — Paiements

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sumup/oauth` | Générer URL OAuth SumUp |
| GET | `/api/sumup/oauth/callback` | Callback OAuth (échange code → tokens) |
| POST | `/api/sumup/payment-link` | Créer checkout SumUp |
| POST | `/api/sumup/connect` | Connexion directe compte SumUp |
| POST | `/api/sumup/webhook` | Webhook paiements SumUp |

### Factures & Envoi

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/send-invoice` | Envoyer facture par email (PDF joint) |
| GET | `/api/share/[invoiceId]` | Données partage public |
| POST | `/api/invoices/[id]/status` | Changer statut facture |
| POST | `/api/invoices/[id]/comments` | Ajouter commentaire |
| DELETE | `/api/invoices/[id]/comments/[commentId]` | Supprimer commentaire |
| POST | `/api/invoices/[id]/tags` | Gérer tags |
| POST | `/api/invoices/[id]/sign` | Signer avec eIDAS |

### Export & Import

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/download/facturx/[invoiceId]` | Télécharger PDF Factur-X |
| POST | `/api/export/facturx/[invoiceId]` | Export XML Factur-X |
| POST | `/api/export/facturx/batch` | Export batch Factur-X (ZIP) |
| POST | `/api/export/fec` | Export FEC comptable |
| POST | `/api/export/rgpd` | Export données RGPD utilisateur |
| POST | `/api/import/clients` | Import clients depuis CSV |

### Contrats de travail

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/contracts/pdf` | Génération PDF contrat |
| POST | `/api/contracts/docx` | Export DOCX |
| POST | `/api/contracts/html-pdf` | Rendu HTML → PDF |
| POST | `/api/contracts/export-pdf` | Export PDF (endpoint public) |
| POST | `/api/contracts/ai-suggest-clauses` | Suggestions IA de clauses |
| POST | `/api/contracts/version` | Sauvegarder version |
| POST | `/api/contracts/amendments` | Créer avenant |
| POST/PUT/DELETE | `/api/contracts/amendments/[id]` | CRUD avenants |
| POST | `/api/contracts/comments` | Commentaires contrat |
| POST | `/api/contracts/attachments` | Pièces jointes |
| POST | `/api/send-contract-email` | Envoyer contrat par email |
| POST | `/api/contract-signing/create` | Créer token de signature |
| POST | `/api/contract-signing/[token]/sign` | Signer le contrat |
| POST | `/api/contract-signing/[token]/cancel` | Annuler signature |
| POST | `/api/cron/contract-expirations` | Vérification expirations CDD |

### Intelligence Artificielle

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/ai/generate-invoice` | Texte naturel → facture structurée |
| POST | `/api/ai/analyze-document` | Analyse document (contenu, structure) |
| POST | `/api/ai/ocr-receipt` | OCR reçu → données structurées |
| POST | `/api/ai/categorize-expense` | Catégorisation dépense |
| POST | `/api/ai/analyze-invoice-template` | Analyse template HTML |
| POST | `/api/process-voice` | Transcription vocale → facture (Groq) |
| POST | `/api/process-voice-contract` | Transcription vocale → contrat |
| POST | `/api/process-voice-product` | Transcription vocale → produit |
| POST | `/api/process-voice-recurring` | Transcription vocale → facture récurrente |
| POST | `/api/process-text-contract` | Texte → contrat structuré |
| POST | `/api/analyze-contract-file` | Analyse fichier PDF contrat |
| POST | `/api/lia/contract-conformity` | Vérification conformité (LIA) |
| POST | `/api/lia/payslip-modify` | Modification bulletin de paie (LIA) |

### Récurrent & Rappels

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/recurring/send` | Envoyer factures récurrentes (cron) |
| POST | `/api/send-reminder` | Envoyer relance manuelle |
| POST/GET | `/api/reminders/config` | Configuration rappels automatiques |
| POST | `/api/reminders/send` | Envoyer rappel |
| POST | `/api/cron/reminders` | Cron job rappels automatiques |

### Intégrations

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/google/oauth` | URL OAuth Google Calendar |
| GET | `/api/google/callback` | Callback OAuth |
| POST | `/api/google/sync` | Sync événements calendrier |
| POST | `/api/google/disconnect` | Déconnecter Google Calendar |
| POST | `/api/merchant/oauth` | Connexion marchands (Amazon, Uber…) |
| POST | `/api/merchant/callback` | Callback OAuth marchands |
| POST | `/api/merchant/sync` | Sync dépenses marchands |
| POST | `/api/pdp/validate` | Validation PDP (EDI) |
| POST | `/api/pdp/send` | Envoi via PDP |

### Signature & Vérification

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/verify/[signatureId]` | Vérifier signature eIDAS (public) |
| POST | `/api/quote-signing/create` | Token signature devis |
| POST | `/api/quote-signing/[token]/sign` | Signer le devis |
| POST | `/api/eidas/verify/[signatureId]` | Vérification eIDAS détaillée |

### Divers

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/push/subscribe` | S'abonner aux notifications push |
| POST | `/api/push/send` | Envoyer notification push |
| POST | `/api/smic` | SMIC du jour (INSEE API) |
| POST | `/api/workspace/invite` | Inviter membre workspace |
| POST | `/api/workspaces` | Créer workspace |
| POST | `/api/payslips/pdf` | Génération bulletin de paie PDF |
| POST | `/api/payslips/html` | Rendu HTML bulletin de paie |
| POST | `/api/webhooks/trigger` | Déclencher événement webhook |
| POST | `/api/webhooks/bank-sync` | Sync bancaire |
| POST | `/api/webhooks/inbound-email` | Traiter email entrant |
| POST | `/api/subscription/trial-status` | Statut essai |
| POST | `/api/subscription/activate-trial` | Activer essai |

---

## 9. AUTHENTIFICATION & SÉCURITÉ

### Supabase Auth

- **Email + Mot de passe** : Inscription/connexion standard
- **Google OAuth 2.0** : Connexion avec compte Google (callback `/auth/callback`)
- **JWT** : Tokens d'accès à durée limitée + refresh tokens
- **Session persistante** : Cookies httpOnly SSR (via `@supabase/ssr`)
- **onAuthStateChange** : Sync en temps réel (Zustand `authStore`)
- **Logout** : Nettoyage localStorage + redirection `/login`

### Row Level Security (RLS)

Toutes les tables sensibles sont protégées :
```sql
-- Exemple policies
CREATE POLICY "users_own_data" ON invoices
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

Les utilisateurs ne peuvent accéder qu'à leurs propres données.

### Sécurité des intégrations

- **Tokens SumUp** : Stockés en base, auto-refresh avant expiration
- **Tokens Stripe Connect** : Stockés chiffrés
- **Webhooks Stripe** : Vérification signature `stripe.webhooks.constructEvent`
- **Tokens de signature** : UUID unique par document, usage unique
- **CORS** : Strict (origines autorisées uniquement)

### Conformité RGPD

- Export complet données utilisateur (`/api/export/rgpd`)
- Suppression compte en cascade (`/api/account/delete`)
- Pas de cookies tiers non consentis
- Données hébergées en EU (Supabase)

---

## 10. INTÉGRATIONS TIERCES

### Stripe

**Flux abonnement mensuel/annuel :**
1. Utilisateur clique sur un plan → `/api/stripe/subscription`
2. Création client Stripe + Checkout Session
3. Paiement via Stripe Elements intégrés
4. Webhook `checkout.session.completed` → mise à jour `subscription_tier`

**Flux essai 4 jours :**
1. Utilisateur choisit Business + essai → `/api/stripe/trial-subscription`
2. SetupIntent (enregistrement carte, pas de débit)
3. Webhook `setup_intent.succeeded` → activation trial (`is_trial_active = true`, `trial_end_date = +4 jours`)
4. Expiration automatique → `is_trial_active = false`

**Webhooks gérés :**
- `checkout.session.completed` → abonnement activé
- `customer.subscription.updated` → changement plan
- `customer.subscription.deleted` → résiliation
- `invoice.paid` → paiement facture client
- `setup_intent.succeeded` → activation trial

**Stripe Connect Standard :**
- OAuth pour connecter comptes commerçants
- Paiements directs vers le compte du commerçant
- Dashboard séparé pour chaque commerçant

### SumUp

**OAuth Flow :**
1. Redirection vers URL SumUp → autorisation
2. Callback → échange code → `access_token` + `refresh_token`
3. Tokens stockés dans `profiles` (chiffrés)
4. Auto-refresh : `getValidSumUpToken()` vérifie expiration avant chaque appel

**Checkouts :**
- `POST /checkouts` SumUp API avec Bearer token
- Retour URL checkout → redirigé client
- Webhook SumUp → statut facture mis à jour

### Google Calendar

- **OAuth 2.0** : Credentials Google Cloud Console
- **Sync bidirectionnelle** : Création, modification, suppression d'événements
- **Données synchronisées** : Rendez-vous, durée, participants, description
- **Déconnexion** : Révocation token + suppression de la base

### Resend (Emails)

- **Email de base** : contact@factu.me / Factu.me
- **Templates React Email** : Factures, relances, notifications, contrats
- **Transactionnel** : Envoi factures PDF, rappels paiement, invitations
- **Configuration** : `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`

### Marchands (Amazon Business, Uber, Orange…)

- OAuth par marchand
- Sync automatique des dépenses
- Import transactions → module Dépenses

### freeTSA.org (Horodatage eIDAS)

- **Standard** : RFC 3161 (Time-Stamp Protocol)
- **Gratuit** : Aucune configuration, aucun coût
- **Usage** : Horodatage certifié de chaque signature électronique
- **Validation** : Token TSA stocké dans `eidas_signatures.tsa_token`

### INSEE API (SMIC)

- Récupération SMIC mensuel en vigueur
- Cache local + fallback valeur 2026 (1 801,80€ brut)
- Utilisé pour validation contrats de travail

---

## 11. INTELLIGENCE ARTIFICIELLE

### Architecture IA

```
Utilisateur (texte/voix)
        ↓
OpenRouter API (Llama 3.1 8B :free — GRATUIT)
        ↓
Parsing structuré JSON → facture/contrat/produit
        ↓
Affichage dans l'éditeur
```

### Voice-to-Invoice (Solo, Pro, Business)

1. Utilisateur parle → microphone navigateur
2. Audio envoyé → `/api/process-voice`
3. Transcription Groq Whisper (ultra-rapide)
4. Texte → OpenRouter → JSON facture structuré
5. Facture pré-remplie dans l'éditeur
6. Transcription originale stockée dans `invoices.voice_transcript`

### Génération texte→facture (Solo, Pro, Business)

- Entrée : description en langage naturel (ex: "Facture 3 jours de développement web à 500€ HT pour la société Dupont")
- Sortie : facture JSON avec lignes, TVA, client détecté, montants
- Modèle : `meta-llama/llama-3.1-8b-instruct:free` (OpenRouter, gratuit)
- Modification incrémentale : l'IA détecte ajout/modification/suppression/remplacement

### OCR Reçus (Business uniquement)

- Upload photo/scan d'un reçu ou facture
- Extraction texte via IA
- Parsing automatique : montant, date, fournisseur, TVA
- Création note de frais pré-remplie

### LIA — Assistant IA Contrats (Pro/Business)

- Vérification conformité contrat vs droit du travail français
- Suggestions de clauses adaptées au secteur
- Aide rédaction bulletins de paie
- Modèles gratuits OpenRouter (Llama 3.1, Mistral 7B)
- Fallback automatique si modèle indisponible

### Analyse de documents

- Upload fichier PDF contrat
- Extraction et analyse du contenu
- Détection clauses manquantes ou problématiques

---

## 12. SIGNATURE ÉLECTRONIQUE eIDAS

### Niveaux eIDAS supportés

| Niveau | Coût | Fournisseur | Description |
|---|---|---|---|
| Avancé (AdES) | **Gratuit** | freeTSA.org | Signé + horodaté RFC 3161 |
| Qualifié (QES) | Payant (TQT) | Universign, Yousign, DocuSign Europe | Certificat qualifié eIDAS |

**Par défaut** : Niveau Avancé (AdES) — inclus dans tous les plans qui ont la signature.

### Flux de signature facture

1. Entreprise crée la facture
2. Clic "Envoyer pour signature" → création token unique
3. Email envoyé au client avec URL `/sign/[token]`
4. Client ouvre le lien → aperçu du document
5. Client signe → capture IP, user-agent, timestamp
6. Calcul hash SHA-256 du document
7. Appel freeTSA.org → Token TSA (RFC 3161)
8. Stockage dans `eidas_signatures` + mise à jour facture
9. URL de vérification publique générée : `/verify/[signatureId]`

### Flux de signature contrat (bilatéral)

1. Employeur génère le contrat HTML
2. Envoi au salarié → token `/sign-contract/[token]`
3. Salarié signe électroniquement
4. Contrat → statut `signed`
5. Notification employeur

### Vérification publique

- URL : `/verify/[signatureId]`
- Accessible sans compte
- Affiche : signataire, date, hash document, token TSA, niveau eIDAS
- Permet à n'importe quel tiers de vérifier l'authenticité

### Conformité

- Règlement (UE) N° 910/2014
- Conforme pour les contrats commerciaux et contrats de travail
- Archivage : Stockage Supabase Storage (`eidas_signatures/`)

---

## 13. CONFORMITÉ LÉGALE FRANÇAISE

### Factur-X (Réforme facturation électronique 2026)

| Aspect | Détail |
|---|---|
| Format | PDF + XML embarqué (ZUGFeRD / Factur-X) |
| Standard | EN 16931 (Norme européenne) |
| Profil | BASIC ou EN 16931 complet |
| Contenu XML | Document, parties, lignes, TVA, totaux, modes paiement |
| Validation | Compatible vérificateurs FNFE |
| Transmission | Email, portail client, PDP |
| Disponibilité | Plan Pro/Business |

### PDP (Portail De Publicité)

- Intégration annuaire PDP (Portail de Dématérialisation Partenaire)
- Envoi facturation B2B via EDI
- Validation conformité avant envoi
- Plan Business uniquement

### FEC (Fichier d'Échanges Comptable)

- Export conforme spécifications DGFiP
- Format TXT délimité
- Colonnes : JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib, Debit, Credit…
- Utilisé pour contrôle fiscal et import comptable
- Plan Pro/Business

### RGPD

- Export données utilisateur complet en JSON/ZIP
- Suppression compte en cascade (toutes les tables)
- Consentement cookies
- Données hébergées EU (Supabase)
- Politique de confidentialité complète

### Droit du travail

- SMIC actualisé (API INSEE + fallback 2026)
- Contrats conformes Code du Travail
- Calcul cotisations sociales automatique
- Conventions collectives (IDCC)
- Clauses légalement requises intégrées

---

## 14. COMPOSANTS UI PRINCIPAUX

### Design System (`components/ui/`)

| Composant | Usage |
|---|---|
| `BentoPricing` | Grille pricing (Découverte/Solo/Business) — landing page |
| `OptimizedPricingCard` | Carte plan animée avec particules — paywall |
| `EmbeddedCheckout` | Checkout Stripe intégré |
| `PaywallHeader` | En-tête page paywall |
| `KeyboardShortcutsHelp` | Aide raccourcis clavier |

### Layout

| Composant | Usage |
|---|---|
| `Sidebar` | Navigation principale (rétractable) |
| `Navbar` | Barre supérieure (profil, notifications, recherche) |
| `Footer` | Pied de page landing/légal |

### Facturation

| Composant | Usage |
|---|---|
| `InvoiceEditor` | Éditeur WYSIWYG de facture |
| `InvoicePreview` | Aperçu PDF en temps réel |
| `InvoiceList` | Tableau avec filtres, recherche, tri |
| `pdf-document.tsx` | Rendu PDF React (React PDF Renderer) |
| `ClientSelector` | Autocomplete sélection client |
| `ProductSelector` | Sélection produits catalogue |
| `TemplatePicker` | Grille de choix templates |

### Contrats

| Composant | Usage |
|---|---|
| `ContractForm` | Formulaire multi-étapes CDI/CDD/Autres |
| `ContractPreview` | Aperçu HTML contrat en temps réel |
| `ContractSigner` | Workflow signature bilatéral |
| `BulletinPaieRenderer` | Bulletin de paie (React PDF) |
| `ClausesLibrary` | Recherche et insertion clauses |

### Stores Zustand

| Store | Contenu |
|---|---|
| `authStore` | user, session, profile, loading |
| `dataStore` | invoices, clients, stats (cache) |
| `contractStore` | contrats (cache) |
| `crmStore` | tâches, interactions |
| `themeStore` | mode sombre/clair |
| `workspaceStore` | workspace courant |

### Hooks personnalisés

| Hook | Usage |
|---|---|
| `useSubscription()` | Tier, features disponibles, limites |
| `useAuthStore()` | Auth global |
| `useDataStore()` | Cache données factures/clients |
| `useContractRealtime()` | Sync Supabase temps réel contrats |
| `useInvoiceRealtime()` | Sync factures temps réel |
| `useLia()` | Interface assistant IA |
| `useGoogleCalendar()` | Sync calendrier |
| `useKeyboardShortcuts()` | Raccourcis clavier globaux |
| `useUndoRedo()` | Annuler/refaire dans l'éditeur |

---

## 15. VARIABLES D'ENVIRONNEMENT

### Obligatoires

```env
# Supabase (dashboard.supabase.com → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (dashboard.stripe.com → Développeurs → Clés API)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...

# IDs des prix Stripe (Products → Prix)
STRIPE_SOLO_MONTHLY_PRICE_ID=price_...
STRIPE_SOLO_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# IA - Groq (console.groq.com → API Keys)
GROQ_API_KEY=gsk_...

# IA - OpenRouter (openrouter.ai → Keys)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Email - Resend (resend.com → API Keys)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=contact@factu.me
RESEND_FROM_NAME=Factu.me

# Application
NEXT_PUBLIC_APP_URL=https://factu.me

# Web Push PWA (générer avec: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:contact@factu.me
```

### Optionnelles

```env
# Google Calendar (console.cloud.google.com → Credentials)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Chorus Pro (facturation secteur public)
# CHORUS_PRO_CLIENT_ID=
# CHORUS_PRO_CLIENT_SECRET=
# CHORUS_PRO_LOGIN=
# CHORUS_PRO_PASSWORD=
```

---

## 16. FLUX MÉTIER CLÉS

### Flux : Création et paiement d'une facture

```
1. Utilisateur crée facture (éditeur ou voice-to-invoice)
   ↓
2. Sélection client (autocomplete) ou création à la volée
   ↓
3. Ajout lignes (produits catalogue ou saisie libre)
   ↓
4. Calcul automatique TVA + total
   ↓
5. Sauvegarde en brouillon (Supabase)
   ↓
6. Option A: Envoi email (Resend) + PDF joint
   Option B: Génération lien paiement (Stripe ou SumUp)
   ↓
7. Client reçoit email / accède au portail /client/[token]
   ↓
8. Paiement via Stripe/SumUp
   ↓
9. Webhook → statut "payé" automatiquement
   ↓
10. Notification push à l'utilisateur
```

### Flux : Abonnement payant

```
1. Plan gratuit → limite 5 factures atteinte → /paywall
   ↓
2. Choix plan (Solo 14,99€ / Pro 29,99€ / Business 59,99€)
   ↓
3. Option mensuel ou annuel (-20%)
   ↓
4. Checkout Stripe intégré (Elements)
   ↓
5. Paiement → Webhook checkout.session.completed
   ↓
6. subscription_tier mis à jour en base
   ↓
7. Accès débloqué immédiatement
```

### Flux : Essai gratuit Business 4 jours

```
1. Utilisateur sur plan gratuit → /trial ou /paywall?plan=business&trial=true
   ↓
2. SetupIntent Stripe (enregistrement carte, PAS de débit)
   ↓
3. Webhook setup_intent.succeeded
   ↓
4. is_trial_active = true
   trial_start_date = maintenant
   trial_end_date = +4 jours
   subscription_tier = 'trial'
   ↓
5. Accès complet Business pendant 4 jours
   ↓
6. Expiration → retour plan Découverte (free)
```

### Flux : Contrat de travail CDI

```
1. /contracts/new/cdi → Formulaire multi-étapes
   ↓
2. Saisie infos salarié + employeur + poste + salaire
   ↓
3. Sélection clauses optionnelles (essai, non-concurrence)
   ↓
4. LIA vérifie conformité droit français
   ↓
5. Génération HTML automatique
   ↓
6. Aperçu contrat + export PDF/DOCX
   ↓
7. Envoi pour signature → email salarié → /sign/[token]
   ↓
8. Signature bilatérale eIDAS
   ↓
9. Statut → "Signé" puis "Actif"
   ↓
10. Stockage eIDAS + URL vérification publique
```

---

## 17. INTERNATIONALISATION

- **Langues supportées** : Français (FR) et Anglais (EN)
- **Bibliothèque** : i18next 24.2.3 + react-i18next
- **Détection automatique** : `i18next-browser-languagedetector`
- **Étape onboarding** : Choix langue à la première connexion (`/onboarding/language`)
- **Fichiers** : Répertoire `i18n/` avec namespaces par module
- **Changement** : Possible depuis les paramètres à tout moment

---

## 18. PWA & NOTIFICATIONS

### Progressive Web App

- **Service Worker** : `/sw.js` servi avec `Cache-Control: no-cache`
- **Offline** : Routes `/offline/*` — capture, CRM, dépenses en mode déconnecté
- **Installation** : Installable sur mobile et desktop
- **Manifest** : Icône, couleur thème, orientation

### Notifications Push

- **Protocole** : Web Push API (VAPID)
- **Serveur** : `web-push 3.6.7`
- **Clés** : VAPID Public/Private Keys (générées avec `npx web-push generate-vapid-keys`)
- **Abonnement** : `POST /api/push/subscribe` → stocké dans `profiles.web_push_subscription` (JSONB)
- **Envoi** : `POST /api/push/send`

**Événements déclencheurs :**
- Facture payée (webhook Stripe/SumUp)
- Rappel de paiement programmé
- Signature reçue (contrat ou devis)
- Expiration contrat CDD imminente
- Nouvelle interaction CRM

---

## RÉSUMÉ EXÉCUTIF

**Facturme** est un SaaS de facturation B2B full-stack développé pour le marché français, couvrant l'ensemble du cycle de vie commercial d'une petite entreprise ou d'un freelance :

### Points forts techniques
- Next.js 15 (App Router) + React 19 — stack moderne et performant
- Supabase PostgreSQL avec RLS — isolation et sécurité des données
- Stripe + SumUp — double solution de paiement
- eIDAS Avancé gratuit — signatures légalement valides sans coût supplémentaire
- Factur-X EN 16931 — déjà conforme réforme 2026
- IA gratuite (OpenRouter) — valeur sans coût LLM pour l'opérateur

### Positionnement marché
| Plan | Cible | Concurrent direct |
|---|---|---|
| Découverte (gratuit) | Test produit | Freemium Debitoor, Invoice Ninja |
| Solo (14,99€) | Freelances | Zervant, Freebe, Henrri |
| Pro (29,99€) | TPE 1-10 salariés | QuickBooks, Sage Start |
| Business (59,99€) | PME 10-50 salariés | Sage 50, Cegid |

### Différenciateurs clés
1. **Contrats de travail intégrés** (CDI/CDD/autres) — unique sur le marché SaaS facturation FR
2. **eIDAS inclus gratuitement** — la plupart des concurrents facturent la signature
3. **Voice-to-invoice** — dictée vocale → facture en quelques secondes
4. **Factur-X natif** — prêt pour la réforme 2026 sans module additionnel
5. **IA locale gratuite** — OpenRouter modèles gratuits, 0€ de coût IA pour l'opérateur
6. **Trial 4 jours sans débit** — SetupIntent Stripe, non-intrusif

---

*Analyse générée le 03/05/2026 — Codebase : Next.js 15.5.14 / React 19 / Supabase / Stripe 17*
