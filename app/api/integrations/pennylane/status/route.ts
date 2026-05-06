import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: integration } = await admin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'pennylane')
      .single();

    if (!integration || integration.status !== 'connected') {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      company: integration.config?.company_name,
      lastSynced: integration.last_synced_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
