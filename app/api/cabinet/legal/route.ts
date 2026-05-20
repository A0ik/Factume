import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

const VALID_ACT_TYPES = [
  'pv_ag',
  'statuts_modification',
  'nomination',
  'radiation',
  'transfert_siege',
  'capital_variation',
  'dissolution',
  'autre',
] as const;

const VALID_ACT_STATUSES = ['pending', 'in_progress', 'done', 'filed'] as const;

const VALID_LEGAL_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'SCI', 'SELARL'] as const;

const VALID_CREATION_STATUSES = ['draft', 'in_progress', 'registered', 'abandoned'] as const;

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
    const tab = searchParams.get('tab') || 'acts';
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');

    if (tab === 'creations') {
      let query = admin
        .from('cabinet_company_creations')
        .select('*')
        .eq('cabinet_id', cabinet.id)
        .order('created_at', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);
      if (status) query = query.eq('status', status);

      const { data: creations, error } = await query;

      if (error) {
        console.error('[legal GET] Creations query error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ creations: [] });
        }
        throw error;
      }

      return NextResponse.json({ creations: creations || [] });
    }

    // Default: return legal acts
    let query = admin
      .from('cabinet_legal_acts')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('act_date', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);

    const { data: acts, error } = await query;

    if (error) {
      console.error('[legal GET] Acts query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ acts: [] });
      }
      throw error;
    }

    return NextResponse.json({ acts: acts || [] });
  } catch (err: any) {
    console.error('[legal GET] Error:', err);
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
    const { type } = body;

    if (type === 'creation') {
      // Create company creation
      const { company_name, legal_form, capital, head_office, corporate_purpose, manager, naf_code, associates, client_id, constitution_date, status, checklist, notes } = body;

      if (!company_name) {
        return NextResponse.json({ error: 'Nom de la société requis' }, { status: 400 });
      }

      if (legal_form && !VALID_LEGAL_FORMS.includes(legal_form)) {
        return NextResponse.json({ error: 'Forme juridique invalide' }, { status: 400 });
      }

      const creationStatus = status && VALID_CREATION_STATUSES.includes(status) ? status : 'draft';

      const { data: creation, error } = await admin
        .from('cabinet_company_creations')
        .insert({
          cabinet_id: cabinet.id,
          client_id: client_id || null,
          company_name,
          legal_form: legal_form || null,
          capital: capital || null,
          head_office: head_office || null,
          corporate_purpose: corporate_purpose || null,
          manager: manager || null,
          naf_code: naf_code || null,
          associates: associates || null,
          constitution_date: constitution_date || null,
          status: creationStatus,
          checklist: checklist || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[legal POST] Creation insert error:', error);
        if (error.code === '42P01') {
          return NextResponse.json(
            { error: 'Table cabinet_company_creations non trouvée. Veuillez exécuter la migration.' },
            { status: 500 }
          );
        }
        throw error;
      }

      return NextResponse.json({ creation }, { status: 201 });
    }

    // Default: create legal act
    const { client_id, act_type, description, act_date, status, responsible, notes, document_url } = body;

    if (!act_type) {
      return NextResponse.json({ error: 'Type d\'acte requis' }, { status: 400 });
    }

    if (!VALID_ACT_TYPES.includes(act_type)) {
      return NextResponse.json({ error: 'Type d\'acte invalide' }, { status: 400 });
    }

    const actStatus = status && VALID_ACT_STATUSES.includes(status) ? status : 'pending';

    const { data: act, error } = await admin
      .from('cabinet_legal_acts')
      .insert({
        cabinet_id: cabinet.id,
        client_id: client_id || null,
        act_type,
        description: description || null,
        act_date: act_date || null,
        status: actStatus,
        responsible: responsible || null,
        notes: notes || null,
        document_url: document_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[legal POST] Act insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Table cabinet_legal_acts non trouvée. Veuillez exécuter la migration.' },
          { status: 500 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Client non trouvé' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ act }, { status: 201 });
  } catch (err: any) {
    console.error('[legal POST] Error:', err);
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
    const { id, table } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    if (table === 'creation') {
      // Update company creation
      const { company_name, legal_form, capital, head_office, corporate_purpose, manager, naf_code, associates, client_id, constitution_date, status, checklist, notes } = body;

      if (legal_form && !VALID_LEGAL_FORMS.includes(legal_form)) {
        return NextResponse.json({ error: 'Forme juridique invalide' }, { status: 400 });
      }

      if (status && !VALID_CREATION_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (company_name !== undefined) updateData.company_name = company_name;
      if (legal_form !== undefined) updateData.legal_form = legal_form;
      if (capital !== undefined) updateData.capital = capital;
      if (head_office !== undefined) updateData.head_office = head_office;
      if (corporate_purpose !== undefined) updateData.corporate_purpose = corporate_purpose;
      if (manager !== undefined) updateData.manager = manager;
      if (naf_code !== undefined) updateData.naf_code = naf_code;
      if (associates !== undefined) updateData.associates = associates;
      if (client_id !== undefined) updateData.client_id = client_id;
      if (constitution_date !== undefined) updateData.constitution_date = constitution_date;
      if (status) updateData.status = status;
      if (checklist !== undefined) updateData.checklist = checklist;
      if (notes !== undefined) updateData.notes = notes;

      const { data: creation, error } = await admin
        .from('cabinet_company_creations')
        .update(updateData)
        .eq('id', id)
        .eq('cabinet_id', cabinet.id)
        .select()
        .single();

      if (error) throw error;
      if (!creation) {
        return NextResponse.json({ error: 'Création non trouvée' }, { status: 404 });
      }

      return NextResponse.json({ creation });
    }

    // Default: update legal act
    const { client_id, act_type, description, act_date, status, responsible, notes, document_url } = body;

    if (act_type && !VALID_ACT_TYPES.includes(act_type)) {
      return NextResponse.json({ error: 'Type d\'acte invalide' }, { status: 400 });
    }

    if (status && !VALID_ACT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (client_id !== undefined) updateData.client_id = client_id;
    if (act_type) updateData.act_type = act_type;
    if (description !== undefined) updateData.description = description;
    if (act_date !== undefined) updateData.act_date = act_date;
    if (status) updateData.status = status;
    if (responsible !== undefined) updateData.responsible = responsible;
    if (notes !== undefined) updateData.notes = notes;
    if (document_url !== undefined) updateData.document_url = document_url;

    const { data: act, error } = await admin
      .from('cabinet_legal_acts')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) throw error;
    if (!act) {
      return NextResponse.json({ error: 'Acte non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ act });
  } catch (err: any) {
    console.error('[legal PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
