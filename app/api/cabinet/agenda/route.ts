import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Cabinet non trouve' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = admin
      .from('cabinet_agenda_events')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({ events: events || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Cabinet non trouve' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, date, time, type, clientName, location } = body;

    if (!title?.trim() || !date) {
      return NextResponse.json({ error: 'Titre et date requis' }, { status: 400 });
    }

    const { data: event, error } = await admin
      .from('cabinet_agenda_events')
      .insert({
        cabinet_id: cabinet.id,
        title: title.trim(),
        description: description || null,
        date,
        time: time || null,
        type: type || 'autre',
        client_name: clientName || null,
        location: location || null,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Cabinet non trouve' }, { status: 404 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify the event belongs to this cabinet
    const { data: existing } = await admin
      .from('cabinet_agenda_events')
      .select('id')
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Evenement non trouve' }, { status: 404 });
    }

    // Map client-side field names to DB column names
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title?.trim?.() ?? updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;

    const { data: event, error } = await admin
      .from('cabinet_agenda_events')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Cabinet non trouve' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const { error } = await admin
      .from('cabinet_agenda_events')
      .delete()
      .eq('id', id)
      .eq('cabinet_id', cabinet.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
