import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { requireCabinetOwner } from '@/lib/cabinet-auth';

// PROMÉTHÉE — CIBLE 1 : gestion des liens d'invitation tokenisés (expert → gérant).
// Le gérant qui accepte est ajouté à cabinet_members(role='client') → RLS ouvre
// LES DONNÉES de SON cabinet (cabinet_invoices / employees / missions …).

const PLAN_GATE = (sub: Awaited<ReturnType<typeof getUserSubscriptionStatus>>) => {
  try {
    requireFeature(sub, 'comptableConnect');
    return null;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Plan supérieur requis.', code: 'PLAN_REQUIRED', upgradeUrl: '/paywall' },
      { status: 403 },
    );
  }
};

/** GET — liste les invitations du cabinet actif de l'expert. */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const sub = await getUserSubscriptionStatus(user.id);
    const gate = PLAN_GATE(sub);
    if (gate) return gate;

    const activeCabinetId = req.headers.get('x-active-cabinet-id') || undefined;
    const cabinet = await getCabinetForUser(user.id, activeCabinetId);
    if (!cabinet) return NextResponse.json({ invitations: [] });

    const { data: invitations, error } = await admin
      .from('cabinet_invitations')
      .select('id, invited_email, role, token, status, created_at, expires_at, accepted_by, accepted_at')
      .eq('cabinet_id', cabinet.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invitations: invitations || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

/** POST — crée un lien d'invitation tokenisé pour le cabinet actif. */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const sub = await getUserSubscriptionStatus(user.id);
    const gate = PLAN_GATE(sub);
    if (gate) return gate;

    const activeCabinetId = req.headers.get('x-active-cabinet-id') || undefined;
    const cabinet = await getCabinetForUser(user.id, activeCabinetId);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // ARGUS — seul le propriétaire peut générer un lien d'invitation tokenisé.
    const ownerGuard = await requireCabinetOwner(admin, cabinet, user.id);
    if (!ownerGuard.ok) return ownerGuard.response;

    const body = await req.json().catch(() => ({}));
    const invitedEmail = typeof body.invited_email === 'string' ? body.invited_email.trim().toLowerCase() : null;
    const role = body.role === 'manager' ? 'manager' : 'client';

    // Un seul lien pending actif par cabinet à la fois suffit ; on révoque les liens
    // pending précédents pour garder l'UX claire (le dernier lien prime).
    await admin
      .from('cabinet_invitations')
      .update({ status: 'revoked' })
      .eq('cabinet_id', cabinet.id)
      .eq('status', 'pending');

    const { data: invitation, error } = await admin
      .from('cabinet_invitations')
      .insert({
        cabinet_id: cabinet.id,
        invited_email: invitedEmail || null,
        role,
        created_by: user.id,
      })
      .select('token, expires_at')
      .single();

    if (error) throw error;

    const origin = req.nextUrl.origin;
    const link = `${origin}/cabinet/invite/${invitation.token}`;
    return NextResponse.json({ link, token: invitation.token, expiresAt: invitation.expires_at }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
