import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients, getClientAggregatedData } from '@/lib/cabinet-helpers';

interface Alert {
  id: string;
  type: 'overdue' | 'warning' | 'deadline' | 'dsn';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  clientName?: string;
  amount?: number;
  daysOverdue?: number;
  href?: string;
}

interface UpcomingDeadline {
  id: string;
  date: string;
  label: string;
  type: string;
  description: string;
  daysUntil: number;
}

function getFrenchFiscalDeadlines(now: Date): UpcomingDeadline[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const deadlines: UpcomingDeadline[] = [];

  const addDeadline = (date: Date, label: string, type: string, description: string) => {
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= -7 && diff <= 45) {
      deadlines.push({ id: `${type}-${date.toISOString()}`, date: date.toISOString().split('T')[0], label, type, description, daysUntil: diff });
    }
  };

  // TVA deadlines: 19th of following month (monthly) or 19th of following quarter
  for (let m = month; m <= month + 2; m++) {
    const tvaDate = new Date(year, m + 1, 19);
    addDeadline(tvaDate, `Déclaration TVA ${new Date(year, m).toLocaleDateString('fr-FR', { month: 'long' })}`, 'tva', `CA3 mensuelle — échéance le 19/${m + 2}`);
  }

  // DSN: 5th or 15th of following month
  const dsnDate5 = new Date(year, month + 1, 5);
  const dsnDate15 = new Date(year, month + 1, 15);
  addDeadline(dsnDate5, 'DSN mensuelle (5)', 'dsn', 'Déclaration sociale nominative — échéance le 5');
  addDeadline(dsnDate15, 'DSN mensuelle (15)', 'dsn', 'Déclaration sociale nominative — échéance le 15');

  // IS (Impôt sur les Sociétés): 4 payments — 15/03, 15/06, 15/09, 15/12
  const isDates = [
    new Date(year, 2, 15), new Date(year, 5, 15),
    new Date(year, 8, 15), new Date(year, 11, 15),
  ];
  isDates.forEach((d, i) => addDeadline(d, `Acompte IS T${i + 1}`, 'is', `4ème acompte impôt sur les sociétés`));

  // CFE: 31/12
  addDeadline(new Date(year, 11, 31), 'Déclaration CFE', 'cfe', 'Cotisation foncière des entreprises');

  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
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
    const now = new Date();

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalOverdue = 0;
    const clientStats = [];
    const alerts: Alert[] = [];

    for (const client of clients.filter((c: any) => c.status === 'active')) {
      const isManual = client.client_type === 'manual';
      const clientName = isManual
        ? (client.company_name || 'Client')
        : (client.profile?.company_name || client.profile?.first_name || 'Client');

      if (isManual) {
        clientStats.push({
          id: client.id,
          client_user_id: client.client_user_id,
          name: clientName,
          email: client.contact_email || '',
          health: 'good',
          revenue: 0,
          expenses: 0,
          overdueCount: 0,
        });
        continue;
      }

      const data = await getClientAggregatedData(client.client_user_id);
      totalRevenue += data.stats.totalRevenue;
      totalExpenses += data.stats.totalExpenses;
      totalOverdue += data.stats.overdueInvoices;
      clientStats.push({
        id: client.id,
        client_user_id: client.client_user_id,
        name: clientName,
        email: client.profile?.email || '',
        health: data.stats.overdueInvoices === 0 && data.stats.unreconciledTransactions < 5 ? 'good' : 'warning',
        revenue: data.stats.totalRevenue,
        expenses: data.stats.totalExpenses,
      });

      // Generate alerts for overdue invoices
      const overdueInvs = (data.invoices || []).filter((inv: any) => inv.status === 'overdue');
      for (const inv of overdueInvs.slice(0, 3)) {
        const daysOverdue = Math.ceil((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `overdue-${inv.id}`,
          type: 'overdue',
          severity: daysOverdue > 30 ? 'critical' : 'warning',
          title: `Facture en retard — ${clientName}`,
          description: `Facture de ${Number(inv.total).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} en retard de ${daysOverdue} jours`,
          clientName,
          amount: Number(inv.total),
          daysOverdue,
          href: '/cabinet/relances',
        });
      }

      // Warning for unreconciled transactions
      if (data.stats.unreconciledTransactions >= 5) {
        alerts.push({
          id: `unreconciled-${client.client_user_id}`,
          type: 'warning',
          severity: 'warning',
          title: `Écritures non rapprochées — ${clientName}`,
          description: `${data.stats.unreconciledTransactions} transactions en attente de rapprochement`,
          clientName,
          href: '/cabinet/reconciliation',
        });
      }
    }

    // Add DSN alerts if there are active clients with employees
    const { count: employeeCount } = await admin
      .from('cabinet_employees')
      .select('*', { count: 'exact', head: true })
      .eq('cabinet_id', cabinet.id);

    if (employeeCount && employeeCount > 0) {
      const dsnDay = now.getDate();
      if (dsnDay >= 1 && dsnDay <= 5) {
        alerts.push({
          id: 'dsn-imminent',
          type: 'dsn',
          severity: 'info',
          title: 'DSN à envoyer avant le 5',
          description: `${employeeCount} salarié(s) — pensez à envoyer la DSN mensuelle`,
          href: '/cabinet/dsn',
        });
      } else if (dsnDay > 5 && dsnDay <= 10) {
        alerts.push({
          id: 'dsn-late',
          type: 'dsn',
          severity: 'warning',
          title: 'DSN en retard (après le 5)',
          description: `${employeeCount} salarié(s) — la DSN mensuelle devrait déjà être envoyée`,
          href: '/cabinet/dsn',
        });
      }
    }

    // Sort alerts: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Fiscal deadlines
    const upcomingDeadlines = getFrenchFiscalDeadlines(now);

    return NextResponse.json({
      cabinet,
      totalClients: clients.length,
      activeClients: clients.filter((c: any) => c.status === 'active').length,
      stats: { totalRevenue, totalExpenses, totalOverdue },
      clientStats,
      alerts: alerts.slice(0, 10),
      upcomingDeadlines: upcomingDeadlines.slice(0, 8),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
