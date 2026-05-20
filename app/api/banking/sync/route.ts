import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import {
  getAccountTransactions,
  syncNordigenTransactions,
} from '@/lib/nordigen/client';

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ success: false, error: 'connectionId is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ownership check: verify connection belongs to user
    const { data: connection, error: connectionError } = await admin
      .from('nordigen_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
    }

    const startTime = Date.now();

    const dateFrom = connection.last_sync_at
      ? new Date(connection.last_sync_at).toISOString().split('T')[0]
      : undefined;

    const transactions = await getAccountTransactions(
      connection.account_id,
      connection.account_id ?? '',
      dateFrom
    );

    const allTransactions = [
      ...(transactions.transactions.booked || []),
      ...(transactions.transactions.pending || []),
    ];

    const syncResult = await syncNordigenTransactions({
      userId: user.id,
      connectionId: connection.id,
      transactions: allTransactions,
    });

    await admin
      .from('nordigen_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    await admin
      .from('nordigen_sync_logs')
      .insert({
        connection_id: connectionId,
        status: 'success',
        transactions_added: syncResult.added,
        transactions_updated: syncResult.updated,
        sync_duration_ms: Date.now() - startTime,
      });

    return NextResponse.json({
      success: true,
      data: {
        transactionsAdded: syncResult.added,
        transactionsUpdated: syncResult.updated,
        totalTransactions: allTransactions.length,
      },
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);

    try {
      const admin = createAdminClient();
      await admin
        .from('nordigen_sync_logs')
        .insert({
          connection_id: '',
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    } catch {
      // Ignore log errors
    }

    return NextResponse.json(
      { success: false, error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}
