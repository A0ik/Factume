import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { PennylaneClient } from '@/lib/pennylane-client';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { api_key } = await req.json();
    if (!api_key) return NextResponse.json({ error: 'Clé API requise' }, { status: 400 });

    const client = new PennylaneClient(api_key);
    const isValid = await client.testConnection();
    if (!isValid) {
      return NextResponse.json({ error: 'Clé API invalide ou connexion impossible' }, { status: 400 });
    }

    const self = await client.getSelf();

    const { error } = await admin
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'pennylane',
        config: { api_key, company_name: self?.company?.name },
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (error) throw error;

    return NextResponse.json({ success: true, company: self?.company?.name });
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

    const { error } = await admin
      .from('integrations')
      .update({ status: 'disconnected', config: {}, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('provider', 'pennylane');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
