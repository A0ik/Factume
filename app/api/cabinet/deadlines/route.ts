import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ deadlines: [], clients: [] });
    }

    // Fetch clients for the cabinet
    const clients = await getCabinetClients(cabinet.id);
    const activeClients = clients.filter((c: any) => c.status === 'active');

    // Parse optional query params
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g. "2026-05"
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');
    const priorityFilter = searchParams.get('priority');
    const clientIdFilter = searchParams.get('client_id');

    let query = admin
      .from('cabinet_fiscal_deadlines')
      .select('*, client:cabinet_clients(id, profile:profiles!client_user_id(company_name, first_name, last_name))')
      .eq('cabinet_id', cabinet.id)
      .order('deadline_date', { ascending: true });

    if (month) {
      const start = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const end = new Date(y, m, 1).toISOString().split('T')[0];
      query = query.gte('deadline_date', start).lt('deadline_date', end);
    }
    if (statusFilter) query = query.eq('status', statusFilter);
    if (typeFilter) query = query.eq('deadline_type', typeFilter);
    if (priorityFilter) query = query.eq('priority', priorityFilter);
    if (clientIdFilter) query = query.eq('client_id', clientIdFilter);

    const { data: deadlines, error } = await query;

    if (error) {
      console.error('[deadlines GET] Query error:', error);
      // Table might not exist yet — return empty array gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ deadlines: [], clients: activeClients.map((c: any) => ({
          id: c.id,
          name: c.profile?.company_name || c.profile?.first_name || 'Client',
        }))});
      }
      throw error;
    }

    // Auto-mark overdue deadlines
    const today = new Date().toISOString().split('T')[0];
    const updates: string[] = [];
    for (const d of (deadlines || [])) {
      if (d.status === 'pending' && d.deadline_date < today) {
        updates.push(d.id);
      }
    }
    if (updates.length > 0) {
      await admin
        .from('cabinet_fiscal_deadlines')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .in('id', updates);
      // Reflect in returned data
      for (const d of (deadlines || [])) {
        if (updates.includes(d.id)) d.status = 'overdue';
      }
    }

    return NextResponse.json({
      deadlines: deadlines || [],
      clients: activeClients.map((c: any) => ({
        id: c.id,
        name: c.profile?.company_name || c.profile?.first_name || 'Client',
      })),
    });
  } catch (err: any) {
    console.error('[deadlines GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouve' }, { status: 404 });
    }

    const body = await req.json();
    const { client_id, deadline_type, description, deadline_date, priority, responsible, notes } = body;

    if (!deadline_type || !description || !deadline_date) {
      return NextResponse.json({ error: 'Type, description et date sont requis' }, { status: 400 });
    }

    // Validate deadline_type
    const validTypes = ['bilan', 'tva', 'social', 'fiscal', 'is', 'autre'];
    if (!validTypes.includes(deadline_type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    // Validate priority
    const validPriorities = ['urgent', 'normal', 'low'];
    const safePriority = validPriorities.includes(priority) ? priority : 'normal';

    // If client_id provided, verify it belongs to the cabinet
    if (client_id) {
      const clients = await getCabinetClients(cabinet.id);
      const isClientOfCabinet = clients.some((c: any) => c.id === client_id && c.status === 'active');
      if (!isClientOfCabinet) {
        return NextResponse.json({ error: 'Client non autorise' }, { status: 403 });
      }
    }

    const { data: deadline, error } = await admin
      .from('cabinet_fiscal_deadlines')
      .insert({
        cabinet_id: cabinet.id,
        client_id: client_id || null,
        deadline_type,
        description,
        deadline_date,
        priority: safePriority,
        status: 'pending',
        responsible: responsible || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ deadline }, { status: 201 });
  } catch (err: any) {
    console.error('[deadlines POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouve' }, { status: 404 });
    }

    const body = await req.json();
    const { id, status, priority, description, deadline_date, responsible, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de l\'echeance requis' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) {
      const validStatuses = ['pending', 'done', 'overdue'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'done') updateData.completed_at = new Date().toISOString();
    }
    if (priority) updateData.priority = priority;
    if (description !== undefined) updateData.description = description;
    if (deadline_date) updateData.deadline_date = deadline_date;
    if (responsible !== undefined) updateData.responsible = responsible;
    if (notes !== undefined) updateData.notes = notes;

    const { data: deadline, error } = await admin
      .from('cabinet_fiscal_deadlines')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) throw error;
    if (!deadline) {
      return NextResponse.json({ error: 'Echeance non trouvee' }, { status: 404 });
    }

    return NextResponse.json({ deadline });
  } catch (err: any) {
    console.error('[deadlines PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
