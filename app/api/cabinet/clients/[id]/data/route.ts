import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients, getClientAggregatedData } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // ARGOS — IDOR : un membre 'viewer' (client invité) ne voit QUE sa propre fiche.
    // Les rôles admin/manager (comptable) gardent l'accès à tous les clients.
    const { data: membership } = await admin
      .from('cabinet_members')
      .select('role')
      .eq('cabinet_id', cabinet.id)
      .eq('user_id', user.id)
      .maybeSingle();
    const memberRole = membership?.role;
    const isOwner = cabinet.owner_id === user.id;
    const isViewer = !isOwner && memberRole === 'viewer';

    const clients = await getCabinetClients(cabinet.id);
    const client = clients.find((c: any) => c.id === id || c.client_user_id === id);
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    // Un viewer ne peut accéder qu'à SES propres données.
    if (isViewer && client.client_user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé à ce client' }, { status: 403 });
    }

    const data: any = await getClientAggregatedData(client.client_user_id);

    // PROMÉTHÉE (CIBLE 2 #6) — un client MANUEL (sans user lié) n'a pas de données
    // agrégées tenant (client_user_id null → tout vide). On ajoute donc ses factures
    // d'honoraires cabinet (cabinet_invoices où client_id pointe vers ce cabinet_client)
    // pour que sa fiche ne soit plus vide.
    try {
      const { data: cabInvoices } = await admin
        .from('cabinet_invoices')
        .select('id, number, amount_ttc, status, issue_date')
        .eq('cabinet_id', cabinet.id)
        .eq('client_id', client.id)
        .order('issue_date', { ascending: false });
      if (cabInvoices && cabInvoices.length) {
        const mapped = cabInvoices.map((ci: any) => ({
          id: ci.id,
          number: ci.number,
          total: Number(ci.amount_ttc) || 0,
          status: ci.status,
          issue_date: ci.issue_date,
          document_type: 'invoice',
        }));
        data.invoices = [...mapped, ...(Array.isArray(data.invoices) ? data.invoices : [])];
      }
    } catch (e) {
      console.warn('[cabinet/clients/data] cabinet_invoices merge failed:', (e as any)?.message);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
