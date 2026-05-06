import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { BridgeClient } from '@/lib/bridge-client';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { connectionId } = await req.json();

    const { data: connection } = await admin
      .from('bank_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'Connexion bancaire non trouvée' }, { status: 404 });
    }

    const clientId = process.env.BRIDGE_CLIENT_ID;
    const clientSecret = process.env.BRIDGE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Bridge API non configuré' }, { status: 500 });
    }

    const bridge = new BridgeClient(clientId, clientSecret);
    const accounts = await bridge.getAccounts(connection.access_token);

    let totalSynced = 0;
    const since = connection.last_synced_at
      ? new Date(connection.last_synced_at).toISOString().split('T')[0]
      : undefined;

    for (const account of accounts) {
      try {
        const transactions = await bridge.getTransactions(
          connection.access_token,
          account.id.toString(),
          since
        );

        for (const tx of transactions) {
          const externalId = tx.id?.toString();
          if (!externalId) continue;

          const { data: existing } = await admin
            .from('bank_transactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('external_id', externalId)
            .maybeSingle();

          if (!existing) {
            await admin.from('bank_transactions').insert({
              user_id: user.id,
              amount: tx.amount || 0,
              transaction_date: tx.date || new Date().toISOString().split('T')[0],
              label: tx.description || tx.clean_description || 'Transaction',
              currency: account.currency || 'EUR',
              source: 'bridge',
              status: 'unreconciled',
              bank_connection_id: connection.id,
              external_id: externalId,
              description: tx.category?.name || null,
            });
            totalSynced++;
          }
        }
      } catch (err) {
        console.error(`Error syncing account ${account.id}:`, err);
      }
    }

    await admin
      .from('bank_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({ success: true, synced: totalSynced });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: connections } = await admin
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!connections?.length) {
      return NextResponse.json({ synced: 0 });
    }

    const clientId = process.env.BRIDGE_CLIENT_ID;
    const clientSecret = process.env.BRIDGE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Bridge API non configuré' }, { status: 500 });
    }

    const bridge = new BridgeClient(clientId, clientSecret);
    let totalSynced = 0;

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
              .eq('user_id', user.id)
              .eq('external_id', externalId)
              .maybeSingle();

            if (!existing) {
              await admin.from('bank_transactions').insert({
                user_id: user.id,
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
      } catch (err) {
        console.error(`Error syncing connection ${conn.id}:`, err);
      }
    }

    return NextResponse.json({ synced: totalSynced });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
