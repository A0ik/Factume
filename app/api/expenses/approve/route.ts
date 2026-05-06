import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST — Submit expenses for approval (member or admin)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { expense_ids }: { expense_ids: string[] } = body;

    if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
      return NextResponse.json({ error: 'expense_ids est requis et doit être un tableau non vide' }, { status: 400 });
    }

    // Check user belongs to at least one workspace as member or admin
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['admin', 'editor', 'viewer'])
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Vous devez être membre d\'un workspace' }, { status: 403 });
    }

    const workspaceId = membership.workspace_id;

    // Verify all expenses belong to the user and are currently 'pending'
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, status, user_id')
      .in('id', expense_ids)
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    const eligibleIds = (expenses || [])
      .filter((e) => e.status === 'pending')
      .map((e) => e.id);

    if (eligibleIds.length === 0) {
      return NextResponse.json({ error: 'Aucune dépense éligible (doit être en attente et vous appartenir)' }, { status: 400 });
    }

    // Update expenses to 'submitted' status
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ status: 'submitted' })
      .in('id', eligibleIds);

    if (updateError) throw updateError;

    // Notify workspace admins (role = 'admin') — using workspace_members lookup
    const { data: admins } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .in('role', ['admin']);

    // Insert notification rows if expense_approval_notifications table exists
    if (admins && admins.length > 0) {
      const notifications = admins.flatMap((admin) =>
        eligibleIds.map((expenseId) => ({
          user_id: admin.user_id,
          expense_id: expenseId,
          action: 'submitted',
          message: `Nouvelle note de frais soumise par ${user.email}`,
          created_at: new Date().toISOString(),
        }))
      );

      // Best-effort notification insert (table may not exist yet)
      const { error: notifError } = await supabase
        .from('expense_approval_notifications')
        .insert(notifications);

      if (notifError) {
        // Table might not exist yet — log but don't block
        console.warn('[expense-approval] notification insert skipped:', notifError.message);
      }
    }

    return NextResponse.json({ submitted: eligibleIds.length });
  } catch (err: any) {
    console.error('[POST /api/expenses/approve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Approve or reject expenses (admin only)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      expense_ids,
      action,
      comment,
    }: { expense_ids: string[]; action: 'approved' | 'rejected'; comment?: string } = body;

    if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
      return NextResponse.json({ error: 'expense_ids est requis' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'action doit être "approved" ou "rejected"' }, { status: 400 });
    }

    // Check user is an admin in at least one workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent approuver ou rejeter des notes de frais' }, { status: 403 });
    }

    const workspaceId = membership.workspace_id;

    // Get workspace member user ids so we can scope expenses to this workspace
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    const memberUserIds = (workspaceMembers || []).map((m) => m.user_id);

    // Fetch submitted expenses that belong to workspace members
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, status, user_id')
      .in('id', expense_ids)
      .eq('status', 'submitted')
      .in('user_id', memberUserIds);

    if (fetchError) throw fetchError;

    const eligibleIds = (expenses || []).map((e) => e.id);

    if (eligibleIds.length === 0) {
      return NextResponse.json({ error: 'Aucune dépense éligible trouvée' }, { status: 400 });
    }

    // Update expenses
    const updatePayload: Record<string, any> = {
      status: action,
    };
    if (action === 'rejected' && comment) {
      updatePayload.rejection_comment = comment;
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update(updatePayload)
      .in('id', eligibleIds);

    if (updateError) throw updateError;

    // Insert audit entries (best-effort)
    const auditEntries = eligibleIds.map((id) => ({
      expense_id: id,
      action,
      actor_id: user.id,
      comment: comment || null,
      created_at: new Date().toISOString(),
    }));

    const { error: auditError } = await supabase
      .from('expense_approval_audit')
      .insert(auditEntries);

    if (auditError) {
      console.warn('[expense-approval] audit insert skipped:', auditError.message);
    }

    return NextResponse.json({ updated: eligibleIds.length });
  } catch (err: any) {
    console.error('[PATCH /api/expenses/approve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Get pending approvals for current user's workspace
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check user is admin in at least one workspace
    const { data: membership, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Seuls les administrateurs peuvent voir les approbations', isManager: false }, { status: 403 });
    }

    const workspaceId = membership.workspace_id;

    // Get all active workspace members' user ids
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    const memberUserIds = (workspaceMembers || []).map((m) => m.user_id);

    if (memberUserIds.length === 0) {
      return NextResponse.json({ expenses: [], stats: { pending: 0, approvedMonth: 0, rejectedMonth: 0 } });
    }

    // Fetch submitted expenses belonging to workspace members
    const { data: submittedExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*, profiles:user_id(first_name, last_name, email, company_name)')
      .eq('status', 'submitted')
      .in('user_id', memberUserIds)
      .order('date', { ascending: false });

    if (expensesError) throw expensesError;

    // Stats: approved & rejected this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: approvedMonth } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .in('user_id', memberUserIds)
      .gte('created_at', monthStart);

    const { count: rejectedMonth } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .in('user_id', memberUserIds)
      .gte('created_at', monthStart);

    return NextResponse.json({
      expenses: submittedExpenses || [],
      stats: {
        pending: submittedExpenses?.length || 0,
        approvedMonth: approvedMonth || 0,
        rejectedMonth: rejectedMonth || 0,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/expenses/approve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
