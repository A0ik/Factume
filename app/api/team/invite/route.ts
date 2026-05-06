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

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
