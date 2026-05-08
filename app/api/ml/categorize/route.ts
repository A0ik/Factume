import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategorizationSuggestion {
  category: string;
  confidence: number;
  reasoning: string;
  based_on: 'vendor_history' | 'description_pattern' | 'amount_range' | 'ml_model';
}

interface CategoryRule {
  vendor_name?: string;
  vendor_pattern?: string;
  description_pattern?: string;
  category: string;
  confidence: number;
  sample_count: number;
}

// ---------------------------------------------------------------------------
// Helper: Suggest category based on vendor history
// ---------------------------------------------------------------------------

async function suggestFromVendorHistory(
  vendor: string,
  userId: string,
  supabase: any
): Promise<CategorizationSuggestion | null> {
  // PostgREST ne supporte pas GROUP BY — on charge les données et on agrège en JS
  const { data: history } = await supabase
    .from('expenses')
    .select('category')
    .eq('user_id', userId)
    .ilike('vendor', `%${vendor}%`)
    .not('category', 'is', null);

  if (!history || history.length === 0) return null;

  // Count occurrences per category
  const counts = new Map<string, number>();
  for (const row of history) {
    if (row.category) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  // Find the most frequent category
  let topCategory = '';
  let topCount = 0;
  for (const [cat, count] of counts) {
    if (count > topCount) { topCategory = cat; topCount = count; }
  }

  const totalCount = history.length;
  const confidence = Math.min(0.95, topCount / totalCount);

  return {
    category: topCategory,
    confidence,
    reasoning: `Catégorie la plus fréquente pour ce fournisseur (${topCount}/${totalCount} dépenses)`,
    based_on: 'vendor_history',
  };
}

// ---------------------------------------------------------------------------
// Helper: Suggest category based on description patterns
// ---------------------------------------------------------------------------

async function suggestFromDescriptionPatterns(
  description: string,
  vendor: string,
  userId: string,
  supabase: any
): Promise<CategorizationSuggestion | null> {
  const keywords = description.toLowerCase().split(/\s+/);

  // Get existing rules
  const { data: rules } = await supabase
    .from('categorization_rules')
    .select('*')
    .eq('user_id', userId);

  if (!rules || rules.length === 0) return null;

  for (const rule of rules) {
    // Check vendor pattern — validate before compiling to prevent ReDoS
    if (rule.vendor_pattern) {
      let vendorRegex: RegExp;
      try {
        vendorRegex = new RegExp(rule.vendor_pattern, 'i');
      } catch {
        continue; // Invalid regex stored in DB — skip this rule
      }
      if (!vendorRegex.test(vendor)) continue;
    }

    // Check description pattern — same ReDoS guard
    if (rule.description_pattern) {
      let descRegex: RegExp;
      try {
        descRegex = new RegExp(rule.description_pattern, 'i');
      } catch {
        continue;
      }
      if (!descRegex.test(description)) continue;
    }

    return {
      category: rule.category,
      confidence: rule.confidence,
      reasoning: 'Règle personnalisée détectée',
      based_on: 'description_pattern',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: Suggest category based on amount ranges
// ---------------------------------------------------------------------------

async function suggestFromAmountRange(
  amount: number,
  userId: string,
  supabase: any
): Promise<CategorizationSuggestion | null> {
  // Typical amount ranges for categories (in EUR)
  const categoryRanges = [
    { category: 'equipment', min: 100, max: 10000 },
    { category: 'accommodation', min: 50, max: 500 },
    { category: 'telecom', min: 20, max: 150 },
    { category: 'insurance', min: 50, max: 300 },
    { category: 'software', min: 10, max: 200 },
    { category: 'office', min: 5, max: 100 },
    { category: 'shopping', min: 20, max: 500 },
  ];

  for (const range of categoryRanges) {
    if (amount >= range.min && amount <= range.max) {
      // Verify this category is used by the user
      const { data: existing } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category', range.category)
        .gte('amount', range.min)
        .lte('amount', range.max);

      if (existing.count > 0) {
        return {
          category: range.category,
          confidence: 0.6,
          reasoning: `Montant typique pour cette catégorie (${range.min}-${range.max} €)`,
          based_on: 'amount_range',
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: Learn from user correction
// ---------------------------------------------------------------------------

async function learnFromCorrection(
  expenseId: string,
  suggestedCategory: string,
  finalCategory: string,
  userId: string,
  supabase: any
): Promise<void> {
  // Record feedback
  await supabase.from('categorization_feedback').insert({
    user_id: userId,
    expense_id: expenseId,
    suggested_category: suggestedCategory,
    final_category: finalCategory,
    is_correct: suggestedCategory === finalCategory,
  });

  if (suggestedCategory !== finalCategory) {
    // Get expense details for rule creation
    const { data: expense } = await supabase
      .from('expenses')
      .select('vendor, description, category')
      .eq('id', expenseId)
      .single();

    if (!expense) return;

    // Check if a rule already exists for this vendor
    const { data: existingRule } = await supabase
      .from('categorization_rules')
      .select('*')
      .eq('user_id', userId)
      .ilike('vendor_name', expense.vendor)
      .single();

    if (existingRule) {
      // Update rule
      await supabase
        .from('categorization_rules')
        .update({
          category: finalCategory,
          confidence: Math.min(0.95, existingRule.confidence + 0.1),
          correction_count: (existingRule.correction_count || 0) + 1,
          last_applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRule.id);
    } else {
      // Create new rule
      await supabase.from('categorization_rules').insert({
        user_id: userId,
        vendor_name: expense.vendor,
        category: finalCategory,
        confidence: 0.7,
        correction_count: 1,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// POST handler - Suggest category for an expense
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

    const { expense_id, vendor, description, amount } = await req.json();

    if (!vendor && !expense_id) {
      return NextResponse.json(
        { error: 'Fournisseur ou ID de dépense requis' },
        { status: 400 }
      );
    }

    // If expense_id provided, fetch expense details
    let expenseVendor = vendor;
    let expenseDescription = description;
    let expenseAmount = amount;
    let expenseCategory = null;

    if (expense_id) {
      const { data: expense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense_id)
        .eq('user_id', user.id)
        .single();

      if (!expense) {
        return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
      }

      expenseVendor = expense.vendor;
      expenseDescription = expense.description;
      expenseAmount = expense.amount;
      expenseCategory = expense.category;
    }

    // Get suggestions from different sources
    const suggestions: CategorizationSuggestion[] = [];

    // 1. Vendor history (highest priority)
    const vendorSuggestion = await suggestFromVendorHistory(
      expenseVendor!,
      user.id,
      supabase
    );
    if (vendorSuggestion) {
      suggestions.push(vendorSuggestion);
    }

    // 2. Description patterns
    const patternSuggestion = await suggestFromDescriptionPatterns(
      expenseDescription || '',
      expenseVendor || '',
      user.id,
      supabase
    );
    if (patternSuggestion) {
      suggestions.push(patternSuggestion);
    }

    // 3. Amount ranges
    if (expenseAmount) {
      const amountSuggestion = await suggestFromAmountRange(
        expenseAmount,
        user.id,
        supabase
      );
      if (amountSuggestion) {
        suggestions.push(amountSuggestion);
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Remove duplicates (keep highest confidence)
    const seen = new Set<string>();
    const uniqueSuggestions = suggestions.filter(s => {
      if (seen.has(s.category)) return false;
      seen.add(s.category);
      return true;
    });

    return NextResponse.json({
      suggestions: uniqueSuggestions.slice(0, 3), // Top 3 suggestions
      current_category: expenseCategory,
      confidence: uniqueSuggestions.length > 0 ? uniqueSuggestions[0].confidence : 0,
    });
  } catch (error) {
    console.error('[Categorize ML] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suggestion de catégorie' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Apply category and record feedback
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

    const { expense_id, category, suggested_category } = await req.json();

    if (!expense_id || !category) {
      return NextResponse.json(
        { error: 'ID de dépense et catégorie requis' },
        { status: 400 }
      );
    }

    // Get current category for feedback
    const { data: currentExpense } = await supabase
      .from('expenses')
      .select('category')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (!currentExpense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Update expense
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update({
        category,
        category_suggested: suggested_category || currentExpense.category,
        category_confidence: suggested_category ? 0.7 : 1,
        category_auto_applied: !!suggested_category,
      })
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Learn from this correction
    await learnFromCorrection(
      expense_id,
      suggested_category || currentExpense.category,
      category,
      user.id,
      supabase
    );

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
      message: 'Catégorie mise à jour et apprentissage enregistré',
    });
  } catch (error) {
    console.error('[Categorize ML Apply] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get user's categorization rules
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

    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('confidence', { ascending: false });

    return NextResponse.json({
      rules: rules || [],
      count: rules?.length || 0,
    });
  } catch (error) {
    console.error('[Get Categorization Rules] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des règles' },
      { status: 500 }
    );
  }
}
