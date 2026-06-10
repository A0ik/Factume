// ---------------------------------------------------------------------------
// URSSAF Calculator for Micro-Entrepreneurs (2026 Rates)
// Taux vérifiés : https://www.urssaf.fr/accueil/actualites/taux-cotisations-autoentrepeneur.html
// ---------------------------------------------------------------------------

import { roundMoney } from '@/lib/money';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MicroRegime = 'bic_ventes' | 'bic_prestations' | 'bnc' | 'cipav';

export interface URSSAFCalculation {
  regime: MicroRegime;
  regimeLabel: string;
  revenue: number;
  urssafRate: number;
  urssafAmount: number;
  abattementRate: number;
  abattementAmount: number;
  taxableIncome: number;
  netIncome: number;
  incomeTaxRate: number | null;     // Versement libératoire (null if not applicable)
  incomeTaxAmount: number;
  netAfterTax: number;
  quarterlyAmount: number;
}

export interface QuarterlyReport {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  quarterLabel: string;
  startDate: Date;
  endDate: Date;
  months: { month: number; monthLabel: string; revenue: number }[];
  totalRevenue: number;
  calculation: URSSAFCalculation;
  deadlineDate: Date;
  daysUntilDeadline: number;
}

// ---------------------------------------------------------------------------
// Constants (2026 Rates)
// ---------------------------------------------------------------------------

export const URSSAF_RATES_2026: Record<MicroRegime, number> = {
  bic_ventes: 12.3,
  bic_prestations: 21.2,
  bnc: 25.6,
  cipav: 23.2,
};

export const ABATTEMENT_RATES: Record<MicroRegime, number> = {
  bic_ventes: 71,
  bic_prestations: 50,
  bnc: 34,
  cipav: 34,
};

/** Versement libératoire de l'impôt sur le revenu (optionnel) */
export const INCOME_TAX_RATES: Record<MicroRegime, number> = {
  bic_ventes: 1.0,
  bic_prestations: 1.7,
  bnc: 2.2,
  cipav: 2.2,
};

export const REGIME_LABELS: Record<MicroRegime, string> = {
  bic_ventes: 'BIC — Vente de marchandises',
  bic_prestations: 'BIC — Prestations de services',
  bnc: 'BNC — Professions libérales',
  cipav: 'CIPAV — Professions libérales réglementées',
};

export const REGIME_SHORT_LABELS: Record<MicroRegime, string> = {
  bic_ventes: 'BIC Ventes',
  bic_prestations: 'BIC Prestations',
  bnc: 'BNC',
  cipav: 'CIPAV',
};

// ---------------------------------------------------------------------------
// URSSAF Quarterly Deadlines (2026)
// ---------------------------------------------------------------------------

const URSSAF_DEADLINES_2026 = [
  { quarter: 1 as const, deadline: new Date('2026-05-05') },   // T1: mai
  { quarter: 2 as const, deadline: new Date('2026-08-05') },   // T2: août
  { quarter: 3 as const, deadline: new Date('2026-11-05') },   // T3: novembre
  { quarter: 4 as const, deadline: new Date('2027-02-05') },   // T4: février N+1
];

// ---------------------------------------------------------------------------
// Main Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate URSSAF contributions for a micro-entrepreneur.
 * @param revenue - Monthly or quarterly revenue (CA brut)
 * @param regime - The micro-entreprise regime
 * @param includeIncomeTax - Whether to include versement libératoire IR
 * @returns Full URSSAF breakdown
 */
export function calculateURSSAF(
  revenue: number,
  regime: MicroRegime,
  includeIncomeTax = false,
): URSSAFCalculation {
  const urssafRate = URSSAF_RATES_2026[regime];
  const abattementRate = ABATTEMENT_RATES[regime];
  const incomeTaxRate = includeIncomeTax ? INCOME_TAX_RATES[regime] : null;

  const urssafAmount = roundMoney(revenue * urssafRate / 100);
  const abattementAmount = roundMoney(revenue * abattementRate / 100);
  const taxableIncome = roundMoney(revenue - abattementAmount);
  const netIncome = roundMoney(revenue - urssafAmount);

  const incomeTaxAmount = incomeTaxRate !== null
    ? roundMoney(revenue * incomeTaxRate / 100)
    : 0;

  const netAfterTax = roundMoney(netIncome - incomeTaxAmount);

  return {
    regime,
    regimeLabel: REGIME_LABELS[regime],
    revenue,
    urssafRate,
    urssafAmount,
    abattementRate,
    abattementAmount,
    taxableIncome,
    netIncome,
    incomeTaxRate,
    incomeTaxAmount,
    netAfterTax,
    quarterlyAmount: roundMoney(urssafAmount * 3), // if revenue is monthly, multiply by 3
  };
}

/**
 * Calculate URSSAF for a full quarter from monthly revenues.
 */
