import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
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

    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, email, role, status, invited_at, accepted_at, user_id')
      .eq('team_owner_id', user.id)
      .neq('status', 'removed')
      .order('invited_at', { ascending: true });

    if (error) {
      console.error('Team members fetch error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
    }

    // Add the owner as first entry
    const team = [
      { id: 'owner', email: user.email, role: 'owner', status: 'active', invited_at: null, accepted_at: null, user_id: user.id },
      ...(members || []),
    ];

    return NextResponse.json({ members: team });
  } catch (error: any) {
    console.error('Team members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ error: 'ID membre requis' }, { status: 400 });
    }

    // Verify the member belongs to this owner
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
      return NextResponse.json({ error: 'Impossible de supprimer le propriétaire' }, { status: 400 });
    }

    const { error } = await supabase
      .from('team_members')
      .update({ status: 'removed' })
      .eq('id', memberId);

    if (error) {
      console.error('Team member remove error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Team member delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
