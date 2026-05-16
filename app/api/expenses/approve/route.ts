import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST — Submit expenses for approval (member or admin)
// Enhanced with tiered auto-approval logic:
//   - Auto-approve < 500€
//   - Single approval for 500-5000€
//   - Dual approval for > 5000€
//   - Track approval history as JSONB
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

    // Fetch expenses with amount for tiered approval
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, status, user_id, amount, approval_history, approval_level')
      .in('id', expense_ids)
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    const eligible = (expenses || []).filter((e) => e.status === 'pending' || e.status === 'reviewed' || e.status === 'inbox');

    if (eligible.length === 0) {
      return NextResponse.json({ error: 'Aucune dépense éligible (doit être en attente et vous appartenir)' }, { status: 400 });
    }

    // Process each expense with tiered approval logic
    const autoApproved: string[] = [];
    const submitted: string[] = [];

    for (const expense of eligible) {
      const amount = expense.amount || 0;
      const history = Array.isArray(expense.approval_history) ? [...expense.approval_history] : [];
      let newStatus: string;
      let newApprovalLevel = expense.approval_level || 1;

      // Tiered approval thresholds
      if (amount < 500) {
        // Auto-approve expenses < 500€
        newStatus = 'approved';
        history.push({
          action: 'auto_approved',
          level: 1,
          at: new Date().toISOString(),
          reason: 'Montant < 500€',
        });
        autoApproved.push(expense.id);
      } else if (amount >= 5000) {
        // Dual approval required for > 5000€
        newApprovalLevel = 2;
        newStatus = 'submitted';
        history.push({
          action: 'submitted',
          at: new Date().toISOString(),
          level: 1,
        });
        submitted.push(expense.id);
      } else {
        // Single approval for 500-5000€
        newStatus = 'submitted';
        history.push({
          action: 'submitted',
          at: new Date().toISOString(),
          level: 1,
        });
        submitted.push(expense.id);
      }

      await supabase
        .from('expenses')
        .update({
          status: newStatus,
          approval_level: newApprovalLevel,
          approval_history: history,
          ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}),
        })
        .eq('id', expense.id);
    }

    // Notify workspace admins for submitted expenses (not auto-approved)
    if (submitted.length > 0) {
      const { data: admins } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .in('role', ['admin']);

      if (admins && admins.length > 0) {
        const notifications = admins.flatMap((admin) =>
          submitted.map((expenseId) => ({
            user_id: admin.user_id,
            expense_id: expenseId,
            action: 'submitted',
            message: `Nouvelle note de frais soumise par ${user.email}`,
            created_at: new Date().toISOString(),
          }))
        );

        const { error: notifError } = await supabase
          .from('expense_approval_notifications')
          .insert(notifications);

        if (notifError) {
          console.warn('[expense-approval] notification insert skipped:', notifError.message);
        }
      }
    }

    return NextResponse.json({
      submitted: submitted.length,
      autoApproved: autoApproved.length,
      total: eligible.length,
    });
  } catch (err: any) {
    console.error('[POST /api/expenses/approve]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Approve, reject, or publish expenses (admin only)
// Supports multi-level approval for expenses > 5000€
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
    }: { expense_ids: string[]; action: 'approved' | 'rejected' | 'publish'; comment?: string } = body;

    if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
      return NextResponse.json({ error: 'expense_ids est requis' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'publish'].includes(action)) {
      return NextResponse.json({ error: 'action doit être "approved", "rejected" ou "publish"' }, { status: 400 });
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

    // Fetch expenses with approval metadata
    const targetStatus = action === 'publish' ? 'approved' : 'submitted';
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, status, user_id, amount, approval_history, approval_level')
      .in('id', expense_ids)
      .eq('status', action === 'publish' ? 'approved' : 'submitted')
      .in('user_id', memberUserIds);

    if (fetchError) throw fetchError;

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: 'Aucune dépense éligible trouvée' }, { status: 400 });
    }

    // Process each expense
    const results: Array<{ id: string; success: boolean; status: string }> = [];
    const auditEntries: Array<Record<string, any>> = [];

    for (const expense of expenses) {
      const history = Array.isArray(expense.approval_history) ? [...expense.approval_history] : [];
      let newStatus: string;

      switch (action) {
        case 'approved': {
          const approvalLevel = expense.approval_level || 1;
          // For dual-approval expenses (> 5000€), check if first approval already done
          if (approvalLevel > 1) {
            const approvals = history.filter((h: any) => h.action === 'approved');
            if (approvals.length < approvalLevel - 0) {
              // First or second approval
              history.push({
                action: 'approved',
                level: approvals.length + 1,
                at: new Date().toISOString(),
                by: user.id,
              });
              if (approvals.length + 1 >= approvalLevel) {
                newStatus = 'approved';
              } else {
                // Still needs more approvals
                newStatus = 'submitted';
              }
            } else {
              newStatus = 'approved';
              history.push({
                action: 'approved',
                at: new Date().toISOString(),
                by: user.id,
              });
            }
          } else {
            newStatus = 'approved';
            history.push({
              action: 'approved',
              at: new Date().toISOString(),
              by: user.id,
            });
          }
          break;
        }
        case 'rejected':
          newStatus = 'inbox';
          history.push({
            action: 'rejected',
            at: new Date().toISOString(),
            by: user.id,
            reason: comment || undefined,
          });
          break;
        case 'publish':
          newStatus = 'published';
          history.push({
            action: 'published',
            at: new Date().toISOString(),
            by: user.id,
          });
          break;
        default:
          continue;
      }

      const updatePayload: Record<string, any> = {
        status: newStatus,
        approval_history: history,
        ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}),
        ...(newStatus === 'published' ? { updated_at: new Date().toISOString() } : {}),
        ...(action === 'rejected' && comment ? { rejection_comment: comment } : {}),
      };

      const { error: updateError } = await supabase
        .from('expenses')
        .update(updatePayload)
        .eq('id', expense.id);

      results.push({ id: expense.id, success: !updateError, status: newStatus });

      auditEntries.push({
        expense_id: expense.id,
        action,
        actor_id: user.id,
        comment: comment || null,
        created_at: new Date().toISOString(),
      });
    }

    // Insert audit entries (best-effort)
    if (auditEntries.length > 0) {
      const { error: auditError } = await supabase
        .from('expense_approval_audit')
        .insert(auditEntries);

      if (auditError) {
        console.warn('[expense-approval] audit insert skipped:', auditError.message);
      }
    }

    return NextResponse.json({
      updated: results.filter((r) => r.success).length,
      results,
    });
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
