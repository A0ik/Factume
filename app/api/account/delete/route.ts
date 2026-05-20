import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Require password re-confirmation for account deletion
    const body = await req.json().catch(() => ({}));
    const password = body.password;
    if (!password || typeof password !== 'string' || password.length < 1) {
      return NextResponse.json(
        { error: 'Confirmation requise', code: 'PASSWORD_REQUIRED' },
        { status: 400 }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    if (signInError) {
      return NextResponse.json(
        { error: 'Mot de passe incorrect', code: 'INVALID_PASSWORD' },
        { status: 403 }
      );
    }

    const userId = user.id;
    const admin = createAdminClient();

    // Delete user data from all tables (order matters for FK constraints)
    const tables = [
      'partial_payments',
      'crm_tasks',
      'client_notes',
      'webhook_endpoints',
      'client_portal_tokens',
      'appointments',
      'notifications',
      'expenses',
      'products',
      'opportunities',
      'recurring_invoices',
      'invoices',
      'clients',
      'workspace_members',
      'workspace_invitations',
      'workspaces',
    ];

    let deletedCount = 0;
    for (const table of tables) {
      try {
        if (table === 'workspaces') {
          const { data: ws } = await admin.from('workspaces').select('id').eq('owner_id', userId);
          if (ws && ws.length > 0) {
            const wsIds = ws.map((w) => w.id);
            await admin.from('workspace_members').delete().in('workspace_id', wsIds);
            await admin.from('workspace_invitations').delete().in('workspace_id', wsIds);
            await admin.from('workspaces').delete().eq('owner_id', userId);
          }
        } else {
          await admin.from(table).delete().eq('user_id', userId);
        }
        deletedCount++;
      } catch {
        // Table may not exist — continue
      }
    }

    // Delete profile
    try {
      await admin.from('profiles').delete().eq('id', userId);
    } catch (err) {
      console.error('[account/delete] Failed to delete profile:', err);
    }

    // Delete auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    console.log(`[account/delete] User ${userId} deleted successfully (${deletedCount} tables cleaned)`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 });
  }
}
