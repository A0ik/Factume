import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { cabinet_id } = await req.json();
    if (!cabinet_id) return NextResponse.json({ error: 'cabinet_id requis' }, { status: 400 });

    // ARGOS (sécurité) — Anti-escalade : on n'insère le user dans cabinet_members QUE si
    // le cabinet a préalablement créé une relation client POUR LUI (row owner-controlled,
    // protégée par la policy cabinet_clients_insert = admin/manager du cabinet). Sans ce
    // garde-fou, n'importe quel user authentifié pouvait s'auto-ajouter `viewer` dans
    // n'importe quel cabinet via createAdminClient() (qui bypass la RLS).
    const { data: existingMember } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', cabinet_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMember) {
      const { data: pendingClient } = await admin
        .from('cabinet_clients')
        .select('id')
        .eq('cabinet_id', cabinet_id)
        .eq('client_user_id', user.id)
        .maybeSingle();

      if (!pendingClient) {
        return NextResponse.json(
          { error: "Aucune invitation valide pour ce cabinet." },
          { status: 403 }
        );
      }

      // PROMÉTHÉE — comble le gap d'accès : le gérant DOIT être dans cabinet_members
      // pour que la RLS de cabinet_invoices / employees / missions lui ouvre les données.
      await admin.from('cabinet_members').insert({
        cabinet_id,
        user_id: user.id,
        role: 'viewer',
      });
    }

    const { error } = await admin
      .from('cabinet_clients')
      .update({ status: 'active', connected_at: new Date().toISOString() })
      .eq('cabinet_id', cabinet_id)
      .eq('client_user_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
