/**
 * MONOLITH — Configuration centralisée des plans tarifaires.
 *
 * LOI 4: Le gating est défini ICI et utilisé PARTOUT (client + serveur).
 * LOI 7: Le plan gratuit est un appât, pas un cimetière.
 * LOI 8: Le plan Pro rend le retour au Starter douloureux.
 * LOI 9: Le plan Business verrouille les PME avec le collaboratif.
 */

export type PlanTier = 'free' | 'pro' | 'business';

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
      'E-facturation certifiée',
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
      voiceCommandsPerMonth: null, // LOI 3 : voix illimitée (cheval de Troie)
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
      'OCR analyse de reçus',
      'Signature électronique',
      'Notes de frais vocales',
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
    },
    gates: {
      urssafOneClick: true,
      voiceExpense: true,
      copilotFactu: true,
      comptableConnect: false,
      customTemplate: true,
      recurringInvoices: true,
      exportFEC: true,
      multiUser: false,
      watermarkPDF: false,
      prioritySupport: true,
      crmAccess: true,
      contracts: true,
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
    },
  },
};

// ── HELPERS ──

/** Résoudre le plan effectif (trial = pro pendant la période d'essai) */
export function resolveEffectiveTier(tier: string | null | undefined, isTrialActive?: boolean): PlanTier {
  if (isTrialActive) return 'pro';
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
