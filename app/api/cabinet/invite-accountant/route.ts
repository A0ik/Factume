import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// POST /api/cabinet/invite-accountant
// Send a magic link invitation to an accountant
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Subscription gate: accountant invitation requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const { email, role = 'accountant' } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    // Verify user owns a cabinet
    const { data: cabinet } = await supabase
      .from('cabinets')
      .select('id, name')
      .eq('owner_id', user.id)
      .single();

    if (!cabinet) {
      return NextResponse.json({ error: 'Vous devez être propriétaire d\'un cabinet' }, { status: 403 });
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from('accountant_invitations')
      .select('id, token')
      .eq('cabinet_id', cabinet.id)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Une invitation est déjà en attente pour cet email' }, { status: 409 });
    }

    // Create invitation
    const { data: invitation, error: invError } = await supabase
      .from('accountant_invitations')
      .insert({
        cabinet_id: cabinet.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invError || !invitation) {
      console.error('[invite-accountant] Insert error:', invError);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    // Send magic link email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
    const magicLink = `${appUrl}/cabinet/accept-accountant?token=${invitation.token}`;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Factu.me <noreply@factu.me>',
        to: [email],
        subject: `Invitation à rejoindre le cabinet ${cabinet.name}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: #09090B; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; color: #e4e4e7;">
              <h1 style="font-size: 20px; font-weight: 800; color: #fafafa; margin: 0 0 8px;">
                Invitation Cabinet
              </h1>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Vous avez été invité(e) à rejoindre le cabinet <strong style="color: #fafafa;">${cabinet.name}</strong> en tant que <strong style="color: #10b981;">${role === 'accountant' ? 'Expert-Comptable' : role === 'auditor' ? 'Auditeur' : 'Conseiller'}</strong>.
              </p>
              <a href="${magicLink}" style="display: inline-block; background: #10b981; color: white; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 12px; text-decoration: none;">
                Accepter l'invitation
              </a>
              <p style="color: #71717a; font-size: 12px; margin: 24px 0 0;">
                Ce lien expire dans 7 jours. Si vous n'êtes pas concerné, ignorez cet email.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[invite-accountant] Email error:', emailError);
      // Still return success — the invitation exists in DB, can be re-sent
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error('[invite-accountant] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
