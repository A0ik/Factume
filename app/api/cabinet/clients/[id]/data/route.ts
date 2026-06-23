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

    const data = await getClientAggregatedData(client.client_user_id);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
