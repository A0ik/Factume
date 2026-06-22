/**
 * MONOLITH — Configuration centralisée des plans tarifaires.
 *
 * LOI 4: Le gating est défini ICI et utilisé PARTOUT (client + serveur).
 * LOI 7: Le plan gratuit est un appât, pas un cimetière.
 * LOI 8: Le plan Pro rend le retour au Starter douloureux.
 * LOI 9: Le plan Business verrouille les PME avec le collaboratif.
 */

export type PlanTier = 'free' | 'pro' | 'business';

// ── PROMETHEUS (CIBLE 3) — Badge de réduction annuelle unifié ─────────────────
// Source de vérité UNIQUE pour les 3 surfaces de prix (paywall, landing, trial).
// Avant : paywall « -17% », landing « −17% » (U+2212), trial « -20% » (FAUX — le
// vrai taux Pro est 1 − 149,99/(14,99×12) ≈ 16,6 % → 17 %). On centralise pour
// garantir cohérence + justesse. Le caractère « − » est le vrai moins typographique.
export const ANNUAL_DISCOUNT_BADGE = '−17%';

/** Taux de réduction annuelle réel d'un plan, arrondi (ex : 16,6 % → 17). */
export function annualDiscountPercent(monthly: number, yearly: number): number {
  if (!monthly) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  priceMonthly: number;   // € HT/mois
  priceYearly: number;    // € HT/an
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  description: string;
  features: string[];
  limits: {
    invoicesPerMonth: number | null;     // null = illimité
    quotesPerMonth: number | null;
    maxCabinets: number;
    maxClientsCRM: number | null;
    maxUsers: number;
    voiceCommandsPerMonth: number | null;
    // MERCURE (juin 2026) — OCR multi-factures (lot type Dext, Business seul). null = non accessible / illimité selon plan.
    ocrInvoicesPerMonth: number | null;
  };
  gates: {
    urssafOneClick: boolean;
    voiceExpense: boolean;
    copilotFactu: boolean;
    comptableConnect: boolean;
    customTemplate: boolean;
    recurringInvoices: boolean;
    exportFEC: boolean;
    multiUser: boolean;
    watermarkPDF: boolean;
    prioritySupport: boolean;
    crmAccess: boolean;
    contracts: boolean;
    // ZEUS (CIBLE 3) — Vérité commerciale OCR :
    //  - ocrSimple : scan d'UN justificatif pour pré-remplir une note de frais (Pro+).
    //  - ocrMultiInvoice : OCR multi-factures type Dext (lot, segmentation) → Business seul.
    ocrSimple: boolean;
    ocrMultiInvoice: boolean;
  };
}

// ── STRIPE PRICE IDS (résolus depuis .env.local) ──
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  business_monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || '',
  business_yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID || '',
};

