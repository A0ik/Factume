import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST /api/cabinet/accept-accountant
// Accepte une invitation comptable via magic link (token).
// - Authentifie l'utilisateur courant.
// - Valide le token (non expiré, non déjà accepté).
// - Vérifie que l'email de l'invitation correspond à l'email utilisateur.
// - Marque accepted_at, insère dans cabinet_members, met à jour active_cabinet_id.
// Écritures en admin (service_role) car RLS cabinet exige owner/membre.
// ---------------------------------------------------------------------------

// ARGOS — la contrainte CHECK cabinet_members.role n'accepte QUE ces valeurs.
const ALLOWED_MEMBER_ROLES = new Set(['admin', 'manager', 'viewer']);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Récupérer l'invitation par token.
    const { data: invitation, error: invError } = await admin
      .from('accountant_invitations')
      .select('id, cabinet_id, email, role, accepted_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (invError) {
      console.error('[accept-accountant] Fetch invitation error:', invError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation introuvable. Le lien est invalide.' },
        { status: 404 },
      );
    }

    // 2. Vérifier l'expiration.
    const nowIso = new Date().toISOString();
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Cette invitation a expiré. Demandez au cabinet de vous réinviter.' },
        { status: 400 },
      );
    }

    // 3. Vérifier qu'elle n'a pas déjà été acceptée.
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été utilisée.' },
        { status: 400 },
      );
    }

    // 4. Sécurité : l'email de l'utilisateur connecté doit correspondre à l'email invité.
    const userEmail = user.email?.toLowerCase().trim();
    if (!userEmail || userEmail !== invitation.email.toLowerCase().trim()) {
      return NextResponse.json(
        {
          error: 'Cet email ne correspond pas à celui ayant reçu l\'invitation. Connectez-vous avec le bon compte.',
          code: 'EMAIL_MISMATCH',
        },
        { status: 403 },
      );
    }

    // 5. Vérifier que le cabinet existe toujours.
    const { data: cabinet } = await admin
      .from('cabinets')
      .select('id, name')
      .eq('id', invitation.cabinet_id)
      .maybeSingle();

    if (!cabinet) {
      return NextResponse.json(
        { error: 'Le cabinet n\'existe plus.' },
        { status: 404 },
      );
    }

    // 6. Définir le rôle dans cabinet_members. La contrainte CHECK Postgres n'accepte
    //    que admin/manager/viewer. Un comptable invité devient 'manager'.
    const invitedRole = invitation.role || 'manager';
    const memberRole = ALLOWED_MEMBER_ROLES.has(invitedRole)
      ? invitedRole
      : 'manager';

    // 7. Éviter un doublon : si l'utilisateur est déjà membre, on met juste à jour le rôle.
    const { data: existingMember } = await admin
      .from('cabinet_members')
      .select('id')
      .eq('cabinet_id', invitation.cabinet_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      const { error: updErr } = await admin
        .from('cabinet_members')
        .update({ role: memberRole })
        .eq('id', existingMember.id);
      if (updErr) {
        console.error('[accept-accountant] Update member error:', updErr);
        return NextResponse.json({ error: 'Erreur lors de l\'ajout au cabinet' }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await admin
        .from('cabinet_members')
        .insert({
          cabinet_id: invitation.cabinet_id,
          user_id: user.id,
          role: memberRole,
        });
      if (insertErr) {
        console.error('[accept-accountant] Insert member error:', insertErr);
        return NextResponse.json({ error: 'Erreur lors de l\'ajout au cabinet' }, { status: 500 });
      }
    }

    // 8. Marquer l'invitation comme acceptée.
    const { error: acceptErr } = await admin
      .from('accountant_invitations')
      .update({ accepted_at: nowIso })
      .eq('id', invitation.id);

    if (acceptErr) {
      console.error('[accept-accountant] Mark accepted error:', acceptErr);
      // Non bloquant : le membre a été ajouté. On log et continue.
    }

    // 9. Activer ce cabinet comme cabinet actif du profil s'il n'en a pas.
    const { data: profile } = await admin
      .from('profiles')
      .select('active_cabinet_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.active_cabinet_id) {
      const { error: profileErr } = await admin
        .from('profiles')
        .update({ active_cabinet_id: invitation.cabinet_id })
        .eq('id', user.id);
      if (profileErr) {
        console.error('[accept-accountant] Update active_cabinet_id error:', profileErr);
      }
    }

    return NextResponse.json({
      success: true,
      cabinetId: invitation.cabinet_id,
      cabinetName: cabinet.name,
    });
  } catch (error) {
    console.error('[accept-accountant] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
