import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { inviteId } = await req.json();
    if (!inviteId) {
      return NextResponse.json({ error: 'ID invitation requis' }, { status: 400 });
    }

    const { data: invite, error: fetchError } = await supabase
      .from('team_members')
      .select('id, email, status, team_owner_id')
      .eq('id', inviteId)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation déjà traitée' }, { status: 400 });
    }

    if (invite.email !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Cette invitation ne vous est pas destinée' }, { status: 403 });
    }

    const { error } = await supabase
      .from('team_members')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq('id', inviteId);

    if (error) {
      console.error('Team accept error:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'acceptation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Team accept error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
