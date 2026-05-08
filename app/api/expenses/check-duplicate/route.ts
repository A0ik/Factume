import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuplicateMatch {
  expense_id: string;
  score: number;
  reasons: string[];
  match_details: {
    amount?: boolean;
    date?: boolean;
    vendor?: boolean;
    invoice_number?: boolean;
    hash?: boolean;
  };
  expense: {
    id: string;
    vendor: string;
    amount: number;
    date: string;
    invoice_number?: string;
    receipt_url?: string;
  };
}

interface CheckResult {
  has_duplicates: boolean;
  duplicates: DuplicateMatch[];
  highest_score: number;
}

// ---------------------------------------------------------------------------
// Helper: Calculate similarity score
// ---------------------------------------------------------------------------

function calculateSimilarityScore(
  expense: any,
  existing: any
): { score: number; reasons: string[]; match_details: any } {
  let score = 0;
  const reasons: string[] = [];
  const match_details: any = {};

  // Amount match (40% weight)
  if (expense.amount && existing.amount && expense.amount === existing.amount) {
    score += 0.40;
    reasons.push('Montant identique');
    match_details.amount = true;
  } else if (
    expense.amount &&
    existing.amount &&
    Math.abs(expense.amount - existing.amount) < 0.01
  ) {
    // Very close amounts (rounding differences)
    score += 0.35;
    reasons.push('Montant très proche');
    match_details.amount = true;
  }

  // Date match (25% weight)
  if (expense.date && existing.date && expense.date === existing.date) {
    score += 0.25;
    reasons.push('Date identique');
    match_details.date = true;
  }

  // Vendor match (20% weight) - case-insensitive
  if (
    expense.vendor &&
    existing.vendor &&
    expense.vendor.toLowerCase().trim() === existing.vendor.toLowerCase().trim()
  ) {
    score += 0.20;
    reasons.push('Fournisseur identique');
    match_details.vendor = true;
  } else if (
    expense.vendor &&
    existing.vendor &&
    (expense.vendor.toLowerCase().includes(existing.vendor.toLowerCase()) ||
    existing.vendor.toLowerCase().includes(expense.vendor.toLowerCase()))
  ) {
    score += 0.10;
    reasons.push('Fournisseur similaire');
    match_details.vendor = false;
  }

  // Invoice number match (15% weight)
  if (
    expense.invoice_number &&
    existing.invoice_number &&
    expense.invoice_number === existing.invoice_number
  ) {
    score += 0.15;
    reasons.push('Numéro de facture identique');
    match_details.invoice_number = true;
  }

  // Category match (bonus 5%)
  if (
    expense.category &&
    existing.category &&
    expense.category === existing.category
  ) {
    score += 0.05;
    reasons.push('Catégorie identique');
  }

  // Description similarity (bonus 5%)
  if (
    expense.description &&
    existing.description &&
    expense.description.toLowerCase() === existing.description.toLowerCase()
  ) {
    score += 0.05;
    reasons.push('Description identique');
  }

  return { score, reasons, match_details };
}

// ---------------------------------------------------------------------------
// Helper: Generate image hash (basic implementation)
// ---------------------------------------------------------------------------

function generateImageHash(expense: any): string | null {
  // Basic hash using available data
  const components = [
    expense.vendor,
    expense.amount,
    expense.date,
    expense.invoice_number,
  ].filter(Boolean);

  if (components.length === 0) return null;

  // Simple hash function
  return components
    .join('|')
    .split('')
    .reduce((acc: number, char: string) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0)
    .toString(36);
}

// ---------------------------------------------------------------------------
// POST handler - Check for duplicates
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense, exclude_id } = await req.json();

    if (!expense) {
      return NextResponse.json(
        { error: 'Données de dépense manquantes' },
        { status: 400 }
      );
    }

    // Build query for similar expenses
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted');

    // Exclude current expense if updating
    if (exclude_id) {
      query = query.neq('id', exclude_id);
    }

    // Filter by vendor if available
    if (expense.vendor) {
      query = query.ilike('vendor', `%${expense.vendor}%`);
    }

    // Filter by date range (± 7 days)
    if (expense.date) {
      const expenseDate = new Date(expense.date);
      const minDate = new Date(expenseDate);
      minDate.setDate(minDate.getDate() - 7);
      const maxDate = new Date(expenseDate);
      maxDate.setDate(maxDate.getDate() + 7);

      query = query.gte('date', minDate.toISOString().split('T')[0])
                  .lte('date', maxDate.toISOString().split('T')[0]);
    }

    // Filter by amount (± 10%)
    if (expense.amount) {
      const minAmount = expense.amount * 0.9;
      const maxAmount = expense.amount * 1.1;

      query = query.gte('amount', minAmount)
                  .lte('amount', maxAmount);
    }

    const { data: similarExpenses, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate similarity scores
    const matches: DuplicateMatch[] = (similarExpenses || [])
      .map((existing) => {
        const { score, reasons, match_details } = calculateSimilarityScore(
          expense,
          existing
        );

        return {
          expense_id: existing.id,
          score,
          reasons,
          match_details,
          expense: {
            id: existing.id,
            vendor: existing.vendor,
            amount: existing.amount,
            date: existing.date,
            invoice_number: existing.invoice_number,
            receipt_url: existing.receipt_url,
          },
        };
      })
      .filter((match) => match.score >= 0.60) // Minimum threshold
      .sort((a, b) => b.score - a.score);

    // Update expense with duplicate check result
    if (expense.id && matches.length > 0) {
      const topMatch = matches[0];
      await supabase
        .from('expenses')
        .update({
          duplicate_check_performed: true,
          duplicate_of_expense_id: topMatch.expense_id,
          duplicate_score: topMatch.score,
        })
        .eq('id', expense.id);
    }

    const result: CheckResult = {
      has_duplicates: matches.length > 0,
      duplicates: matches,
      highest_score: matches.length > 0 ? matches[0].score : 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Duplicate Check] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la vérification des doublons' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get all duplicates for user
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get all expenses marked as duplicates
    const { data: duplicates, error } = await supabase
      .from('expenses')
      .select(`
        *,
        original_expense:expense_id!inner(*)
      `)
      .eq('user_id', user.id)
      .not('duplicate_of_expense_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      duplicates: duplicates || [],
      count: duplicates?.length || 0,
    });
  } catch (error) {
    console.error('[Get Duplicates] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des doublons' },
      { status: 500 }
    );
  }
}
