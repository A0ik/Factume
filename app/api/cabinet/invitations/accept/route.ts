import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// PROMÉTHÉE — CIBLE 1 : acceptation d'un lien d'invitation par le gérant.
// C'est ici qu'on comble le gap d'accès vérifié : on insère cabinet_members
// (role='client') → la RLS de cabinet_invoices / cabinet_employees / missions
// ouvre enfin LES DONNÉES du cabinet au gérant (lecture/écriture, SON cabinet only).

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Connectez-vous pour accepter l\'invitation' }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { token } = await req.json();
    if (!token || !/^[a-f0-9]{16,128}$/i.test(token)) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
    }

    const { data: invitation, error: invErr } = await admin
      .from('cabinet_invitations')
      .select('id, cabinet_id, status, expires_at, role, invited_email')
      .eq('token', token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invitation) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });

    // ARGOS — vérifier que l'email utilisateur correspond à l'email invité.
    const invitedEmail = invitation.invited_email as string | undefined;
    if (invitedEmail) {
      const userEmail = (user.email || '').toLowerCase().trim();
      if (!userEmail || userEmail !== String(invitedEmail).toLowerCase().trim()) {
        return NextResponse.json(
          { error: 'Cette invitation ne vous est pas destinée.', code: 'EMAIL_MISMATCH' },
          { status: 403 },
        );
      }
    }

    const now = new Date().toISOString();
    if (invitation.status === 'revoked') {
      return NextResponse.json({ error: 'Ce lien a été révoqué' }, { status: 410 });
    }
    if (invitation.status === 'accepted' || new Date(invitation.expires_at).toISOString() < now) {
      return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 });
    }

    const cabinetId = invitation.cabinet_id;
    const role = invitation.role === 'manager' ? 'manager' : 'viewer';

    // 1. Idempotence : le gérant est-il déjà membre de ce cabinet ?
    const { data: existingMember } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', cabinetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberErr } = await admin.from('cabinet_members').insert({
        cabinet_id: cabinetId,
        user_id: user.id,
        role,
      });
      if (memberErr) throw memberErr;
    }

    // 2. Lier le gérant comme client actif du cabinet (vue expert).
    const { data: existingClient } = await admin
      .from('cabinet_clients')
      .select('id, status')
      .eq('cabinet_id', cabinetId)
      .eq('client_user_id', user.id)
      .maybeSingle();

    if (existingClient) {
      if (existingClient.status !== 'active') {
        await admin.from('cabinet_clients')
          .update({ status: 'active', connected_at: now })
          .eq('id', existingClient.id);
      }
    } else {
      await admin.from('cabinet_clients').insert({
        cabinet_id: cabinetId,
        client_user_id: user.id,
        status: 'active',
        connected_at: now,
      });
    }

    // 3. Marquer l'invitation comme acceptée.
    await admin.from('cabinet_invitations')
      .update({ status: 'accepted', accepted_by: user.id, accepted_at: now })
      .eq('id', invitation.id);

    return NextResponse.json({ success: true, cabinetId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
