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
  total_ttc: number;
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

  const totalOutstanding = outstandingInvoices.reduce((s, inv) => s + (inv.total_ttc || 0), 0);
  const totalOverdue = overdueInvoices.reduce((s, inv) => s + (inv.total_ttc || 0), 0);

  // Build daily projections
  function buildProjection(days: number): TreasuryDataPoint[] {
    const points: TreasuryDataPoint[] = [];
    let balance = currentBalance;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d <= days; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);

      let inflow = 0;
      let outflow = 0;

      // Expected inflows: invoices due on this date (adjusted by average delay)
      const adjustedDate = new Date(date);
      adjustedDate.setDate(adjustedDate.getDate() - averagePaymentDelayDays);
      const adjustedDateStr = adjustedDate.toISOString().slice(0, 10);

      for (const inv of outstandingInvoices) {
        if (inv.due_date?.slice(0, 10) === adjustedDateStr) {
          inflow += inv.total_ttc || 0;
        }
      }

      // Overdue invoices: spread evenly over next 7 days
      if (d < 7 && totalOverdue > 0) {
        inflow += totalOverdue / 7;
      }

      // Expected outflows: recurring expenses
      for (const exp of recurringExpenses) {
        if (exp.frequency === 'monthly') {
          // Assume expenses hit on the 1st of each month
          if (date.getDate() === 1) {
            outflow += exp.amount;
          }
        } else if (exp.frequency === 'weekly') {
          // Assume Monday
          if (date.getDay() === 1) {
            outflow += exp.amount;
          }
        } else if (exp.frequency === 'yearly') {
          // Assume January 1st
          if (date.getMonth() === 0 && date.getDate() === 1) {
            outflow += exp.amount;
          }
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
