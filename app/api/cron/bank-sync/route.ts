import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { BridgeClient } from '@/lib/bridge-client';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const admin = createAdminClient();
    const clientId = process.env.BRIDGE_CLIENT_ID;
    const clientSecret = process.env.BRIDGE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ skipped: true, reason: 'Bridge not configured' });
    }

    const { data: connections } = await admin
      .from('bank_connections')
      .select('*')
      .eq('status', 'active');

    if (!connections?.length) {
      return NextResponse.json({ synced: 0, connections: 0 });
    }

    const bridge = new BridgeClient(clientId, clientSecret);
    let totalSynced = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      if (!conn.access_token) continue;
      try {
        const accounts = await bridge.getAccounts(conn.access_token);
        const since = conn.last_synced_at ? new Date(conn.last_synced_at).toISOString().split('T')[0] : undefined;

        for (const account of accounts) {
          const transactions = await bridge.getTransactions(conn.access_token, account.id.toString(), since);
          for (const tx of transactions) {
            const externalId = tx.id?.toString();
            if (!externalId) continue;
            const { data: existing } = await admin
              .from('bank_transactions')
              .select('id')
              .eq('user_id', conn.user_id)
              .eq('external_id', externalId)
              .maybeSingle();

            if (!existing) {
              await admin.from('bank_transactions').insert({
                user_id: conn.user_id,
                amount: tx.amount || 0,
                transaction_date: tx.date || new Date().toISOString().split('T')[0],
                label: tx.description || tx.clean_description || 'Transaction',
                currency: account.currency || 'EUR',
                source: 'bridge',
                status: 'unreconciled',
                bank_connection_id: conn.id,
                external_id: externalId,
                description: tx.category?.name || null,
              });
              totalSynced++;
            }
          }
        }
        await admin.from('bank_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', conn.id);
      } catch (err: any) {
        errors.push(`Connection ${conn.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ synced: totalSynced, connections: connections.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
