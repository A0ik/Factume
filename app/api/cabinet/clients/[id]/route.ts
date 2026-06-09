import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

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

    const clients = await getCabinetClients(cabinet.id);
    const client = clients.find((c: any) => c.id === id);
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, company_name, first_name, last_name, siret, subscription_tier')
      .eq('id', client.client_user_id)
      .single();

    return NextResponse.json({ client, profile });
  } catch (err: any) {
    console.error('[API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
