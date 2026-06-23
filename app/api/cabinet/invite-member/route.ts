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

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // Only owner can invite members
    if (cabinet.owner_id !== user.id) {
      return NextResponse.json({ error: 'Seul le propriétaire peut inviter des membres' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    // Find the target user
    const { data: targetUser } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Aucun compte FACTU.ME trouvé avec cet email' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', cabinet.id)
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Ce collaborateur est déjà membre du cabinet' }, { status: 400 });
    }

    // ARGOS — la contrainte CHECK cabinet_members.role n'accepte que
    // admin/manager/viewer. Un membre invité devient 'manager'.
    // (La colonne `invited_at` n'existe pas → omise.)
    const { error } = await admin
      .from('cabinet_members')
      .insert({
        cabinet_id: cabinet.id,
        user_id: targetUser.id,
        role: 'manager',
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Invitation envoyée à ${email}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
