import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Frequency detection thresholds
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_DAYS = 7;

const FREQUENCY_WINDOWS: Record<string, { avgDays: number; label: string }> = {
  monthly:   { avgDays: 30,  label: 'monthly' },
  quarterly: { avgDays: 90,  label: 'quarterly' },
  yearly:    { avgDays: 365, label: 'yearly' },
};

interface ExpenseRow {
  id: string;
  vendor: string | null;
  amount: number;
  date: string;
  category: string | null;
}

interface RecurringResult {
  vendor: string;
  average_amount: number;
  frequency: string;
  next_expected_date: string;
  occurrences: number;
  last_date: string;
  category: string | null;
}

// ---------------------------------------------------------------------------
// GET — Detect recurring expenses from expense history
// Business/trial only
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Subscription check — business or active trial only
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial_active')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  }

  const isBusiness = profile.subscription_tier === 'business';
  const isTrial = profile.is_trial_active === true;

  if (!isBusiness && !isTrial) {
    return NextResponse.json(
      {
        error:
          'La detection des charges recurrentes est disponible uniquement avec le plan Business.',
        feature: 'detect-recurring',
        requiredPlan: 'business',
        upgradeUrl: '/paywall?plan=business',
      },
      { status: 402 },
    );
  }

  // Fetch all expenses for the user, ordered by date
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('id, vendor, amount, date, category')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expenses || expenses.length === 0) {
    return NextResponse.json({ recurring: [] });
  }

  // Run detection algorithm
  const recurring = detectRecurring(expenses);

  return NextResponse.json({ recurring });
}

// ---------------------------------------------------------------------------
// Detection algorithm
// ---------------------------------------------------------------------------
function detectRecurring(expenses: ExpenseRow[]): RecurringResult[] {
  const results: RecurringResult[] = [];

  // 1. Group by normalized vendor name
  const vendorGroups = new Map<string, ExpenseRow[]>();

  for (const exp of expenses) {
    if (!exp.vendor) continue;

    const normalized = exp.vendor.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!normalized) continue;

    const group = vendorGroups.get(normalized) || [];
    group.push(exp);
    vendorGroups.set(normalized, group);
  }

  // 2. Analyze each vendor with 2+ expenses
  for (const [vendor, groupExpenses] of vendorGroups) {
    if (groupExpenses.length < 2) continue;

    // Sort by date (should already be sorted, but ensure it)
    const sorted = [...groupExpenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // a. Check if amounts are similar (within 10%)
    const amounts = sorted.map((e) => e.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    const allAmountsSimilar = amounts.every((a) => {
      if (avgAmount === 0) return a === 0;
      return Math.abs(a - avgAmount) / avgAmount <= 0.1;
    });

    if (!allAmountsSimilar) continue;

    // b. Check if dates are roughly periodic
    const dates = sorted.map((e) => new Date(e.date).getTime());
    const intervals: number[] = [];

    for (let i = 1; i < dates.length; i++) {
      const diffDays = Math.round((dates[i] - dates[i - 1]) / DAY_MS);
      if (diffDays > 0) {
        intervals.push(diffDays);
      }
    }

    if (intervals.length === 0) continue;

    // c. Detect frequency
    const frequency = detectFrequency(intervals);
    if (!frequency) continue;

    // d. Compute next expected date
    const lastDate = sorted[sorted.length - 1].date;
    const avgInterval = Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length);
    const nextExpected = new Date(lastDate);
    nextExpected.setDate(nextExpected.getDate() + avgInterval);

    // Use the most common category from the group
    const category = mostCommonCategory(sorted);

    results.push({
      vendor: sorted[0].vendor || vendor, // preserve original casing
      average_amount: parseFloat(avgAmount.toFixed(2)),
      frequency,
      next_expected_date: nextExpected.toISOString().slice(0, 10),
      occurrences: sorted.length,
      last_date: lastDate,
      category,
    });
  }

  // Sort by occurrences descending (most recurring first)
  results.sort((a, b) => b.occurrences - a.occurrences);

  return results;
}

/**
 * Given an array of day-intervals between expenses, determine if they follow
 * a periodic pattern (monthly, quarterly, or yearly) within a tolerance of +-7 days.
 */
function detectFrequency(intervals: number[]): string | null {
  // Check each frequency window
  for (const { avgDays, label } of Object.values(FREQUENCY_WINDOWS)) {
    const allWithinTolerance = intervals.every(
      (interval) => Math.abs(interval - avgDays) <= TOLERANCE_DAYS,
    );

    if (allWithinTolerance) {
      return label;
    }
  }

  // Also try to detect a custom consistent interval
  // If all intervals are within +-7 days of their average, it might be a custom frequency
  if (intervals.length >= 2) {
    const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;
    const allConsistent = intervals.every(
      (interval) => Math.abs(interval - avgInterval) <= TOLERANCE_DAYS,
    );

    if (allConsistent) {
      // Round to nearest common label
      const roundedAvg = Math.round(avgInterval);
      if (roundedAvg <= 35) return 'monthly';
      if (roundedAvg <= 100) return 'quarterly';
      if (roundedAvg <= 380) return 'yearly';
      // Generic custom frequency
      return `~${roundedAvg} days`;
    }
  }

  return null;
}

/**
 * Return the most frequently occurring category in a group of expenses.
 */
function mostCommonCategory(expenses: ExpenseRow[]): string | null {
  const counts = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.category) {
      counts.set(exp.category, (counts.get(exp.category) || 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;

  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }

  return best;
}
