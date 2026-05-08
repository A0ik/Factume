import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsData {
  overview: {
    total_expenses: number;
    total_amount: number;
    pending_expenses: number;
    validated_expenses: number;
    this_month_amount: number;
    last_month_amount: number;
    month_over_month_change: number;
  };
  by_category: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  by_vendor: {
    vendor: string;
    amount: number;
    count: number;
    avg_amount: number;
  }[];
  over_time: {
    date: string;
    amount: number;
    count: number;
  }[];
  by_status: {
    status: string;
    count: number;
    amount: number;
  }[];
  ocr_performance: {
    avg_confidence: number;
    high_confidence_count: number;
    low_confidence_count: number;
    needs_review_count: number;
  };
  currency_breakdown: {
    currency: string;
    amount_eur: number;
    count: number;
  }[];
}

// ---------------------------------------------------------------------------
// Helper: Get date range for analytics
// ---------------------------------------------------------------------------

function getDateRange(period: string = '30d'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '12m':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'ytd':
      start.setMonth(0, 1); // January 1st
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

// ---------------------------------------------------------------------------
// Helper: Format date for grouping
// ---------------------------------------------------------------------------

function formatDateForGrouping(date: Date, groupBy: string): string {
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'year':
      return String(date.getFullYear());
    default:
      return date.toISOString().split('T')[0];
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get analytics data
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const group_by = searchParams.get('group_by') || 'day';

    const { start, end } = getDateRange(period);

    // Build analytics data
    const analytics: AnalyticsData = {
      overview: {
        total_expenses: 0,
        total_amount: 0,
        pending_expenses: 0,
        validated_expenses: 0,
        this_month_amount: 0,
        last_month_amount: 0,
        month_over_month_change: 0,
      },
      by_category: [],
      by_vendor: [],
      over_time: [],
      by_status: [],
      ocr_performance: {
        avg_confidence: 0,
        high_confidence_count: 0,
        low_confidence_count: 0,
        needs_review_count: 0,
      },
      currency_breakdown: [],
    };

    // Fetch all expenses in date range
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (!expenses || expenses.length === 0) {
      return NextResponse.json(analytics);
    }

    // Calculate overview
    analytics.overview.total_expenses = expenses.length;
    analytics.overview.total_amount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    analytics.overview.pending_expenses = expenses.filter(e => e.validation_status === 'pending').length;
    analytics.overview.validated_expenses = expenses.filter(e => e.validation_status === 'validated').length;

    // This month vs last month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const thisMonthExpenses = expenses.filter(e => new Date(e.date) >= thisMonthStart);
    const lastMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= lastMonthStart && d < thisMonthStart;
    });

    analytics.overview.this_month_amount = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    analytics.overview.last_month_amount = lastMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (analytics.overview.last_month_amount > 0) {
      analytics.overview.month_over_month_change =
        ((analytics.overview.this_month_amount - analytics.overview.last_month_amount) /
          analytics.overview.last_month_amount) * 100;
    }

    // By category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const expense of expenses) {
      if (expense.category) {
        const current = categoryMap.get(expense.category) || { amount: 0, count: 0 };
        current.amount += expense.amount || 0;
        current.count += 1;
        categoryMap.set(expense.category, current);
      }
    }

    analytics.by_category = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / analytics.overview.total_amount) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // By vendor
    const vendorMap = new Map<string, { amount: number; count: number }>();
    for (const expense of expenses) {
      if (expense.vendor) {
        const current = vendorMap.get(expense.vendor) || { amount: 0, count: 0 };
        current.amount += expense.amount || 0;
        current.count += 1;
        vendorMap.set(expense.vendor, current);
      }
    }

    analytics.by_vendor = Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({
        vendor,
        amount: data.amount,
        count: data.count,
        avg_amount: data.amount / data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20); // Top 20 vendors

    // Over time
    const timeMap = new Map<string, { amount: number; count: number }>();
    for (const expense of expenses) {
      const dateKey = formatDateForGrouping(new Date(expense.date), group_by);
      const current = timeMap.get(dateKey) || { amount: 0, count: 0 };
      current.amount += expense.amount || 0;
      current.count += 1;
      timeMap.set(dateKey, current);
    }

    analytics.over_time = Array.from(timeMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By status
    const statusMap = new Map<string, { count: number; amount: number }>();
    for (const expense of expenses) {
      const status = expense.validation_status || 'unknown';
      const current = statusMap.get(status) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += expense.amount || 0;
      statusMap.set(status, current);
    }

    analytics.by_status = Array.from(statusMap.entries())
      .map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => b.count - a.count);

    // OCR performance
    const confidences = expenses
      .map(e => e.ocr_confidence || e.category_confidence || 0)
      .filter(c => c > 0);

    if (confidences.length > 0) {
      analytics.ocr_performance.avg_confidence =
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      analytics.ocr_performance.high_confidence_count = confidences.filter(c => c >= 0.9).length;
      analytics.ocr_performance.low_confidence_count = confidences.filter(c => c < 0.7).length;
    }

    analytics.ocr_performance.needs_review_count = expenses.filter(
      e => (e.ocr_confidence || 0) < 0.8 || e.validation_status === 'manual_review'
    ).length;

    // Currency breakdown
    const currencyMap = new Map<string, { amount_eur: number; count: number }>();
    for (const expense of expenses) {
      const currency = expense.original_currency || 'EUR';
      const current = currencyMap.get(currency) || { amount_eur: 0, count: 0 };
      // amount is always stored in EUR in the database
      const amountInEur = expense.amount || 0;
      current.amount_eur += amountInEur;
      current.count += 1;
      currencyMap.set(currency, current);
    }

    analytics.currency_breakdown = Array.from(currencyMap.entries())
      .map(([currency, data]) => ({
        currency,
        amount_eur: Math.round(data.amount_eur * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount_eur - a.amount_eur);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler - Get custom analytics report
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { start_date, end_date, group_by, filters } = await req.json();

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Dates de début et fin requises' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start_date)
      .lte('date', end_date);

    // Apply filters
    if (filters?.category?.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters?.vendor?.length > 0) {
      query = query.in('vendor', filters.vendor);
    }
    if (filters?.status?.length > 0) {
      query = query.in('validation_status', filters.status);
    }
    if (filters?.min_amount !== undefined) {
      query = query.gte('amount', filters.min_amount);
    }
    if (filters?.max_amount !== undefined) {
      query = query.lte('amount', filters.max_amount);
    }
    if (filters?.tags?.length > 0) {
      // For tags, we need to join with expense_tags
      const { data: taggedExpenseIds } = await supabase
        .from('expense_tags')
        .select('expense_id')
        .in('tag_id', filters.tags);

      if (taggedExpenseIds && taggedExpenseIds.length > 0) {
        query = query.in('id', taggedExpenseIds.map(e => e.expense_id));
      } else {
        // No expenses match these tags
        return NextResponse.json({ expenses: [], summary: {} });
      }
    }
    if (filters?.folder_id) {
      query = query.eq('folder_id', filters.folder_id);
    }

    const { data: expenses } = await query;

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ expenses: [], summary: {} });
    }

    // Calculate summary
    const summary = {
      total_count: expenses.length,
      total_amount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      avg_amount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0) / expenses.length,
      by_category: {} as Record<string, number>,
      by_vendor: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    };

    for (const expense of expenses) {
      if (expense.category) {
        summary.by_category[expense.category] =
          (summary.by_category[expense.category] || 0) + (expense.amount || 0);
      }
      if (expense.vendor) {
        summary.by_vendor[expense.vendor] =
          (summary.by_vendor[expense.vendor] || 0) + (expense.amount || 0);
      }
      if (expense.validation_status) {
        summary.by_status[expense.validation_status] =
          (summary.by_status[expense.validation_status] || 0) + 1;
      }
    }

    return NextResponse.json({
      expenses,
      summary,
    });
  } catch (error) {
    console.error('[Custom Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    );
  }
}