// ── DÉFINITION DES 3 PLANS ──
export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Starter',
    tier: 'free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Pour démarrer et tester Factu.me — gratuit pour toujours.',
    features: [
      '3 factures par mois',
      '3 devis par mois',
      '1 cabinet',
      '10 clients CRM',
      'Dictée vocale IA illimitée',
      'Accès mobile & web',
      'Support email',
    ],
    limits: {
      invoicesPerMonth: 3,
      quotesPerMonth: 3,
      maxCabinets: 1,
      maxClientsCRM: 10,
      maxUsers: 1,
      // MERCURE : fair-use voix 50/mois (gratuit). Marketing reste "voix illimitée"
      // (l'est pour Pro+). 50/mois couvre largement la découverte ; bloque le bot-farming.
      voiceCommandsPerMonth: 50,
      ocrInvoicesPerMonth: 0, // OCR multi-factures = Business
    },
    gates: {
      urssafOneClick: false,
      voiceExpense: false,       // LOI 3 : la voix est gratuite & illimitée pour tous
      copilotFactu: false,
      comptableConnect: false,
      customTemplate: false,
      recurringInvoices: false,
      exportFEC: false,
      multiUser: false,
      watermarkPDF: true,
      prioritySupport: false,
      crmAccess: false,
      contracts: false,
      ocrSimple: false,
      ocrMultiInvoice: false,
    },
  },

  pro: {
    name: 'Pro',
    tier: 'pro',
    priceMonthly: 14.99,
    priceYearly: 149.99,
    description: 'Le couteau suisse des indépendants & TPE. Rentabilité immédiate.',
    features: [
      'Factures & devis illimités',
      'Contrats de travail (CDI/CDD)',
      'Notes de frais (manuel + vocal + scan simple)',
      'Signature électronique',
      'Gestion IK (indemnités kilométriques)',
      'Tableau de bord analytique',
      'Multi-modèles PDF (6 templates)',
      'E-facturation certifiée Factur-X',
      'URSSAF One-Click',
      'Export comptable (FEC, CSV)',
      'Rapprochement bancaire',
      'CRM illimité',
      'Sans watermark',
      'Support prioritaire',
    ],
    limits: {
      invoicesPerMonth: null,
      quotesPerMonth: null,
      maxCabinets: 1,
      maxClientsCRM: null,
      maxUsers: 1,
      voiceCommandsPerMonth: null,
      ocrInvoicesPerMonth: 0, // Pro n'a que le scan simple (illimité) ; multi-factures = Business
    },
    gates: {
      urssafOneClick: true,
      voiceExpense: true,
      copilotFactu: false,        // ZEUS (suivi #1) — Copilot Factu IA (avancé) = Business. Le widget est isBusiness ; Pro/essai exclus.
      comptableConnect: false,
      customTemplate: true,
      recurringInvoices: true,
      exportFEC: true,
      multiUser: false,
      watermarkPDF: false,
      prioritySupport: true,
      crmAccess: true,
      contracts: true,
      ocrSimple: true,        // Pro+ : scan simple d'un justificatif (pré-remplissage note de frais)
      ocrMultiInvoice: false, // L'OCR multi-factures type Dext reste Business
    },
  },

  business: {
    name: 'Business',
    tier: 'business',
    priceMonthly: 39.99,
    priceYearly: 399.99,
    description: 'Pour les PME & experts-comptables. Collaboration & IA avancée.',
    features: [
      'Tout le plan Pro',
      'OCR multi-factures (lot, type Dext)',
      '5 cabinets',
      'Comptable Connect',
      'Copilot Factu IA (avancé)',
      'Multi-utilisateur (5)',
      'Support dédié',
    ],
    limits: {
      invoicesPerMonth: null,
      quotesPerMonth: null,
      maxCabinets: 5,
      maxClientsCRM: null,
      maxUsers: 5,
      voiceCommandsPerMonth: null,
      // MERCURE : OCR multi-factures Business = 500 factures analysées/mois (couvre 99% des cabinets).
      ocrInvoicesPerMonth: 500,
    },
    gates: {
      urssafOneClick: true,
      voiceExpense: true,
      copilotFactu: true,
      comptableConnect: true,
      customTemplate: true,
      recurringInvoices: true,
      exportFEC: true,
      multiUser: true,
      watermarkPDF: false,
      prioritySupport: true,
      crmAccess: true,
      contracts: true,
      ocrSimple: true,
      ocrMultiInvoice: true, // Business : OCR multi-factures type Dext
    },
  },
};

// ── HELPERS ──

/** Résoudre le plan effectif (trial = pro pendant la période d'essai) */
export function resolveEffectiveTier(tier: string | null | undefined, isTrialActive?: boolean): PlanTier {
  if (isTrialActive) return 'pro';
  // HEPHAISTOS (CIBLE 2) — Defense-in-depth : un tier='trial' signifie que l'essai est
  // toujours actif côté backend (l'API trial-status et le RPC expire_trials le repassent
  // à 'free' à l'expiration). On le traite donc comme 'pro' même si le flag is_trial_active
  // est temporairement périmé côté client — évite que la navbar (CRM, dépenses, compta…)
  // ne s'effondre en 'free' pendant la fenêtre de désynchronisation.
  if (tier === 'trial') return 'pro';
  if (tier === 'business') return 'business';
  if (tier === 'pro' || tier === 'solo') return 'pro'; // 'solo' legacy → pro
  return 'free';
}

/** Obtenir la config d'un plan */
export function getPlanConfig(tier: string | null | undefined, isTrialActive?: boolean): PlanConfig {
  const effective = resolveEffectiveTier(tier, isTrialActive);
  return PLANS[effective];
}

/** Vérifier si une feature est disponible pour un plan */
export function hasFeature(
  tier: string | null | undefined,
  feature: keyof PlanConfig['gates'],
  isTrialActive?: boolean,
): boolean {
  return getPlanConfig(tier, isTrialActive).gates[feature];
}

/** Vérifier une limite quantitative */
export function checkLimit(
  tier: string | null | undefined,
  limit: keyof PlanConfig['limits'],
  currentValue: number,
  isTrialActive?: boolean,
): { allowed: boolean; remaining: number | null; max: number | null } {
  const config = getPlanConfig(tier, isTrialActive);
  const max = config.limits[limit];
  if (max === null) return { allowed: true, remaining: null, max: null };
  const remaining = Math.max(0, max - currentValue);
  return { allowed: currentValue < max, remaining, max };
}

/** Prix formaté pour l'affichage */
export function formatPrice(price: number): string {
  if (price === 0) return 'Gratuit';
  return `${price.toFixed(2).replace('.00', '').replace('.99', '.99')}€`;
}
