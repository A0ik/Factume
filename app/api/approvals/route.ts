import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalRequest {
  id?: string;
  expense_id: string;
  requested_by: string;
  requested_to?: string; // If empty, any approver can approve
  reason?: string;
  urgency: 'low' | 'normal' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  resolved_at?: string;
}

interface ApprovalWorkflow {
  id?: string;
  name: string;
  description?: string;
  conditions: {
    min_amount?: number;
    categories?: string[];
    vendors?: string[];
    requires_receipt?: boolean;
  };
  approvers: string[]; // User IDs (for multi-user, would be team members)
  auto_submit: boolean;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// GET handler - Get approval requests and workflows
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'pending', 'resolved', 'workflows', or 'all'

    // Get approval workflows
    const { data: workflows } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Get approval requests
    let query = supabase
      .from('approval_requests')
      .select('*, expenses(*)')
      .or(`requested_by.eq.${user.id},requested_to.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (type === 'pending') {
      query = query.eq('status', 'pending');
    } else if (type === 'resolved') {
      query = query.in('status', ['approved', 'rejected', 'cancelled']);
    }

    const { data: requests } = await query;

    if (type === 'workflows') {
      return NextResponse.json({ workflows: workflows || [] });
    }

    return NextResponse.json({
      requests: requests || [],
      workflows: workflows || [],
      pending_count: requests?.filter(r => r.status === 'pending').length || 0,
    });
  } catch (error) {
    console.error('[Get Approvals] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler - Create approval request or workflow
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { type, ...data } = await req.json();

    if (type === 'request') {
      // Create approval request
      if (!data.expense_id) {
        return NextResponse.json(
          { error: 'ID de dépense requis' },
          { status: 400 }
        );
      }

      // Verify expense exists and belongs to user
      const { data: expense } = await supabase
        .from('expenses')
        .select('id, amount, vendor')
        .eq('id', data.expense_id)
        .eq('user_id', user.id)
        .single();

      if (!expense) {
        return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
      }

      // Check if pending request already exists
      const { data: existing } = await supabase
        .from('approval_requests')
        .select('id')
        .eq('expense_id', data.expense_id)
        .eq('status', 'pending')
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Une demande d\'approval est déjà en cours pour cette dépense' },
          { status: 409 }
        );
      }

      const { data: request, error } = await supabase
        .from('approval_requests')
        .insert({
          expense_id: data.expense_id,
          requested_by: user.id,
          requested_to: data.requested_to || null,
          reason: data.reason || null,
          urgency: data.urgency || 'normal',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update expense status
      await supabase
        .from('expenses')
        .update({ validation_status: 'manual_review' })
        .eq('id', data.expense_id);

      return NextResponse.json({
        success: true,
        request,
        message: 'Demande d\'approval créée',
      }, { status: 201 });
    }

    if (type === 'workflow') {
      // Create approval workflow
      if (!data.name || !data.approvers || data.approvers.length === 0) {
        return NextResponse.json(
          { error: 'Nom et approbateurs requis' },
          { status: 400 }
        );
      }

      const { data: workflow, error } = await supabase
        .from('approval_workflows')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          conditions: data.conditions || {},
          approvers: data.approvers,
          auto_submit: data.auto_submit || false,
          is_active: data.is_active !== undefined ? data.is_active : true,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        workflow,
        message: 'Workflow d\'approval créé',
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Type invalide' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Create Approval] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update approval request (approve/reject)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { request_id, action, reason } = await req.json();

    if (!request_id || !action) {
      return NextResponse.json(
        { error: 'ID de demande et action requis' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide (approve, reject, cancel)' },
        { status: 400 }
      );
    }

    // Get request
    const { data: request } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (!request) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    // Check permissions
    if (action === 'cancel' && request.requested_by !== user.id) {
      return NextResponse.json(
        { error: 'Seul le demandeur peut annuler' },
        { status: 403 }
      );
    }

    if ((action === 'approve' || action === 'reject') && request.requested_to && request.requested_to !== user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas l\'approbateur désigné' },
        { status: 403 }
      );
    }

    // Update request
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
    const { data: updated, error } = await supabase
      .from('approval_requests')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolution_reason: reason || null,
      })
      .eq('id', request_id)
      .select()
      .single();

    if (error) throw error;

    // Update expense status based on action
    const expenseStatus = action === 'approve' ? 'validated' : action === 'reject' ? 'rejected' : 'pending';
    await supabase
      .from('expenses')
      .update({
        validation_status: expenseStatus,
        validation_notes: reason || `Approval ${status}`,
      })
      .eq('id', request.expense_id);

    // Create workflow history
    await supabase.from('workflow_history').insert({
      user_id: user.id,
      expense_id: request.expense_id,
      workflow_type: 'approval',
      from_status: 'manual_review',
      to_status: expenseStatus,
      triggered_by: 'user',
      notes: `Demande ${status} par ${user.id}`,
    });

    return NextResponse.json({
      success: true,
      request: updated,
      message: `Demande ${status}`,
    });
  } catch (error) {
    console.error('[Update Approval] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler - Update approval workflow
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { workflow_id, ...updates } = await req.json();

    if (!workflow_id) {
      return NextResponse.json(
        { error: 'ID de workflow requis' },
        { status: 400 }
      );
    }

    const { data: workflow, error } = await supabase
      .from('approval_workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      workflow,
      message: 'Workflow mis à jour',
    });
  } catch (error) {
    console.error('[Update Workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete approval workflow
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workflow_id = searchParams.get('workflow_id');

    if (!workflow_id) {
      return NextResponse.json(
        { error: 'ID de workflow requis' },
        { status: 400 }
      );
    }

    await supabase
      .from('approval_workflows')
      .delete()
      .eq('id', workflow_id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Workflow supprimé',
    });
  } catch (error) {
    console.error('[Delete Workflow] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
