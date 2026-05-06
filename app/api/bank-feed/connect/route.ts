import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { BridgeClient } from '@/lib/bridge-client';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const clientId = process.env.BRIDGE_CLIENT_ID;
    const clientSecret = process.env.BRIDGE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Bridge API non configuré. Ajoutez BRIDGE_CLIENT_ID et BRIDGE_CLIENT_SECRET.' }, { status: 500 });
    }

    const bridge = new BridgeClient(clientId, clientSecret);
    const userUuid = user.id;
    const url = await bridge.getConnectUrl(userUuid);

    await admin
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'bridge',
        config: { user_uuid: userUuid },
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
