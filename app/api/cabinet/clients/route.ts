import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

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
    if (!cabinet) {
      return NextResponse.json({ cabinet: null, clients: [] });
    }

    const clients = await getCabinetClients(cabinet.id);
    return NextResponse.json({ cabinet, clients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { name, siret } = await req.json();
    if (!name) return NextResponse.json({ error: 'Nom du cabinet requis' }, { status: 400 });

    const { data: cabinet, error } = await admin
      .from('cabinets')
      .insert({ name, owner_id: user.id, siret })
      .select()
      .single();

    if (error) throw error;

    await admin.from('cabinet_members').insert({
      cabinet_id: cabinet.id,
      user_id: user.id,
      role: 'admin',
    });

    return NextResponse.json({ cabinet });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const updates = await req.json();
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const { error } = await admin
      .from('cabinets')
      .update(updates)
      .eq('id', cabinet.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
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

    const { clientUserId } = await req.json();
    if (!clientUserId) return NextResponse.json({ error: 'clientUserId requis' }, { status: 400 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const { error } = await admin
      .from('cabinet_clients')
      .delete()
      .eq('cabinet_id', cabinet.id)
      .eq('client_user_id', clientUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
