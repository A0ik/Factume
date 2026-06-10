import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurringPattern {
  id?: string;
  user_id: string;
  name: string;
  vendor: string;
  amount: number;
  amount_variance: number;
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequency_days: number;
  category: string;
  last_occurrence: string;
  next_expected: string;
  occurrences: number;
  confidence: number;
  is_active: boolean;
  auto_detect: boolean;
}

interface BudgetAlert {
  budget_id: string;
  budget_name: string;
  category: string;
  spent: number;
  budget_limit: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
  remaining: number;
  period_start: string;
  period_end: string;
}

// ---------------------------------------------------------------------------
// POST handler - Analyze recurring patterns
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Subscription gate: Recurring analysis requires Pro plan or above
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'recurringInvoices');
    } catch (err: any) {
      const [, feature, message] = err.message.split(':');
      return NextResponse.json({
        error: message || 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        feature,
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const { analyze_from } = await req.json();

    // Fetch expenses
    let query = supabase
      .from('expenses')
      .select('id, vendor, amount, date, category, description')
      .eq('user_id', user.id)
      .not('validation_status', 'is', null)
      .order('date', { ascending: true });

    if (analyze_from) {
      query = query.gte('date', analyze_from);
    }

    const { data: expenses } = await query;

    if (!expenses || expenses.length < 2) {
      return NextResponse.json({
        patterns: [],
        message: 'Pas assez de dépenses pour détecter des patterns',
      });
    }

    // Detect recurring patterns
    const patterns = await detectRecurringPatterns(expenses, user.id, supabase);

    return NextResponse.json({
      patterns,
      count: patterns.length,
    });
  } catch (error) {
    console.error('[Analyze Recurring] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Detect recurring patterns
// ---------------------------------------------------------------------------

async function detectRecurringPatterns(
  expenses: any[],
  userId: string,
  supabase: any
): Promise<RecurringPattern[]> {
  const patterns: RecurringPattern[] = [];

  // Group by vendor (normalized)
  const vendorGroups = new Map<string, any[]>();

  for (const expense of expenses) {
    if (!expense.vendor) continue;

    const normalized = expense.vendor.toLowerCase().trim().replace(/\s+/g, ' ');
    const group = vendorGroups.get(normalized) || [];
    group.push(expense);
    vendorGroups.set(normalized, group);
  }

  // Analyze each vendor group
  for (const [vendorName, group] of vendorGroups) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check amount consistency
    const amounts = sorted.map(e => e.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    // Skip free/zero-amount entries to avoid division by zero
    if (avgAmount === 0) continue;

    const variance = Math.max(
      ...amounts.map(a => Math.abs(a - avgAmount))
    ) / avgAmount;

    // Skip if amounts vary too much (>30%)
    if (variance > 0.3) continue;

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round(
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime())
        / (1000 * 60 * 60 * 24)
      );
      if (days > 0) intervals.push(days);
    }

    if (intervals.length === 0) continue;

    // Detect frequency
    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
    const frequency = detectFrequencyFromInterval(avgInterval);

    // Calculate confidence based on consistency
    const intervalVariance = Math.max(...intervals) - Math.min(...intervals);
    const confidence = Math.max(0, 1 - (intervalVariance / avgInterval));

    // Only include if confidence > 0.6
    if (confidence < 0.6) continue;

    const lastDate = sorted[sorted.length - 1].date;
    const nextExpected = calculateNextExpected(lastDate, avgInterval);
    const mostCommonCategory = getMostCommon(sorted.map(e => e.category));

    patterns.push({
      user_id: userId,
      name: `${vendorName} - ${frequency}`,
      vendor: sorted[0].vendor,
      amount: parseFloat(avgAmount.toFixed(2)),
      amount_variance: parseFloat(variance.toFixed(3)),
      frequency,
      frequency_days: Math.round(avgInterval),
      category: mostCommonCategory,
      last_occurrence: lastDate,
      next_expected: nextExpected,
      occurrences: sorted.length,
      confidence: parseFloat(confidence.toFixed(2)),
      is_active: true,
      auto_detect: true,
    });
  }

  // Sort by confidence and occurrences
  patterns.sort((a, b) =>
    b.confidence - a.confidence || b.occurrences - a.occurrences
  );

  return patterns.slice(0, 20); // Top 20 patterns
}

// ---------------------------------------------------------------------------
// Helper: Detect frequency from average interval
// ---------------------------------------------------------------------------

function detectFrequencyFromInterval(avgDays: number): RecurringPattern['frequency'] {
  if (avgDays >= 4 && avgDays <= 10) return 'weekly';
  if (avgDays >= 11 && avgDays <= 18) return 'bi_weekly';
  if (avgDays >= 25 && avgDays <= 35) return 'monthly';
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly';
  if (avgDays >= 350 && avgDays <= 380) return 'yearly';
  return 'custom';
}

// ---------------------------------------------------------------------------
// Helper: Calculate next expected date
// ---------------------------------------------------------------------------

function calculateNextExpected(lastDate: string, intervalDays: number): string {
  const next = new Date(lastDate);
  next.setDate(next.getDate() + Math.round(intervalDays));
  return next.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Helper: Get most common value
// ---------------------------------------------------------------------------

function getMostCommon<T>(arr: T[]): T | null {
  const counts = new Map<T, number>();
  for (const item of arr) {
    if (item != null) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
  }

  let best: T | null = null;
  let bestCount = 0;

  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// GET handler - Get saved recurring patterns
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: patterns } = await supabase
      .from('recurring_patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('confidence', { ascending: false });

    return NextResponse.json({
      patterns: patterns || [],
      count: patterns?.length || 0,
    });
  } catch (error) {
    console.error('[Get Recurring Patterns] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler - Save/update recurring pattern
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const pattern = await req.json();

    if (!pattern.name || !pattern.vendor || !pattern.amount) {
      return NextResponse.json(
        { error: 'Nom, fournisseur et montant requis' },
        { status: 400 }
      );
    }

    // Check for existing pattern with same vendor
    const { data: existing } = await supabase
      .from('recurring_patterns')
      .select('id')
      .eq('user_id', user.id)
      .ilike('vendor', pattern.vendor)
      .single();

    let result;

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('recurring_patterns')
        .update({
          ...pattern,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create
      const { data, error } = await supabase
        .from('recurring_patterns')
        .insert({
          ...pattern,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      pattern: result,
      message: existing ? 'Pattern mis à jour' : 'Pattern créé',
    });
  } catch (error) {
    console.error('[Save Recurring Pattern] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete recurring pattern
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pattern_id = searchParams.get('pattern_id');

    if (!pattern_id) {
      return NextResponse.json(
        { error: 'ID de pattern requis' },
        { status: 400 }
      );
    }

    await supabase
      .from('recurring_patterns')
      .update({ is_active: false })
      .eq('id', pattern_id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Pattern désactivé',
    });
  } catch (error) {
    console.error('[Delete Recurring Pattern] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
