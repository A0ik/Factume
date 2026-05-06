import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateBody } from '@/lib/api-validation';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check Business plan
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    if (!profile || profile.subscription_tier !== 'business') {
      return NextResponse.json({ error: 'Plan Business requis' }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(body, {
      memberId: { required: true, type: 'string' },
      role: { required: true, type: 'string', enum: ['admin', 'member', 'viewer'] },
    });
    if (!validation.valid) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors }, { status: 400 });
    }

    const { memberId, role } = body;

    // Verify member belongs to this owner
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('id', memberId)
      .eq('team_owner_id', user.id)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Impossible de modifier le rôle du propriétaire' }, { status: 400 });
    }

    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId);

    if (error) {
      console.error('Team role update error:', error);
      return NextResponse.json({ error: 'Erreur lors du changement de rôle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Team role error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
