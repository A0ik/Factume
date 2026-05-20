import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

// ─── Shared Auth Helper ────────────────────────────────────────────────────

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
    return { error: NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 }) };
  }

  const cabinet = await getCabinetForUser(user.id);
  if (!cabinet) {
    return { error: NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 }) };
  }

  return { admin, cabinet };
}

// ─── Valid values ───────────────────────────────────────────────────────────

const VALID_CONTRACT_TYPES = [
  'CDI', 'CDD', 'CDD_usage', 'CDD_reconversion', 'Interim',
  'Stage', 'Apprentissage', 'Professionnalisation',
] as const;

const VALID_STATUSES = [
  'en_cours', 'en_attente_signature', 'signe', 'suspendu', 'rompu', 'termine',
] as const;

const CDD_TYPES = ['CDD', 'CDD_usage', 'CDD_reconversion'];

// ─── GET: List contracts ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    const typeContrat = searchParams.get('type_contrat');
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');

    let query = admin
      .from('contrats_travail')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('created_at', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);
    if (typeContrat) query = query.eq('type_contrat', typeContrat);
    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);

    const { data: contracts, error } = await query;

    if (error) {
      console.error('[contracts GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ contracts: [] });
      }
      throw error;
    }

    return NextResponse.json({ contracts: contracts || [] });
  } catch (err: any) {
    console.error('[contracts GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST: Create contract ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const {
      employee_id, client_id, type_contrat, status,
      date_debut, date_fin, poste, lieu_travail,
      classification, coef, convention_collective,
      periode_essai_jours, motif_cdd,
      salaire_brut_mensuel, taux_horaire, heures_hebdo,
      clause_non_concurrence, clause_confidentialite,
      clause_mobility, clause_non_solicitation,
      teletravail, notes,
    } = body;

    // Required fields
    if (!employee_id || !type_contrat || !date_debut || !poste) {
      return NextResponse.json(
        { error: 'employee_id, type_contrat, date_debut et poste sont requis' },
        { status: 400 },
      );
    }

    // Validate contract type
    if (!VALID_CONTRACT_TYPES.includes(type_contrat)) {
      return NextResponse.json(
        { error: `Type de contrat invalide. Valeurs autorisées : ${VALID_CONTRACT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // CDD must have date_fin
    if (CDD_TYPES.includes(type_contrat) && !date_fin) {
      return NextResponse.json(
        { error: 'Une date de fin est requise pour les contrats CDD' },
        { status: 400 },
      );
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate salary
    if (salaire_brut_mensuel !== undefined && salaire_brut_mensuel <= 0) {
      return NextResponse.json(
        { error: 'Le salaire brut mensuel doit être supérieur à 0' },
        { status: 400 },
      );
    }

    const insertData: Record<string, any> = {
      cabinet_id: cabinet.id,
      employee_id,
      type_contrat,
      date_debut,
      poste,
      status: status || 'en_attente_signature',
    };

    if (client_id !== undefined) insertData.client_id = client_id;
    if (date_fin !== undefined) insertData.date_fin = date_fin;
    if (lieu_travail !== undefined) insertData.lieu_travail = lieu_travail;
    if (classification !== undefined) insertData.classification = classification;
    if (coef !== undefined) insertData.coef = coef;
    if (convention_collective !== undefined) insertData.convention_collective = convention_collective;
    if (periode_essai_jours !== undefined) insertData.periode_essai_jours = periode_essai_jours;
    if (motif_cdd !== undefined) insertData.motif_cdd = motif_cdd;
    if (salaire_brut_mensuel !== undefined) insertData.salaire_brut_mensuel = salaire_brut_mensuel;
    if (taux_horaire !== undefined) insertData.taux_horaire = taux_horaire;
    if (heures_hebdo !== undefined) insertData.heures_hebdo = heures_hebdo;
    if (clause_non_concurrence !== undefined) insertData.clause_non_concurrence = clause_non_concurrence;
    if (clause_confidentialite !== undefined) insertData.clause_confidentialite = clause_confidentialite;
    if (clause_mobility !== undefined) insertData.clause_mobility = clause_mobility;
    if (clause_non_solicitation !== undefined) insertData.clause_non_solicitation = clause_non_solicitation;
    if (teletravail !== undefined) insertData.teletravail = teletravail;
    if (notes !== undefined) insertData.notes = notes;

    const { data: contract, error } = await admin
      .from('contrats_travail')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[contracts POST] Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table contrats_travail non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ contract }, { status: 201 });
  } catch (err: any) {
    console.error('[contracts POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PATCH: Update contract ──────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du contrat requis' }, { status: 400 });
    }

    if (fields.type_contrat && !VALID_CONTRACT_TYPES.includes(fields.type_contrat)) {
      return NextResponse.json(
        { error: `Type de contrat invalide. Valeurs autorisées : ${VALID_CONTRACT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (fields.status && !VALID_STATUSES.includes(fields.status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const allowedFields = [
      'type_contrat', 'status', 'date_debut', 'date_fin', 'poste', 'lieu_travail',
      'classification', 'coef', 'convention_collective', 'periode_essai_jours',
      'motif_cdd', 'salaire_brut_mensuel', 'taux_horaire', 'heures_hebdo',
      'clause_non_concurrence', 'clause_confidentialite', 'clause_mobility',
      'clause_non_solicitation', 'teletravail', 'notes',
    ];

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }

    const { data: contract, error } = await admin
      .from('contrats_travail')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[contracts PATCH] Update error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table contrats_travail non trouvée' }, { status: 500 });
      }
      throw error;
    }

    if (!contract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (err: any) {
    console.error('[contracts PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE: Delete contract ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du contrat requis' }, { status: 400 });
    }

    const { error } = await admin
      .from('contrats_travail')
      .delete()
      .eq('id', id)
      .eq('cabinet_id', cabinet.id);

    if (error) {
      console.error('[contracts DELETE] Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[contracts DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
