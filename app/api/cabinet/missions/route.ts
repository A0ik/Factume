import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

const VALID_MISSION_TYPES = [
  'expertise_comptable',
  'paie_social',
  'cac',
  'conseil_fiscal',
  'juridique',
  'autre',
] as const;

const VALID_STATUSES = ['active', 'signed', 'expired', 'to_renew', 'cancelled'] as const;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

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
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const missionType = searchParams.get('mission_type');

    let query = admin
      .from('cabinet_missions')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('start_date', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (missionType) query = query.eq('mission_type', missionType);

    const { data: missions, error } = await query;

    if (error) {
      console.error('[missions GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ missions: [] });
      }
      throw error;
    }

    return NextResponse.json({ missions: missions || [] });
  } catch (err: any) {
    console.error('[missions GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

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
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { client_id, mission_type, start_date, description, end_date, auto_renew, monthly_fee, status, responsible, notes } = body;

    if (!client_id || !mission_type || !start_date) {
      return NextResponse.json(
        { error: 'Client, type de mission et date de début sont requis' },
        { status: 400 }
      );
    }

    if (!VALID_MISSION_TYPES.includes(mission_type)) {
      return NextResponse.json({ error: 'Type de mission invalide' }, { status: 400 });
    }

    const missionStatus = status && VALID_STATUSES.includes(status) ? status : 'active';

    const { data: mission, error } = await admin
      .from('cabinet_missions')
      .insert({
        cabinet_id: cabinet.id,
        client_id,
        mission_type,
        description: description || null,
        start_date,
        end_date: end_date || null,
        auto_renew: auto_renew !== undefined ? auto_renew : true,
        monthly_fee: monthly_fee || null,
        status: missionStatus,
        responsible: responsible || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[missions POST] Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Table cabinet_missions non trouvée. Veuillez exécuter la migration.' },
          { status: 500 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Client non trouvé' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ mission }, { status: 201 });
  } catch (err: any) {
    console.error('[missions POST] Error:', err);
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
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { id, mission_type, description, start_date, end_date, auto_renew, monthly_fee, status, responsible, signed_at, signed_by, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de la mission requis' }, { status: 400 });
    }

    if (mission_type && !VALID_MISSION_TYPES.includes(mission_type)) {
      return NextResponse.json({ error: 'Type de mission invalide' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (mission_type) updateData.mission_type = mission_type;
    if (description !== undefined) updateData.description = description;
    if (start_date) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (auto_renew !== undefined) updateData.auto_renew = auto_renew;
    if (monthly_fee !== undefined) updateData.monthly_fee = monthly_fee;
    if (status) updateData.status = status;
    if (responsible !== undefined) updateData.responsible = responsible;
    if (signed_at !== undefined) updateData.signed_at = signed_at;
    if (signed_by !== undefined) updateData.signed_by = signed_by;
    if (notes !== undefined) updateData.notes = notes;

    const { data: mission, error } = await admin
      .from('cabinet_missions')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) throw error;
    if (!mission) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ mission });
  } catch (err: any) {
    console.error('[missions PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
