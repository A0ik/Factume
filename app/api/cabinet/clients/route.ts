import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { resolveCabinetAccess, requireCabinetStaff } from '@/lib/cabinet-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Subscription gate: cabinet clients requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    // MONOLITH: Transmettre l'activeCabinetId pour résolution serveur intelligente
    const activeCabinetId = req.headers.get('x-active-cabinet-id') || undefined;
    const cabinet = await getCabinetForUser(user.id, activeCabinetId);
    if (!cabinet) {
      return NextResponse.json({ cabinet: null, clients: [] });
    }

    // ARGUS — un viewer/client ne voit QUE ses propres données (anti-IDOR).
    const access = await resolveCabinetAccess(admin, cabinet, user.id);
    const allClients = await getCabinetClients(cabinet.id);
    const clients = access.isStaff
      ? allClients
      : allClients.filter((c: any) => c.client_user_id === user.id);
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

    // Subscription gate: cabinet creation requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const { name, siret } = await req.json();
    if (!name) return NextResponse.json({ error: 'Nom du cabinet requis' }, { status: 400 });

    // PROMÉTHÉE/ASTRÉE — Guard serveur maxCabinets (Business = 1).
    // Les cabinets existants (éventuellement > limite) sont conservés (grandfathering),
    // mais on bloque toute NOUVELLE création au-delà du plafond du plan.
    const maxCabinets = sub.plan?.limits?.maxCabinets ?? 1;
    const { count: existingCount } = await admin
      .from('cabinets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    if ((existingCount ?? 0) >= maxCabinets) {
      return NextResponse.json({
        error: `Limite atteinte : ${maxCabinets} cabinet${maxCabinets > 1 ? 's' : ''} maximum sur votre plan.`,
        code: 'CABINET_LIMIT',
        limit: maxCabinets,
        current: existingCount ?? 0,
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

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

    // Subscription gate: cabinet update requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    // ARGOS — allowlist anti-mass-assignment : ne passer que les champs attendus.
    const {
      name, siret, primary_color, logo_url, white_label_name,
      hide_factu_branding, settings,
    } = await req.json();
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (siret !== undefined) updates.siret = siret;
    if (primary_color !== undefined) updates.primary_color = primary_color;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (white_label_name !== undefined) updates.white_label_name = white_label_name;
    if (hide_factu_branding !== undefined) updates.hide_factu_branding = hide_factu_branding;
    if (settings !== undefined) updates.settings = settings;

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // ARGOS — seul le propriétaire peut modifier les réglages du cabinet.
    if (cabinet.owner_id !== user.id) {
      return NextResponse.json({ error: 'Seul le propriétaire peut modifier le cabinet' }, { status: 403 });
    }

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

    // Subscription gate: cabinet client deletion requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const { clientUserId, clientId } = await req.json();

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // ODIN (CIBLE 1) — seuls owner / admin / manager peuvent supprimer un client cabinet.
    const guard = await requireCabinetStaff(admin, cabinet, user.id);
    if (!guard.ok) return guard.response;

    if (clientId) {
      const { error } = await admin.from('cabinet_clients').delete().eq('id', clientId).eq('cabinet_id', cabinet.id);
      if (error) throw error;
    } else if (clientUserId) {
      const { error } = await admin.from('cabinet_clients').delete().eq('cabinet_id', cabinet.id).eq('client_user_id', clientUserId);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'clientId ou clientUserId requis' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
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

    // Subscription gate: cabinet client creation requires Business plan
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'comptableConnect');
    } catch (err: any) {
      const [, feature, message] = err.message.split(':');
      return NextResponse.json({
        error: message || 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        feature,
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const body = await req.json();
    const { company_name, siret, address, zip_code, city, phone, contact_email, contact_name, notes } = body;

    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'Le nom de l\'entreprise est requis' }, { status: 400 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // ODIN (CIBLE 1) — seuls owner / admin / manager peuvent créer un client cabinet.
    const guard = await requireCabinetStaff(admin, cabinet, user.id);
    if (!guard.ok) return guard.response;

    const { data: client, error } = await admin
      .from('cabinet_clients')
      .insert({
        cabinet_id: cabinet.id,
        client_type: 'manual',
        company_name: company_name.trim(),
        siret: siret?.trim() || null,
        address: address?.trim() || null,
        zip_code: zip_code?.trim() || null,
        city: city?.trim() || null,
        phone: phone?.trim() || null,
        contact_email: contact_email?.trim() || null,
        contact_name: contact_name?.trim() || null,
        notes: notes?.trim() || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
