import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateBody, sanitizeString, checkRateLimit } from '@/lib/api-validation';

/*
  Migration SQL for team_members table:

  CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_owner_id UUID REFERENCES profiles(id) NOT NULL,
    user_id UUID REFERENCES profiles(id),
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(team_owner_id, email)
  );
  ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Owners can manage their team" ON team_members FOR ALL USING (team_owner_id = auth.uid());
  CREATE POLICY "Members can view their team" ON team_members FOR SELECT USING (user_id = auth.uid());
*/

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check Business plan
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (!profile || profile.subscription_tier !== 'business') {
      return NextResponse.json({ error: 'Plan Business requis pour gérer une équipe' }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(body, {
      email: { required: true, type: 'email', maxLength: 255 },
      role: { required: true, type: 'string', enum: ['admin', 'member', 'viewer'] },
    });
    if (!validation.valid) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors }, { status: 400 });
    }

    const { email, role } = body;
    const sanitizedEmail = sanitizeString(email.toLowerCase().trim());

    // Prevent inviting yourself
    if (sanitizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous inviter vous-même' }, { status: 400 });
    }

    // Check if already invited
    const { data: existing } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_owner_id', user.id)
      .eq('email', sanitizedEmail)
      .single();

    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Ce membre fait déjà partie de l\'équipe' }, { status: 409 });
    }
    if (existing && existing.status === 'pending') {
      return NextResponse.json({ error: 'Une invitation est déjà en attente pour cet email' }, { status: 409 });
    }

    // Try to find existing user by email
    const { data: invitedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', sanitizedEmail)
      .single();

    // Upsert invitation (re-use if was removed)
    const inviteData = {
      team_owner_id: user.id,
      user_id: invitedProfile?.id || null,
      email: sanitizedEmail,
      role,
      status: 'pending',
      invited_at: new Date().toISOString(),
      accepted_at: null,
    };

    const query = existing
      ? supabase.from('team_members').update(inviteData).eq('id', existing.id).select().single()
      : supabase.from('team_members').insert(inviteData).select().single();

    const { data: member, error: dbError } = await query;
    if (dbError) {
      console.error('Team invite DB error:', dbError);
      return NextResponse.json({ error: 'Erreur lors de l\'invitation' }, { status: 500 });
    }

    // ARGUS — Envoi de l'email d'invitation (Resend). Best-effort : on ne fait pas
    // échouer l'invitation si l'envoi échoue, mais on signale à l'UI si l'email
    // est parti (pour ne pas afficher le mensonge « email envoyé »).
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) {
        emailError = 'Service email non configuré';
      } else {
        const { Resend } = await import('resend');
        const resend = new Resend(RESEND_API_KEY);
        const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
        const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';
        const acceptLink = `${req.nextUrl.origin}/settings/team?accept=${member.id}`;

        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', user.id)
          .single();
        const ownerName = ownerProfile?.company_name || 'une entreprise';
        const roleLabel = role === 'admin' ? 'Administrateur'
          : role === 'member' ? 'Membre' : 'Lecteur';

        const { error: sendErr } = await resend.emails.send({
          from: `${senderName} <${senderEmail}>`,
          to: [sanitizedEmail],
          subject: `${ownerName} vous invite à rejoindre son équipe sur Factu.me`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;">
              <div style="background:#10b981;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                <h2 style="color:#fff;margin:0;font-size:20px;">Invitation à rejoindre une équipe</h2>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
                <p style="font-size:16px;margin:0 0 16px;">Bonjour,</p>
                <p style="font-size:15px;margin:0 0 16px;">
                  <strong>${ownerName.replace(/</g, '&lt;')}</strong> vous invite à rejoindre son équipe sur Factu.me
                  en tant que <strong>${roleLabel}</strong>.
                </p>
                <p style="font-size:14px;color:#666;margin:0 0 24px;">
                  Vous pourrez consulter et collaborer sur ses documents (factures, clients).
                </p>
                <a href="${acceptLink}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                  Accepter l'invitation
                </a>
                <p style="font-size:12px;color:#999;margin:24px 0 0;">
                  Si le bouton ne fonctionne pas, copiez ce lien : ${acceptLink}
                </p>
              </div>
            </div>`,
        });
        if (sendErr) {
          emailError = sendErr.message || 'Échec de l\'envoi';
        } else {
          emailSent = true;
        }
      }
    } catch (err: any) {
      emailError = err?.message || 'Erreur inconnue';
      console.warn('[team-invite] Envoi email échoué (non bloquant):', emailError);
    }

    return NextResponse.json({ success: true, member, emailSent, emailError });
  } catch (error: any) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
