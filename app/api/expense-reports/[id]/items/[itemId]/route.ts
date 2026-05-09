// ---------------------------------------------------------------------------
// Expense Report Items API Routes
// Manage individual items within an expense report (approve/reject/remove)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Params {
  params: Promise<{ id: string; itemId: string }>;
}

// ---------------------------------------------------------------------------
// PATCH - Update expense report item (approve/reject)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const body = await req.json();
    const { status, is_reimbursable, reimbursable_amount, notes } = body as {
      status?: 'pending' | 'approved' | 'rejected' | 'excluded';
      is_reimbursable?: boolean;
      reimbursable_amount?: number;
      notes?: string;
    };

    // Verify report ownership
    const { data: report } = await supabase
      .from('expense_reports')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!report || report.user_id !== user.id) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (is_reimbursable !== undefined) updateData.is_reimbursable = is_reimbursable;
    if (reimbursable_amount !== undefined) updateData.reimbursable_amount = reimbursable_amount;
    if (notes !== undefined) updateData.notes = notes;

    // Update item
    const { data: item, error } = await supabase
      .from('expense_report_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('expense_report_id', id)
      .select(`
        *,
        expense:expenses(*)
      `)
      .single();

    if (error) {
      console.error('[Expense Report Item] Update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      item,
      message: 'Élément mis à jour avec succès',
    });

  } catch (error) {
    console.error('[Expense Report Item] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE - Remove expense from report
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id, itemId } = await params;

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

    // Get the item to update expense reference
    const { data: item } = await supabase
      .from('expense_report_items')
      .select('expense_id')
      .eq('id', itemId)
      .single();

    // Delete item
    const { error } = await supabase
      .from('expense_report_items')
      .delete()
      .eq('id', itemId)
      .eq('expense_report_id', id);

    if (error) {
      console.error('[Expense Report Item] Delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    // Update expense to remove report reference
    if (item?.expense_id) {
      await supabase
        .from('expenses')
        .update({
          expense_report_id: null,
          expense_report_item_id: null,
        })
        .eq('id', item.expense_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Dépense retirée du rapport',
    });

  } catch (error) {
    console.error('[Expense Report Item] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
