import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count business days (Mon-Fri) between two dates. Negative = a is before b. */
function businessDaysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const start = new Date(Math.min(a.getTime(), b.getTime()));
  const end = new Date(Math.max(a.getTime(), b.getTime()));
  let count = 0;
  const current = new Date(start);

  while (current < end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return a <= b ? count : -count;
}

// ---------------------------------------------------------------------------
// POST — Auto-match expenses to bank transactions (suggestions only)
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ------------------------------------------------------------------
    // 1. Get validated expenses not already matched
    // ------------------------------------------------------------------
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id, vendor, amount, date')
      .eq('user_id', user.id)
      .eq('status', 'validated')
      .is('bank_transaction_id', null);

    if (expError) {
      console.error('[bank-match] Expenses fetch error:', expError);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des dépenses.' },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // 2. Get bank transactions not already matched
    // ------------------------------------------------------------------
    const { data: transactions, error: trxError } = await supabase
      .from('bank_transactions')
      .select('id, amount, transaction_date, label, description')
      .eq('user_id', user.id)
      .is('matched_expense_id', null);

    if (trxError) {
      console.error('[bank-match] Transactions fetch error:', trxError);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des transactions bancaires.' },
        { status: 500 },
      );
    }

    if (!expenses || expenses.length === 0 || !transactions || transactions.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // ------------------------------------------------------------------
    // 3. Find best matching bank transaction for each expense
    // ------------------------------------------------------------------
    const DATE_TOLERANCE_DAYS = 3; // business days
    const AMOUNT_TOLERANCE_PCT = 0.03; // 3%
    const AMOUNT_TOLERANCE_MIN = 1; // 1 EUR minimum tolerance

    const usedTransactionIds = new Set<string>();
    const matches: Array<{
      expense_id: string;
      expense_vendor: string | null;
      expense_amount: number;
      transaction_id: string;
      transaction_description: string | null;
      transaction_amount: number;
      date_diff: number;
      amount_diff: number;
    }> = [];

    for (const expense of expenses) {
      if (!expense.amount || !expense.date) continue;

      const expenseDate = new Date(expense.date + 'T00:00:00Z');
      const amountTolerance = Math.max(Math.abs(expense.amount) * AMOUNT_TOLERANCE_PCT, AMOUNT_TOLERANCE_MIN);

      let bestMatch: (typeof matches)[number] | null = null;
      let bestScore = Infinity; // lower is better

      for (const trx of transactions) {
        if (usedTransactionIds.has(trx.id)) continue;
        if (!trx.amount || !trx.transaction_date) continue;

        // Amount match: compare absolute values (bank transactions may be negative for expenses)
        const amountDiff = Math.abs(Math.abs(expense.amount) - Math.abs(trx.amount));
        if (amountDiff > amountTolerance) continue;

        // Date match: within ±3 business days
        const trxDate = new Date(trx.transaction_date + 'T00:00:00Z');
        const dateDiff = Math.abs(businessDaysBetween(expenseDate, trxDate));
        if (dateDiff > DATE_TOLERANCE_DAYS) continue;

        // Score: prefer closest amount, then closest date
        const score = amountDiff * 1000 + dateDiff;

        if (score < bestScore) {
          bestScore = score;
          bestMatch = {
            expense_id: expense.id,
            expense_vendor: expense.vendor,
            expense_amount: expense.amount,
            transaction_id: trx.id,
            transaction_description: trx.label || trx.description || null,
            transaction_amount: trx.amount,
            date_diff: dateDiff,
            amount_diff: Math.round(amountDiff * 100) / 100,
          };
        }
      }

      if (bestMatch) {
        usedTransactionIds.add(bestMatch.transaction_id);
        matches.push(bestMatch);
      }
    }

    return NextResponse.json({ matches });
  } catch (error: unknown) {
    console.error('[bank-match] Unhandled error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Erreur inattendue lors du rapprochement bancaire.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — Confirm a match between expense and bank transaction
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { expense_id, transaction_id } = body as {
      expense_id: string;
      transaction_id: string;
    };

    if (!expense_id || !transaction_id) {
      return NextResponse.json(
        { error: 'Paramètres manquants : expense_id et transaction_id sont requis.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Verify the expense belongs to the user
    // ------------------------------------------------------------------
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (expError || !expense) {
      return NextResponse.json({ error: 'Dépense introuvable.' }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // Verify the bank transaction belongs to the user
    // ------------------------------------------------------------------
    const { data: transaction, error: trxError } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .single();

    if (trxError || !transaction) {
      return NextResponse.json({ error: 'Transaction bancaire introuvable.' }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // Update both sides of the relationship
    // ------------------------------------------------------------------
    const { error: updateExpError } = await supabase
      .from('expenses')
      .update({ bank_transaction_id: transaction_id })
      .eq('id', expense_id);

    if (updateExpError) {
      console.error('[bank-match] Expense update error:', updateExpError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la dépense.' },
        { status: 500 },
      );
    }

    const { error: updateTrxError } = await supabase
      .from('bank_transactions')
      .update({ matched_expense_id: expense_id, status: 'matched' })
      .eq('id', transaction_id);

    if (updateTrxError) {
      console.error('[bank-match] Transaction update error:', updateTrxError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la transaction bancaire.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[bank-match] Unhandled error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Erreur inattendue lors de la confirmation du rapprochement.' },
      { status: 500 },
    );
  }
}
