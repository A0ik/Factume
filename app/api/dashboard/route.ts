import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'list' | 'table' | 'calendar' | 'budget';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  data_source?: string;
  data?: any;
}

interface DashboardConfig {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  layout: 'grid' | 'masonry';
  widgets: DashboardWidget[];
  theme: 'light' | 'dark' | 'auto';
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// GET handler - Get dashboard config
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dashboard_id = searchParams.get('dashboard_id');

    let config;

    if (dashboard_id) {
      const { data } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('id', dashboard_id)
        .eq('user_id', user.id)
        .single();

      config = data;
    } else {
      // Get default dashboard
      const { data } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      config = data;
    }

    // If no config exists, create default
    if (!config) {
      const defaultConfig = await createDefaultDashboard(user.id, supabase);
      config = defaultConfig;
    }

    // Get data for widgets
    const widgetsWithData = await populateWidgetData(config.widgets, user.id, supabase);

    return NextResponse.json({
      config: {
        ...config,
        widgets: widgetsWithData,
      },
    });
  } catch (error) {
    console.error('[Get Dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du dashboard' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Create default dashboard
// ---------------------------------------------------------------------------

async function createDefaultDashboard(userId: string, supabase: any): Promise<DashboardConfig> {
  const defaultWidgets: DashboardWidget[] = [
    {
      id: 'stat-total',
      type: 'stat',
      title: 'Total des dépenses',
      position: { x: 0, y: 0, w: 3, h: 2 },
      config: {
        metric: 'total_amount',
        period: 'this_month',
        format: 'currency',
        show_change: true,
      },
    },
    {
      id: 'stat-pending',
      type: 'stat',
      title: 'En attente',
      position: { x: 3, y: 0, w: 3, h: 2 },
      config: {
        metric: 'pending_count',
        format: 'number',
        show_trend: true,
      },
    },
    {
      id: 'chart-spending',
      type: 'chart',
      title: 'Dépenses par catégorie',
      position: { x: 0, y: 2, w: 6, h: 4 },
      config: {
        chart_type: 'pie',
        data_source: 'category_breakdown',
        period: 'this_month',
      },
    },
    {
      id: 'list-recent',
      type: 'list',
      title: 'Dépenses récentes',
      position: { x: 6, y: 0, w: 6, h: 4 },
      config: {
        limit: 5,
        show_thumbnail: true,
      },
    },
    {
      id: 'chart-trend',
      type: 'chart',
      title: 'Tendance des dépenses',
      position: { x: 6, y: 4, w: 6, h: 4 },
      config: {
        chart_type: 'line',
        data_source: 'spending_over_time',
        period: '30d',
      },
    },
    {
      id: 'budget-overview',
      type: 'budget',
      title: 'Aperçu des budgets',
      position: { x: 0, y: 6, w: 12, h: 3 },
      config: {
        show_alerts: true,
      },
    },
  ];

  const { data } = await supabase
    .from('dashboard_configs')
    .insert({
      user_id: userId,
      name: 'Tableau de bord',
      is_default: true,
      layout: 'grid',
      widgets: defaultWidgets,
      theme: 'auto',
    })
    .select()
    .single();

  return data;
}

// ---------------------------------------------------------------------------
// Helper: Populate widget data
// ---------------------------------------------------------------------------

async function populateWidgetData(
  widgets: DashboardWidget[],
  userId: string,
  supabase: any
): Promise<DashboardWidget[]> {
  const populated = [...widgets];

  for (let i = 0; i < populated.length; i++) {
    const widget = populated[i];

    switch (widget.type) {
      case 'stat':
        widget.data = await getStatWidgetData(widget.config, userId, supabase);
        break;

      case 'chart':
        widget.data = await getChartWidgetData(widget.config, userId, supabase);
        break;

      case 'list':
        widget.data = await getListWidgetData(widget.config, userId, supabase);
        break;

      case 'table':
        widget.data = await getTableWidgetData(widget.config, userId, supabase);
        break;

      case 'budget':
        widget.data = await getBudgetWidgetData(widget.config, userId, supabase);
        break;

      case 'calendar':
        widget.data = await getCalendarWidgetData(widget.config, userId, supabase);
        break;
    }
  }

  return populated;
}

// ---------------------------------------------------------------------------
// Widget data fetchers
// ---------------------------------------------------------------------------

async function getStatWidgetData(config: any, userId: string, supabase: any) {
  const period = config.period || 'this_month';
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_week':
      startDate.setDate(now.getDate() - now.getDay());
      break;
    case 'this_month':
      startDate.setDate(1);
      break;
    case 'this_year':
      startDate.setMonth(0, 1);
      break;
    default:
      startDate.setDate(1);
  }

  switch (config.metric) {
    case 'total_amount': {
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0]);

      const total = data?.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
      return { value: total, label: formatValue(total, config.format) };
    }

    case 'pending_count': {
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('validation_status', 'pending');

      return { value: count, label: String(count || 0) };
    }

    case 'expense_count': {
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0]);

      return { value: count, label: String(count || 0) };
    }

    default:
      return { value: 0, label: 'N/A' };
  }
}

