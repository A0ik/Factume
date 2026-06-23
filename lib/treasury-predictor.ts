// ---------------------------------------------------------------------------
// Treasury Predictor — 30-day and 90-day cash flow forecast
// Killer #4: Copilot Factu — Treasury Prediction
// ---------------------------------------------------------------------------

import { roundMoney } from '@/lib/money';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreasuryDataPoint {
  date: string;           // YYYY-MM-DD
  day: number;            // Day offset from today (0 = today)
  predictedBalance: number;
  inflow: number;
  outflow: number;
  isNegative: boolean;
}

export interface TreasuryPrediction {
  currentBalance: number;
  averagePaymentDelayDays: number;
  totalOutstanding: number;
  totalOverdue: number;
  projection30: TreasuryDataPoint[];
  projection90: TreasuryDataPoint[];
  minBalance30: { amount: number; date: string };
  minBalance90: { amount: number; date: string };
  alertDays: string[];    // Dates where balance goes negative
}

// ---------------------------------------------------------------------------
// Prediction Engine
// ---------------------------------------------------------------------------

interface OutstandingInvoice {
  total: number;
  due_date: string;
  status: string;
}

interface RecurringExpense {
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
}

/**
 * Predict future treasury based on outstanding invoices and recurring expenses.
 */
export function predictTreasury(params: {
  currentBalance: number;
  outstandingInvoices: OutstandingInvoice[];
  overdueInvoices: OutstandingInvoice[];
  recurringExpenses: RecurringExpense[];
  historicalPaymentDelays?: number[];  // days between due_date and paid_at
}): TreasuryPrediction {
  const {
    currentBalance,
    outstandingInvoices,
    overdueInvoices,
    recurringExpenses,
    historicalPaymentDelays = [],
  } = params;

  // Calculate average payment delay (default: 15 days)
  const averagePaymentDelayDays = historicalPaymentDelays.length > 0
    ? Math.round(historicalPaymentDelays.reduce((s, d) => s + d, 0) / historicalPaymentDelays.length)
    : 15;

  const totalOutstanding = outstandingInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const totalOverdue = overdueInvoices.reduce((s, inv) => s + (inv.total || 0), 0);

  // Build daily projections
  function buildProjection(days: number): TreasuryDataPoint[] {
    const points: TreasuryDataPoint[] = [];
    let balance = currentBalance;
    // PROMÉTHÉE — référence temporelle en UTC MINUIT. Avant, `today` était minuit
    // LOCAL puis converti en UTC via toISOString() → décalage de fuseau → la clé
    // de date itérée ne correspondait JAMAIS à due_date → le widget « prédisait
    // rien ». On reste en UTC du début à la fin.
    const nowUtc = new Date();
    const today = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));

    const utcKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    // Clé YYYY-MM-DD stable depuis un champ BDD (date pure OU timestamp ISO).
    const dbKey = (s?: string) => (s ? s.slice(0, 10) : '');

    for (let d = 0; d <= days; d++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + d);
      const dateStr = utcKey(date);

      let inflow = 0;
      let outflow = 0;

      // Encaissements attendus : factures dues il y a `delay` jours (délai moyen de paiement).
      const expectedDate = new Date(date);
      expectedDate.setUTCDate(expectedDate.getUTCDate() - averagePaymentDelayDays);
      const expectedKey = utcKey(expectedDate);

      for (const inv of outstandingInvoices) {
        if (dbKey(inv.due_date) === expectedKey) {
          inflow += inv.total || 0;
        }
      }

      // Factures en retard : étalées sur les 7 prochains jours.
      if (d < 7 && totalOverdue > 0) {
        inflow += totalOverdue / 7;
      }

      // Décaissements récurrents (comparaisons en UTC).
      for (const exp of recurringExpenses) {
        if (exp.frequency === 'monthly') {
          if (date.getUTCDate() === 1) outflow += exp.amount;
        } else if (exp.frequency === 'weekly') {
          if (date.getUTCDay() === 1) outflow += exp.amount; // lundi
        } else if (exp.frequency === 'yearly') {
          if (date.getUTCMonth() === 0 && date.getUTCDate() === 1) outflow += exp.amount;
        }
      }

      balance = balance + inflow - outflow;

      points.push({
        date: dateStr,
        day: d,
        predictedBalance: roundMoney(balance),
        inflow: roundMoney(inflow),
        outflow: roundMoney(outflow),
        isNegative: balance < 0,
      });
    }

    return points;
  }

  const projection30 = buildProjection(30);
  const projection90 = buildProjection(90);

  // Find minimum balances
  const min30 = projection30.reduce((min, p) => p.predictedBalance < min.predictedBalance ? p : min, projection30[0]);
  const min90 = projection90.reduce((min, p) => p.predictedBalance < min.predictedBalance ? p : min, projection90[0]);

  // Alert days (negative balance)
  const alertDays = projection30
    .filter(p => p.isNegative)
    .map(p => p.date);

  return {
    currentBalance: roundMoney(currentBalance),
    averagePaymentDelayDays,
    totalOutstanding: roundMoney(totalOutstanding),
    totalOverdue: roundMoney(totalOverdue),
    projection30,
    projection90,
    minBalance30: { amount: roundMoney(min30.predictedBalance), date: min30.date },
    minBalance90: { amount: roundMoney(min90.predictedBalance), date: min90.date },
    alertDays,
  };
}
