import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { resolveCabinetAccess, getScopedClientIds, requireCabinetStaff } from '@/lib/cabinet-auth';

const VALID_DSN_STATUSES = ['sent', 'pending', 'blocked', 'na'] as const;

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

    // ODIN (CIBLE 1) — un viewer/client ne voit QUE son propre suivi social.
    const access = await resolveCabinetAccess(admin, cabinet, user.id);
    const scopedClientIds = await getScopedClientIds(admin, cabinet.id, user.id, access);
    if (scopedClientIds && scopedClientIds.length === 0) {
      return NextResponse.json({ tracking: [] });
    }

    // Parse required query params
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const clientId = searchParams.get('client_id');

    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: 'Les paramètres month et year sont requis' },
        { status: 400 },
      );
    }

    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Mois invalide (1-12)' },
        { status: 400 },
      );
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Année invalide' },
        { status: 400 },
      );
    }

    let query = admin
      .from('cabinet_social_tracking')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .eq('month', month)
      .eq('year', year);

    if (scopedClientIds) query = query.in('client_id', scopedClientIds);
    if (clientId) query = query.eq('client_id', clientId);

    const { data: tracking, error } = await query;

    if (error) {
      console.error('[social GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ tracking: [] });
      }
      throw error;
    }

    return NextResponse.json({ tracking: tracking || [] });
  } catch (err: any) {
    console.error('[social GET] Error:', err);
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

    // ODIN (CIBLE 1) — seuls owner / admin / manager peuvent écrire le suivi social.
    const guard = await requireCabinetStaff(admin, cabinet, user.id);
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const {
      client_id, month, year,
      nb_employees, bs_issued, bs_validated,
      dsn_status, stc_status, contracts_count, amendments_count,
      at_mp, observations,
    } = body;

    // Validate required fields
    if (!client_id || month === undefined || year === undefined) {
      return NextResponse.json(
        { error: 'client_id, month et year sont requis' },
        { status: 400 },
      );
    }

    const monthNum = parseInt(String(month), 10);
    const yearNum = parseInt(String(year), 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Mois invalide (1-12)' }, { status: 400 });
    }
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 });
    }

    // Validate dsn_status if provided
    if (dsn_status && !VALID_DSN_STATUSES.includes(dsn_status)) {
      return NextResponse.json(
        { error: 'Statut DSN invalide. Valeurs autorisées : sent, pending, blocked, na' },
        { status: 400 },
      );
    }

    const upsertData: Record<string, any> = {
      cabinet_id: cabinet.id,
      client_id,
      month: monthNum,
      year: yearNum,
    };

    if (nb_employees !== undefined) upsertData.nb_employees = nb_employees;
    if (bs_issued !== undefined) upsertData.bs_issued = bs_issued;
    if (bs_validated !== undefined) upsertData.bs_validated = bs_validated;
    if (dsn_status !== undefined) upsertData.dsn_status = dsn_status;
    if (stc_status !== undefined) upsertData.stc_status = stc_status;
    if (contracts_count !== undefined) upsertData.contracts_count = contracts_count;
    if (amendments_count !== undefined) upsertData.amendments_count = amendments_count;
    if (at_mp !== undefined) upsertData.at_mp = at_mp;
    if (observations !== undefined) upsertData.observations = observations;
    upsertData.updated_at = new Date().toISOString();

    const { data: tracking, error } = await admin
      .from('cabinet_social_tracking')
      .upsert(upsertData, { onConflict: 'cabinet_id,client_id,month,year' })
      .select()
      .single();

    if (error) {
      console.error('[social POST] Upsert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table cabinet_social_tracking non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ tracking }, { status: 201 });
  } catch (err: any) {
    console.error('[social POST] Error:', err);
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

    // ODIN (CIBLE 1) — seuls owner / admin / manager peuvent modifier le suivi social.
    const guard = await requireCabinetStaff(admin, cabinet, user.id);
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du suivi social requis' }, { status: 400 });
    }

    // Validate dsn_status if provided
    if (fields.dsn_status && !VALID_DSN_STATUSES.includes(fields.dsn_status)) {
      return NextResponse.json(
        { error: 'Statut DSN invalide. Valeurs autorisées : sent, pending, blocked, na' },
        { status: 400 },
      );
    }

    // Build update object from provided fields
    const allowedFields = [
      'month', 'year', 'nb_employees', 'bs_issued', 'bs_validated',
      'dsn_status', 'stc_status', 'contracts_count', 'amendments_count',
      'at_mp', 'observations',
    ];

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }

    const { data: tracking, error } = await admin
      .from('cabinet_social_tracking')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[social PATCH] Update error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table cabinet_social_tracking non trouvée' }, { status: 500 });
      }
      throw error;
    }

    if (!tracking) {
      return NextResponse.json({ error: 'Suivi social non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ tracking });
  } catch (err: any) {
    console.error('[social PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