async function getChartWidgetData(config: any, userId: string, supabase: any) {
  const period = config.period || '30d';
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - parseInt(period));

  if (config.data_source === 'category_breakdown') {
    const { data } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0]);

    const categoryMap = new Map<string, number>();
    for (const e of data || []) {
      if (e.category) {
        categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + (e.amount || 0));
      }
    }

    return {
      labels: Array.from(categoryMap.keys()),
      data: Array.from(categoryMap.values()),
    };
  }

  if (config.data_source === 'spending_over_time') {
    const { data } = await supabase
      .from('expenses')
      .select('date, amount')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    const dateMap = new Map<string, number>();
    for (const e of data || []) {
      const date = e.date?.split('T')[0];
      if (date) {
        dateMap.set(date, (dateMap.get(date) || 0) + (e.amount || 0));
      }
    }

    return {
      labels: Array.from(dateMap.keys()),
      data: Array.from(dateMap.values()),
    };
  }

  return { labels: [], data: [] };
}

async function getListWidgetData(config: any, userId: string, supabase: any) {
  const limit = config.limit || 5;

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getTableWidgetData(config: any, userId: string, supabase: any) {
  const limit = config.limit || 10;
  const ALLOWED_SORT_COLUMNS = ['date', 'amount', 'vendor', 'category', 'created_at'];
  const sortBy = ALLOWED_SORT_COLUMNS.includes(config.sort_by) ? config.sort_by : 'date';
  const sortOrder = config.sort_order === 'asc' ? 'asc' : 'desc';

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit);

  return {
    columns: config.columns || ['date', 'vendor', 'amount', 'category'],
    rows: data || [],
  };
}

async function getBudgetWidgetData(config: any, userId: string, supabase: any) {
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!budgets || budgets.length === 0) {
    return { budgets: [], alerts: [] };
  }

  // Find the widest date range across all budgets to do a single expenses fetch
  const allStartDates = budgets.map((b: any) => b.start_date).filter(Boolean);
  const allEndDates = budgets.map((b: any) => b.end_date).filter(Boolean);
  const minStart = allStartDates.length > 0 ? allStartDates.sort()[0] : null;
  const maxEnd = allEndDates.length > 0 ? allEndDates.sort().reverse()[0] : null;

  let expensesQuery = supabase
    .from('expenses')
    .select('amount, date, category')
    .eq('user_id', userId);

  if (minStart) expensesQuery = expensesQuery.gte('date', minStart);
  if (maxEnd) expensesQuery = expensesQuery.lte('date', maxEnd);

  const { data: allExpenses } = await expensesQuery;
  const expenses: { amount: number; date: string; category: string | null }[] = allExpenses || [];

  const budgetsWithStatus = budgets.map((budget: any) => {
    const spent = expenses
      .filter((e) => {
        const afterStart = !budget.start_date || e.date >= budget.start_date;
        const beforeEnd = !budget.end_date || e.date <= budget.end_date;
        const matchCategory = !budget.category || e.category === budget.category;
        return afterStart && beforeEnd && matchCategory;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentage: Math.round(percentage * 10) / 10,
      status: percentage >= 100 ? 'exceeded' : percentage >= (budget.alert_threshold || 80) ? 'warning' : 'ok',
    };
  });

  return {
    budgets: budgetsWithStatus,
    alerts: budgetsWithStatus.filter((b: any) => b.status !== 'ok'),
  };
}

async function getCalendarWidgetData(config: any, userId: string, supabase: any) {
  const month = config.month || new Date().toISOString().slice(0, 7);

  const { data } = await supabase
    .from('expenses')
    .select('date, amount, vendor')
    .eq('user_id', userId)
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`)
    .order('date', { ascending: true });

  const dateMap = new Map<string, { total: number; count: number; vendors: string[] }>();

  for (const e of data || []) {
    const date = e.date?.split('T')[0];
    if (date) {
      const existing = dateMap.get(date) || { total: 0, count: 0, vendors: [] };
      existing.total += e.amount || 0;
      existing.count += 1;
      if (e.vendor && !existing.vendors.includes(e.vendor)) {
        existing.vendors.push(e.vendor);
      }
      dateMap.set(date, existing);
    }
  }

  return Object.fromEntries(dateMap);
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
    case 'percent':
      return `${Math.round(value)}%`;
    case 'number':
      return new Intl.NumberFormat('fr-FR').format(value);
    default:
      return String(value);
  }
}

// ---------------------------------------------------------------------------
// POST handler - Save dashboard config
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { name, layout, widgets, theme, is_default } = await req.json();

    if (!widgets || !Array.isArray(widgets)) {
      return NextResponse.json(
        { error: 'Widgets requis' },
        { status: 400 }
      );
    }

    // If setting as default, remove default from others
    if (is_default) {
      await supabase
        .from('dashboard_configs')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('dashboard_configs')
      .insert({
        user_id: user.id,
        name: name || 'Mon tableau de bord',
        layout: layout || 'grid',
        widgets,
        theme: theme || 'auto',
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      config: data,
      message: 'Dashboard créé',
    }, { status: 201 });
  } catch (error) {
    console.error('[Save Dashboard] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update dashboard config
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { dashboard_id, ...updates } = await req.json();

    if (!dashboard_id) {
      return NextResponse.json(
        { error: 'ID de dashboard requis' },
        { status: 400 }
      );
    }

    // If setting as default, remove default from others
    if (updates.is_default) {
      await supabase
        .from('dashboard_configs')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', dashboard_id);
    }

    const { data, error } = await supabase
      .from('dashboard_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dashboard_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Dashboard introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      config: data,
      message: 'Dashboard mis à jour',
    });
  } catch (error) {
    console.error('[Update Dashboard] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
