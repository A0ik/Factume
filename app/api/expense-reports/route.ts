// ---------------------------------------------------------------------------
// Expense Reports API Routes
// Manage grouped expense reports for approval workflows
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// GET - List expense reports
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('expense_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Expense Reports] Fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des rapports' }, { status: 500 });
    }

    return NextResponse.json({
      reports: data || [],
      count: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('[Expense Reports] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST - Create expense report
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      report_type,
      period_start,
      period_end,
      expense_ids,
      workspace_id,
    } = body as {
      name: string;
      description?: string;
      report_type?: string;
      period_start: string;
      period_end: string;
      expense_ids?: string[];
      workspace_id?: string;
    };

    // Validate required fields
    if (!name || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'Champs requis : name, period_start, period_end' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'La date de début doit être avant la date de fin' }, { status: 400 });
    }

    // Create expense report
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .insert({
        user_id: user.id,
        workspace_id,
        name,
        description,
        report_type: report_type || 'business',
        period_start,
        period_end,
        status: 'draft',
        submitted_by: user.id,
      })
      .select()
      .single();

    if (reportError) {
      console.error('[Expense Reports] Create error:', reportError);
      return NextResponse.json({ error: 'Erreur lors de la création du rapport' }, { status: 500 });
    }

    // Add expenses to report if provided
    if (expense_ids && expense_ids.length > 0) {
      const items = expense_ids.map(expense_id => ({
        expense_report_id: report.id,
        expense_id,
        status: 'pending' as const,
      }));

      const { error: itemsError } = await supabase
        .from('expense_report_items')
        .insert(items);

      if (itemsError) {
        console.error('[Expense Reports] Failed to add expenses:', itemsError);
        // Don't fail the whole operation, just log it
      }

      // Update expenses with report reference
      await supabase
        .from('expenses')
        .update({ expense_report_id: report.id })
        .in('id', expense_ids);
    }

    return NextResponse.json({
      success: true,
      report,
      message: 'Rapport créé avec succès',
    });

  } catch (error) {
    console.error('[Expense Reports] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
