import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients, getClientAggregatedData } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ cabinet: null, clients: [], stats: null });
    }

    const clients = await getCabinetClients(cabinet.id);

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalOverdue = 0;
    const clientStats = [];

    for (const client of clients.filter((c: any) => c.status === 'active')) {
      const data = await getClientAggregatedData(client.client_user_id);
      totalRevenue += data.stats.totalRevenue;
      totalExpenses += data.stats.totalExpenses;
      totalOverdue += data.stats.overdueInvoices;
      clientStats.push({
        id: client.id,
        client_user_id: client.client_user_id,
        name: client.profile?.company_name || client.profile?.first_name || 'Client',
        health: data.stats.overdueInvoices === 0 && data.stats.unreconciledTransactions < 5 ? 'good' : 'warning',
        revenue: data.stats.totalRevenue,
        expenses: data.stats.totalExpenses,
      });
    }

    return NextResponse.json({
      cabinet,
      totalClients: clients.length,
      activeClients: clients.filter((c: any) => c.status === 'active').length,
      stats: { totalRevenue, totalExpenses, totalOverdue },
      clientStats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
