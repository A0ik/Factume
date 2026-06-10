import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { predictTreasury } from '@/lib/treasury-predictor';

/**
 * GET /api/copilot/treasury
 * Returns 30-day and 90-day treasury prediction for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Current balance = total paid - total expenses
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('total_ttc')
      .eq('user_id', user.id)
      .eq('status', 'paid');

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id);

    const totalIncome = (paidInvoices || []).reduce((s, inv) => s + (inv.total_ttc || 0), 0);
    const totalExpenses = (expenses || []).reduce((s, exp) => s + (exp.amount || 0), 0);
    const currentBalance = totalIncome - totalExpenses;

    // Outstanding invoices (sent but not paid)
    const { data: outstandingInvoices } = await supabase
      .from('invoices')
      .select('total_ttc, due_date, status')
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue']);

    // Overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('total_ttc, due_date, status')
      .eq('user_id', user.id)
      .eq('status', 'overdue');

    // Historical payment delays
    const { data: paidWithDates } = await supabase
      .from('invoices')
      .select('due_date, paid_at')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .not('due_date', 'is', null)
      .limit(20);

    const paymentDelays: number[] = [];
    for (const inv of paidWithDates || []) {
      if (inv.due_date && inv.paid_at) {
        const due = new Date(inv.due_date).getTime();
        const paid = new Date(inv.paid_at).getTime();
        const days = Math.round((paid - due) / (1000 * 60 * 60 * 24));
        if (Math.abs(days) < 365) paymentDelays.push(days);
      }
    }

    // Recurring expenses
    const { data: recurringExps } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .eq('is_recurring', true);

    const avgRecurringMonthly = (recurringExps || []).reduce((s, e) => s + (e.amount || 0), 0);

    const prediction = predictTreasury({
      currentBalance,
      outstandingInvoices: (outstandingInvoices || []) as any[],
      overdueInvoices: (overdueInvoices || []) as any[],
      recurringExpenses: avgRecurringMonthly > 0
        ? [{ amount: avgRecurringMonthly, frequency: 'monthly' as const }]
        : [],
      historicalPaymentDelays: paymentDelays,
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('[copilot/treasury] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
