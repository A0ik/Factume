import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest) {
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

    const { data: members } = await admin
      .from('cabinet_members')
      .select('id, user_id, cabinet_id, role, invited_at, profile:profiles!user_id(email, first_name, last_name)')
      .eq('cabinet_id', cabinet.id)
      .order('invited_at', { ascending: false });

    return NextResponse.json({ members: members || [], owner_id: cabinet.owner_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    // Only owner can remove members
    if (cabinet.owner_id !== user.id) {
      return NextResponse.json({ error: 'Seul le propriétaire peut retirer des membres' }, { status: 403 });
    }

    const { memberId } = await req.json();
    if (!memberId) return NextResponse.json({ error: 'ID membre requis' }, { status: 400 });

    // Don't allow removing the owner
    const { data: member } = await admin
      .from('cabinet_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('cabinet_id', cabinet.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });

    if (member.user_id === cabinet.owner_id) {
      return NextResponse.json({ error: 'Impossible de retirer le propriétaire' }, { status: 400 });
    }

    const { error } = await admin
      .from('cabinet_members')
      .delete()
      .eq('id', memberId)
      .eq('cabinet_id', cabinet.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
