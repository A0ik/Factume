import { ContractSummary } from '@/types';

export interface PayrollProjection {
  monthly: { month: string; amount: number }[];
  yearly: { year: string; amount: number }[];
  totalCurrentYear: number;
}

export interface ExpirationTimelineEntry {
  month: string;
  count: number;
  contracts: { id: string; number: string; employee: string; date: string }[];
}

export type ExpirationTimeline = ExpirationTimelineEntry[];

export interface TypeDistribution {
  cdi: number;
  cdd: number;
  other: number;
}

export interface StatusDistribution {
  draft: number;
  pending_signature: number;
  signed: number;
  active: number;
  ended: number;
  terminated: number;
  cancelled: number;
}

/**
 * Calcule la projection de la masse salariale mensuelle et annuelle
 */
export function computePayrollProjection(contracts: ContractSummary[]): PayrollProjection {
  const monthlyMap = new Map<string, number>();
  const yearlyMap = new Map<string, number>();

  const now = new Date();
  const currentYear = now.getFullYear();

  contracts.forEach((c) => {
    // Skip if not active or signed
    if (!['active', 'signed'].includes(c.status)) return;

    const monthlyAmount = c.salary_frequency === 'hourly'
      ? c.salary_amount * 151.67 // 35h/semaine en moyenne
      : c.salary_amount;

    // Projection sur les 12 prochains mois
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const yearKey = String(d.getFullYear());

      // Vérifier si le contrat est actif ce mois-là
      const startDate = new Date(c.start_date);
      const endDate = c.end_date ? new Date(c.end_date) : null;

      if (d >= startDate && (!endDate || d <= endDate)) {
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + monthlyAmount);
        if (d.getFullYear() === currentYear) {
          yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + monthlyAmount);
        }
      }
    }
  });

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const yearly = Array.from(yearlyMap.entries())
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const totalCurrentYear = yearly.find(y => y.year === String(currentYear))?.amount || 0;

  return { monthly, yearly, totalCurrentYear };
}

/**
 * Calcule la timeline des expirations de contrats
 */
export function computeExpirationTimeline(contracts: ContractSummary[]): ExpirationTimeline {
  const monthMap = new Map<string, { count: number; contracts: ExpirationTimelineEntry['contracts'] }>();

  const now = new Date();

  contracts
    .filter(c => c.end_date && new Date(c.end_date) > now)
    .forEach((c) => {
      if (!c.end_date) return;
      const monthKey = c.end_date.slice(0, 7); // YYYY-MM

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { count: 0, contracts: [] });
      }

      const entry = monthMap.get(monthKey)!;
      entry.count++;
      entry.contracts.push({
        id: c.id,
        number: c.contract_number || '',
        employee: c.employee_name,
        date: c.end_date,
      });
    });

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calcule la répartition par type de contrat
 */
export function computeTypeDistribution(contracts: ContractSummary[]): TypeDistribution {
  return {
    cdi: contracts.filter(c => c.contract_type === 'cdi').length,
    cdd: contracts.filter(c => c.contract_type === 'cdd').length,
    other: contracts.filter(c => c.contract_type === 'other').length,
  };
}

/**
 * Calcule la répartition par statut
 */
export function computeStatusDistribution(contracts: ContractSummary[]): StatusDistribution {
  return {
    draft: contracts.filter(c => c.status === 'draft').length,
    pending_signature: contracts.filter(c => c.status === 'pending_signature').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    active: contracts.filter(c => c.status === 'active').length,
    ended: contracts.filter(c => c.status === 'ended').length,
    terminated: contracts.filter(c => c.status === 'terminated').length,
    cancelled: contracts.filter(c => c.status === 'cancelled').length,
  };
}

/**
 * Formate un montant en euros
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Exporte les données en CSV
 */
export function exportContractsToCSV(contracts: ContractSummary[]): string {
  const headers = ['Numéro', 'Type', 'Salarié', 'Entreprise', 'Poste', 'Début', 'Fin', 'Statut', 'Salaire', 'Fréquence'];
  const rows = contracts.map(c => [
    c.contract_number || '',
    c.contract_type,
    c.employee_name,
    c.company_name,
    c.job_title,
    c.start_date,
    c.end_date || '',
    c.status,
    String(c.salary_amount),
    c.salary_frequency,
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';')),
  ].join('\n');

  return csvContent;
}
