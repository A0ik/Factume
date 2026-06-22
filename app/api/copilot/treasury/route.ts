import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { predictTreasury } from '@/lib/treasury-predictor';

/**
 * GET /api/copilot/treasury
 * Returns 30-day and 90-day treasury prediction for the current user.
 * Guard : nécessite Copilot Factu (réservé au plan Business).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Guard plan : Copilot Factu réservé au plan Business.
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'copilotFactu');
    } catch {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    // Current balance = total paid - total expenses
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('user_id', user.id)
      .eq('status', 'paid');

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id);

    const totalIncome = (paidInvoices || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const totalExpenses = (expenses || []).reduce((s, exp) => s + (exp.amount || 0), 0);
    const currentBalance = totalIncome - totalExpenses;

    // Outstanding invoices (sent but not paid)
    const { data: outstandingInvoices } = await supabase
      .from('invoices')
      .select('total, due_date, status')
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue']);

    // Overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('total, due_date, status')
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

    // HEPHAISTOS (CIBLE 3) — Décaissements : ALGORITHME HYBRIDE.
    //  (a) Dépenses récurrentes flaggées (is_recurring=true) projetées selon recurring_frequency.
    //  (b) Run-rate : moyenne mensuelle des dépenses NON récurrentes sur 90 jours, en complément.
    //      → toujours un chiffre réel même si rien n'est flaggé ; pas de double-comptage.
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().slice(0, 10);

    const { data: recurringExps } = await supabase
      .from('expenses')
      .select('amount, recurring_frequency')
      .eq('user_id', user.id)
      .eq('is_recurring', true);

    const { data: recentExpenses } = await supabase
      .from('expenses')
      .select('amount, is_recurring')
      .eq('user_id', user.id)
      .gte('date', ninetyDaysAgoStr);

    const normalizeFrequency = (raw: string | null): 'monthly' | 'weekly' | 'yearly' => {
      const f = (raw || '').toLowerCase();
      if (f.includes('week') || f.includes('heb')) return 'weekly';
      if (f.includes('year') || f.includes('ann')) return 'yearly';
      return 'monthly'; // défaut prudent : mensuel
    };

    const recurringExpenses = (recurringExps || []).map((e: any) => ({
      amount: e.amount || 0,
      frequency: normalizeFrequency(e.recurring_frequency),
    }));

    // Run-rate mensuel = (somme des dépenses non récurrentes sur 90 j) / 3 mois
    const runRateMonthly = (recentExpenses || [])
      .filter((e: any) => !e.is_recurring)
      .reduce((s, e: any) => s + (e.amount || 0), 0) / 3;

    if (runRateMonthly > 0) {
      recurringExpenses.push({ amount: runRateMonthly, frequency: 'monthly' });
    }

    const prediction = predictTreasury({
      currentBalance,
      outstandingInvoices: (outstandingInvoices || []) as any[],
      overdueInvoices: (overdueInvoices || []) as any[],
      recurringExpenses,
      historicalPaymentDelays: paymentDelays,
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('[copilot/treasury] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
