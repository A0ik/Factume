import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { cabinet_id } = await req.json();
    if (!cabinet_id) return NextResponse.json({ error: 'cabinet_id requis' }, { status: 400 });

    const { error } = await admin
      .from('cabinet_clients')
      .update({ status: 'active', connected_at: new Date().toISOString() })
      .eq('cabinet_id', cabinet_id)
      .eq('client_user_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
