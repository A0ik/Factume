import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const { data: targetUser } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Aucun compte FACTU.ME trouvé avec cet email. Le client doit d\'abord créer un compte.' }, { status: 404 });
    }

    const { data: existing } = await admin
      .from('cabinet_clients')
      .select('id, status')
      .eq('cabinet_id', cabinet.id)
      .eq('client_user_id', targetUser.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: existing.status === 'active' ? 'Ce client est déjà connecté' : 'Une invitation est déjà en attente' }, { status: 400 });
    }

    const { error } = await admin
      .from('cabinet_clients')
      .insert({
        cabinet_id: cabinet.id,
        client_user_id: targetUser.id,
        status: 'pending',
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Invitation envoyée à ${email}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