export function calculateQuarterly(
  month1Revenue: number,
  month2Revenue: number,
  month3Revenue: number,
  regime: MicroRegime,
  includeIncomeTax = false,
): { totalRevenue: number; calculation: URSSAFCalculation } {
  const totalRevenue = month1Revenue + month2Revenue + month3Revenue;
  const calculation = calculateURSSAF(totalRevenue, regime, includeIncomeTax);
  return { totalRevenue, calculation };
}

/**
 * Get the current quarter info and deadline.
 */
export function getCurrentQuarter(): { year: number; quarter: 1 | 2 | 3 | 4; deadline: Date } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const quarter = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
  const deadline = URSSAF_DEADLINES_2026.find(d => d.quarter === quarter)?.deadline
    ?? new Date(year, month + 4, 5);

  return { year, quarter, deadline };
}

/**
 * Get days until the next URSSAF deadline.
 */
export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate a full quarterly report.
 */
export function generateQuarterlyReport(
  regime: MicroRegime,
  quarterRevenues: [number, number, number],
  includeIncomeTax = false,
): QuarterlyReport {
  const { year, quarter, deadline } = getCurrentQuarter();

  const quarterMonths: Record<number, [number, number, number]> = {
    1: [0, 1, 2],   // Jan, Feb, Mar
    2: [3, 4, 5],   // Apr, May, Jun
    3: [6, 7, 8],   // Jul, Aug, Sep
    4: [9, 10, 11],  // Oct, Nov, Dec
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  const months = quarterMonths[quarter].map((m, i) => ({
    month: m + 1,
    monthLabel: monthNames[m],
    revenue: quarterRevenues[i],
  }));

  const totalRevenue = quarterRevenues.reduce((s, v) => s + v, 0);
  const calculation = calculateURSSAF(totalRevenue, regime, includeIncomeTax);

  const quarterStartMonth = quarterMonths[quarter][0];
  const startDate = new Date(year, quarterStartMonth, 1);
  const endDate = new Date(year, quarterMonths[quarter][2] + 1, 0); // last day of last month

  return {
    year,
    quarter,
    quarterLabel: `T${quarter} ${year}`,
    startDate,
    endDate,
    months,
    totalRevenue,
    calculation,
    deadlineDate: deadline,
    daysUntilDeadline: getDaysUntilDeadline(deadline),
  };
}

/**
 * Suggest the best regime based on activity description.
 */
export function suggestRegime(activity: string): MicroRegime {
  const lower = activity.toLowerCase();

  // BIC Ventes: achat-revente, commerce, e-commerce, restaurant
  if (/vente|marchand|commerce|e-commerce|boutique|restaurant|café|boulanger|aliment/i.test(lower)) {
    return 'bic_ventes';
  }

  // CIPAV: professions libérales réglementées
  if (/architect|avocat|médecin|pharmacien|notaire|expert.compt|géomètre|osteopathe|sage.femme|infirmier/i.test(lower)) {
    return 'cipav';
  }

  // BNC: professions libérales non réglementées (consultants, développeurs, designers, etc.)
  if (/consult|conseil|développ|design|freelance|independ|formateur|coaching|marketing|photograph|rédact|traduct/i.test(lower)) {
    return 'bnc';
  }

  // Default: BIC Prestations de services
  return 'bic_prestations';
}

/**
 * Map profiles.regime_fiscal to MicroRegime.
 */
export function mapFiscalRegime(regimeFiscal?: string, legalStatus?: string): MicroRegime | null {
  if (!regimeFiscal) {
    // Auto-entrepreneur without explicit regime → default BIC prestations
    if (legalStatus === 'auto-entrepreneur') return 'bic_prestations';
    return null;
  }

  const map: Record<string, MicroRegime> = {
    'micro_ventes': 'bic_ventes',
    'micro_prestations': 'bic_prestations',
    'micro_bnc': 'bnc',
    'micro_cipav': 'cipav',
    'micro': 'bic_prestations', // default micro → prestations (most common)
  };

  return map[regimeFiscal] ?? null;
}

/**
 * Calculate the "URSSAF reserve" — how much the user should set aside.
 * Based on total revenue since last quarterly declaration.
 */
export function calculateURSSAFReserve(
  totalRevenueSinceLastDeclaration: number,
  regime: MicroRegime,
  includeIncomeTax = false,
): {
  reserveAmount: number;
  urssafPart: number;
  incomeTaxPart: number;
  totalOwed: number;
  percentage: number;
} {
  const calc = calculateURSSAF(totalRevenueSinceLastDeclaration, regime, includeIncomeTax);
  const percentage = roundMoney((calc.urssafAmount + calc.incomeTaxAmount) / totalRevenueSinceLastDeclaration * 100);

  return {
    reserveAmount: roundMoney(calc.urssafAmount + calc.incomeTaxAmount),
    urssafPart: calc.urssafAmount,
    incomeTaxPart: calc.incomeTaxAmount,
    totalOwed: roundMoney(calc.urssafAmount + calc.incomeTaxAmount),
    percentage: totalRevenueSinceLastDeclaration > 0 ? percentage : 0,
  };
}
