import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAccountTransactions,
  syncNordigenTransactions,
} from '@/lib/nordigen/client';

/**
 * POST /api/banking/sync
 * Sync transactions from connected bank accounts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: 'connectionId is required' },
        { status: 400 }
      );
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('nordigen_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    // Get transactions from Nordigen
    // Note: You need to store the account access token separately
    // For now, this is a simplified version that uses the connection ID as access token
    const dateFrom = connection.last_sync_at
      ? new Date(connection.last_sync_at).toISOString().split('T')[0]
      : undefined;

    const transactions = await getAccountTransactions(
      connection.account_id,
      connection.account_id ?? '', // Using account_id as placeholder for access token
      dateFrom
    );

    // Sync to database
    const allTransactions = [
      ...(transactions.transactions.booked || []),
      ...(transactions.transactions.pending || []),
    ];

    const syncResult = await syncNordigenTransactions({
      userId: user.id,
      connectionId: connection.id,
      transactions: allTransactions,
    });

    // Update connection sync time
    await supabase
      .from('nordigen_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    // Log sync
    await supabase
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

    // Log error
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase
        .from('nordigen_sync_logs')
        .insert({
          connection_id: '',
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    } catch (logError) {
      // Ignore log errors
    }

    return NextResponse.json(
      { success: false, error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}
