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

/** Compute vendor name similarity score (0-1) */
function vendorSimilarity(vendor1: string | null, vendor2: string | null): number {
  if (!vendor1 || !vendor2) return 0;
  const v1 = vendor1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const v2 = vendor2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (v1 === v2) return 1;
  // Check if one contains the other
  if (v1.includes(v2) || v2.includes(v1)) return 0.8;
  // Word overlap
  const words1 = new Set(v1.split(/\s+/));
  const words2 = new Set(v2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w));
  return intersection.length / Math.max(words1.size, words2.size);
}

/** Enhanced match scoring combining amount, date, and vendor similarity */
function matchScore(expense: any, transaction: any): { score: number; confidence: 'high' | 'medium' | 'low' } {
  let score = 0;

  // Amount match (0-40 points)
  const amountDiff = Math.abs((expense.amount || 0) - Math.abs(transaction.amount || 0));
  if (amountDiff === 0) score += 40;
  else if (amountDiff < 1) score += 35;
  else if (amountDiff < (expense.amount || 0) * 0.03) score += 25;
  else if (amountDiff < (expense.amount || 0) * 0.1) score += 10;

  // Date match (0-30 points)
  const expenseDate = new Date(expense.date);
  const txDate = new Date(transaction.transaction_date || transaction.date);
  const daysDiff = Math.abs(Math.round((expenseDate.getTime() - txDate.getTime()) / 86400000));
  if (daysDiff === 0) score += 30;
  else if (daysDiff <= 1) score += 25;
  else if (daysDiff <= 3) score += 15;
  else if (daysDiff <= 7) score += 5;

  // Vendor match (0-30 points)
  const vScore = vendorSimilarity(expense.vendor, transaction.description || transaction.label);
  score += Math.round(vScore * 30);

  return {
    score,
    confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
  };
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
      score: number;
      confidence: string;
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

        // Date match: within +/-3 business days
        const trxDate = new Date(trx.transaction_date + 'T00:00:00Z');
        const dateDiff = Math.abs(businessDaysBetween(expenseDate, trxDate));
        if (dateDiff > DATE_TOLERANCE_DAYS) continue;

        // Score: prefer closest amount, then closest date, plus vendor similarity
        const enhancedScore = matchScore(expense, trx);
        const rawScore = amountDiff * 1000 + dateDiff;

        if (rawScore < bestScore) {
          bestScore = rawScore;
          bestMatch = {
            expense_id: expense.id,
            expense_vendor: expense.vendor,
            expense_amount: expense.amount,
            transaction_id: trx.id,
            transaction_description: trx.label || trx.description || null,
            transaction_amount: trx.amount,
            date_diff: dateDiff,
            amount_diff: Math.round(amountDiff * 100) / 100,
            score: enhancedScore.score,
            confidence: enhancedScore.confidence,
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
      .update({ bank_transaction_id: transaction_id, status: 'reconciled' })
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

// ---------------------------------------------------------------------------
// GET — Auto-match with enhanced scoring (approved expenses vs unreconciled transactions)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Get unmatched approved expenses and unreconciled transactions
    const [expensesRes, transactionsRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, vendor, amount, date')
        .eq('user_id', user.id)
        .is('matched_transaction_id', null)
        .eq('status', 'approved')
        .limit(100),
      supabase
        .from('bank_transactions')
        .select('id, amount, transaction_date, label, description')
        .eq('user_id', user.id)
        .eq('status', 'unreconciled')
        .limit(100),
    ]);

    const expenses = expensesRes.data || [];
    const transactions = transactionsRes.data || [];

    // Auto-match using enhanced scoring
    const matches: Array<{
      expenseId: string;
      transactionId: string;
      score: number;
      confidence: string;
    }> = [];
    const matchedExpenseIds = new Set<string>();
    const matchedTxIds = new Set<string>();

    for (const expense of expenses) {
      for (const tx of transactions) {
        if (matchedExpenseIds.has(expense.id) || matchedTxIds.has(tx.id)) continue;
        const result = matchScore(expense, tx);
        if (result.confidence === 'high') {
          matches.push({
            expenseId: expense.id,
            transactionId: tx.id,
            score: result.score,
            confidence: result.confidence,
          });
          matchedExpenseIds.add(expense.id);
          matchedTxIds.add(tx.id);
        }
      }
    }

    return NextResponse.json({
      matches,
      unmatchedExpenses: expenses.length - matchedExpenseIds.size,
      unmatchedTransactions: transactions.length - matchedTxIds.size,
    });
  } catch (error: unknown) {
    console.error('[bank-match GET] Unhandled error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}
