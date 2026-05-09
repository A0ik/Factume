// ---------------------------------------------------------------------------
// Single Expense Report API Routes
// Get, update, delete, and manage individual expense reports
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Params {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET - Get expense report by ID
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Get report with items and expenses
    const { data: report, error } = await supabase
      .from('expense_reports')
      .select(`
        *,
        items:expense_report_items(
          *,
          expense:expenses(*)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
    }

    return NextResponse.json({ report });

  } catch (error) {
    console.error('[Expense Report] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH - Update expense report
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('expense_reports')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Status transitions with tracking
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['submitted', 'deleted'],
        submitted: ['under_review', 'draft'],
        under_review: ['approved', 'rejected'],
        approved: ['paid'],
        rejected: ['draft'],
        paid: [],
      };

      const currentStatus = existing.status;
      const newStatus = body.status;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { error: `Transition de statut invalide : ${currentStatus} → ${newStatus}` },
          { status: 400 }
        );
      }

      updateData.status = newStatus;

      // Set timestamps based on status
      if (newStatus === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
        updateData.submitted_by = user.id;
      } else if (newStatus === 'under_review') {
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
      } else if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
      } else if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updateData.rejection_reason = body.rejection_reason || null;
      }
    }

    // Update other fields
    const allowedFields = ['name', 'description', 'report_type', 'period_start', 'period_end', 'employee_notes', 'approver_notes'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Perform update
    const { data: report, error } = await supabase
      .from('expense_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Expense Report] Update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report,
      message: 'Rapport mis à jour avec succès',
    });

  } catch (error) {
    console.error('[Expense Report] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE - Delete expense report
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('expense_reports')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
    }

    // Only allow deletion of draft reports
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Seuls les rapports en brouillon ou rejetés peuvent être supprimés' },
        { status: 400 }
      );
    }

    // Delete report (items will cascade delete)
    const { error } = await supabase
      .from('expense_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Expense Report] Delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rapport supprimé avec succès',
    });

  } catch (error) {
    console.error('[Expense Report] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST - Add expense to report
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { expense_id, is_reimbursable, notes } = body as {
      expense_id: string;
      is_reimbursable?: boolean;
      notes?: string;
    };

    if (!expense_id) {
      return NextResponse.json({ error: 'expense_id requis' }, { status: 400 });
    }

    // Verify report ownership
    const { data: report } = await supabase
      .from('expense_reports')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!report || report.user_id !== user.id) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
    }

    if (report.status !== 'draft') {
      return NextResponse.json(
        { error: 'Seuls les rapports en brouillon peuvent être modifiés' },
        { status: 400 }
      );
    }

    // Verify expense ownership
    const { data: expense } = await supabase
      .from('expenses')
      .select('user_id, amount')
      .eq('id', expense_id)
      .single();

    if (!expense || expense.user_id !== user.id) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Check if expense already in report
    const { data: existing } = await supabase
      .from('expense_report_items')
      .select('id')
      .eq('expense_report_id', id)
      .eq('expense_id', expense_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Cette dépense est déjà dans le rapport' }, { status: 400 });
    }

    // Add expense to report
    const { data: item, error } = await supabase
      .from('expense_report_items')
      .insert({
        expense_report_id: id,
        expense_id,
        is_reimbursable: is_reimbursable !== undefined ? is_reimbursable : true,
        reimbursable_amount: is_reimbursable ? expense.amount : 0,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Expense Report Items] Insert error:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout de la dépense' }, { status: 500 });
    }

    // Update expense with report reference
    await supabase
      .from('expenses')
      .update({
        expense_report_id: id,
        expense_report_item_id: item.id,
      })
      .eq('id', expense_id);

    return NextResponse.json({
      success: true,
      item,
      message: 'Dépense ajoutée au rapport',
    });

  } catch (error) {
    console.error('[Expense Report Items] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
