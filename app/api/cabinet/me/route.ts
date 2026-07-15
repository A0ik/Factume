import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

// PROMÉTHÉE (S1 — Portail client) — Indique si l'utilisateur courant est un CLIENT lié
// du cabinet (cabinet_clients.client_user_id = user.id) et, le cas échéant, son client_id.
// Sert à rendre la messagerie role-aware : un client ne voit QUE son propre fil.

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ isClient: false, clientId: null });

    const { data: client } = await admin
      .from('cabinet_clients')
      .select('id, company_name, contact_name')
      .eq('cabinet_id', cabinet.id)
      .eq('client_user_id', user.id)
      .maybeSingle();

    if (client) {
      return NextResponse.json({
        isClient: true,
        clientId: client.id,
        clientName: client.company_name || client.contact_name || 'Client',
      });
    }
    return NextResponse.json({ isClient: false, clientId: null });
  } catch (err: any) {
    console.error('[cabinet/me] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
