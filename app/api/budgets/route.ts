import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Budget {
  id?: string;
  name: string;
  category?: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  alert_threshold: number; // Percentage (0-100)
  is_active: boolean;
}

interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
  days_remaining: number;
  avg_daily_spend: number;
  projected_spend: number;
  projected_over: number;
}

// ---------------------------------------------------------------------------
// GET handler - Get budgets with status
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const is_active = searchParams.get('active');

    // Get budgets
    let query = supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: budgets } = await query;

    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ budgets: [], statuses: [] });
    }

    // Calculate status for each budget
    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      const status = await calculateBudgetStatus(budget, supabase, user.id);
      statuses.push(status);
    }

    return NextResponse.json({
      budgets: budgets || [],
      statuses,
      alerts: statuses.filter(s => s.status !== 'ok'),
    });
  } catch (error) {
    console.error('[Get Budgets] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des budgets' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Calculate budget status
// ---------------------------------------------------------------------------

async function calculateBudgetStatus(
  budget: Budget,
  supabase: any,
  userId: string
): Promise<BudgetStatus> {
  const now = new Date();
  const startDate = new Date(budget.start_date);
  const endDate = budget.end_date ? new Date(budget.end_date) : null;

  // Get expenses in budget period
  let expenseQuery = supabase
    .from('expenses')
    .select('amount, date')
    .eq('user_id', userId)
    .gte('date', budget.start_date);

  if (endDate) {
    expenseQuery = expenseQuery.lte('date', budget.end_date);
  } else {
    // If no end date, use period to calculate end date
    const periodEnd = new Date(startDate);
    switch (budget.period) {
      case 'weekly':
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'yearly':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
    }
    expenseQuery = expenseQuery.lte('date', periodEnd.toISOString().split('T')[0]);
  }

  if (budget.category) {
    expenseQuery = expenseQuery.eq('category', budget.category);
  }

  const { data: expenses } = await expenseQuery;

  const spent = expenses?.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
  const remaining = budget.amount - spent;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

  // Calculate days remaining
  const periodEnd = endDate || new Date(startDate);
  const daysRemaining = Math.max(0, Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Calculate average daily spend
  const daysElapsed = Math.max(1, Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  const avgDailySpend = spent / daysElapsed;

  // Project total spend at current rate
  const totalDays = Math.ceil((periodEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const projectedSpend = avgDailySpend * totalDays;
  const projectedOver = Math.max(0, projectedSpend - budget.amount);

  // Determine status
  let status: BudgetStatus['status'] = 'ok';
  if (percentage >= 100) {
    status = 'exceeded';
  } else if (percentage >= budget.alert_threshold) {
    status = 'warning';
  }

  return {
    budget,
    spent: Math.round(spent * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    status,
    days_remaining: daysRemaining,
    avg_daily_spend: Math.round(avgDailySpend * 100) / 100,
    projected_spend: Math.round(projectedSpend * 100) / 100,
    projected_over: Math.round(projectedOver * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// POST handler - Create budget
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const budgetData = await req.json();

    if (!budgetData.name || !budgetData.amount || !budgetData.period || !budgetData.start_date) {
      return NextResponse.json(
        { error: 'Nom, montant, période et date de début requis' },
        { status: 400 }
      );
    }

    // Calculate end_date if not provided
    let endDate = budgetData.end_date;
    if (!endDate) {
      const start = new Date(budgetData.start_date);
      const end = new Date(start);

      switch (budgetData.period) {
        case 'weekly':
          end.setDate(end.getDate() + 7);
          break;
        case 'monthly':
          end.setMonth(end.getMonth() + 1);
          break;
        case 'quarterly':
          end.setMonth(end.getMonth() + 3);
          break;
        case 'yearly':
          end.setFullYear(end.getFullYear() + 1);
          break;
      }

      endDate = end.toISOString().split('T')[0];
    }

    const { data: budget, error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        name: budgetData.name,
        category: budgetData.category || null,
        amount: budgetData.amount,
        period: budgetData.period,
        start_date: budgetData.start_date,
        end_date: endDate,
        alert_threshold: budgetData.alert_threshold || 80,
        is_active: budgetData.is_active !== undefined ? budgetData.is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    // Calculate initial status
    const status = await calculateBudgetStatus(budget, supabase, user.id);

    return NextResponse.json({
      success: true,
      budget,
      status,
      message: 'Budget créé',
    }, { status: 201 });
  } catch (error) {
    console.error('[Create Budget] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update budget
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { budget_id, ...updates } = await req.json();

    if (!budget_id) {
      return NextResponse.json(
        { error: 'ID de budget requis' },
        { status: 400 }
      );
    }

    const { data: budget, error } = await supabase
      .from('budgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budget_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!budget) {
      return NextResponse.json({ error: 'Budget introuvable' }, { status: 404 });
    }

    // Recalculate status
    const status = await calculateBudgetStatus(budget, supabase, user.id);

    return NextResponse.json({
      success: true,
      budget,
      status,
      message: 'Budget mis à jour',
    });
  } catch (error) {
    console.error('[Update Budget] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete budget
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const budget_id = searchParams.get('budget_id');

    if (!budget_id) {
      return NextResponse.json(
        { error: 'ID de budget requis' },
        { status: 400 }
      );
    }

    await supabase
      .from('budgets')
      .delete()
      .eq('id', budget_id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Budget supprimé',
    });
  } catch (error) {
    console.error('[Delete Budget] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
