import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { validateNIR } from '@/lib/labor-law/dpae';

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

const VALID_STATUSES = ['en_preparation', 'envoyee', 'confirmee', 'rejetee'] as const;

// ─── GET: List DPAEs ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = admin
      .from('dpae')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: dpaeList, error } = await query;

    if (error) {
      console.error('[dpae GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ dpae: [] });
      }
      throw error;
    }

    return NextResponse.json({ dpae: dpaeList || [] });
  } catch (err: any) {
    console.error('[dpae GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST: Create DPAE ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const {
      employee_id, client_id,
      siret, raison_sociale, adresse_employeur, code_ape, urssaf,
      nir, nom, prenom, date_naissance, lieu_naissance,
      nationalite, sexe, adresse_salarie,
      type_contrat, date_embauche, poste, lieu_travail,
      salaire_brut, taux_horaire, heures_hebdo,
      periode_essai, convention_collective,
      status,
    } = body;

    // Required fields
    if (!siret || !nir || !nom || !prenom || !date_embauche || !type_contrat || !poste) {
      return NextResponse.json(
        { error: 'siret, nir, nom, prenom, date_embauche, type_contrat et poste sont requis' },
        { status: 400 },
      );
    }

    // Validate SIRET
    if (!/^\d{14}$/.test(siret.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Le numéro SIRET doit comporter 14 chiffres' }, { status: 400 });
    }

    // Validate NIR
    const nirCheck = validateNIR(nir);
    if (!nirCheck.valid) {
      return NextResponse.json({ error: nirCheck.error || 'NIR invalide' }, { status: 400 });
    }

    // Validate salary
    if (!salaire_brut || salaire_brut <= 0) {
      return NextResponse.json({ error: 'Le salaire brut doit être supérieur à 0' }, { status: 400 });
    }

    const insertData: Record<string, any> = {
      cabinet_id: cabinet.id,
      siret: siret.replace(/\s/g, ''),
      nir: nir.replace(/\s/g, ''),
      nom,
      prenom,
      date_embauche,
      type_contrat,
      poste,
      salaire_brut,
      status: status || 'en_preparation',
    };

    if (employee_id !== undefined) insertData.employee_id = employee_id;
    if (client_id !== undefined) insertData.client_id = client_id;
    if (raison_sociale !== undefined) insertData.raison_sociale = raison_sociale;
    if (adresse_employeur !== undefined) insertData.adresse_employeur = adresse_employeur;
    if (code_ape !== undefined) insertData.code_ape = code_ape;
    if (urssaf !== undefined) insertData.urssaf = urssaf;
    if (date_naissance !== undefined) insertData.date_naissance = date_naissance;
    if (lieu_naissance !== undefined) insertData.lieu_naissance = lieu_naissance;
    if (nationalite !== undefined) insertData.nationalite = nationalite;
    if (sexe !== undefined) insertData.sexe = sexe;
    if (adresse_salarie !== undefined) insertData.adresse_salarie = adresse_salarie;
    if (lieu_travail !== undefined) insertData.lieu_travail = lieu_travail;
    if (taux_horaire !== undefined) insertData.taux_horaire = taux_horaire;
    if (heures_hebdo !== undefined) insertData.heures_hebdo = heures_hebdo;
    if (periode_essai !== undefined) insertData.periode_essai = periode_essai;
    if (convention_collective !== undefined) insertData.convention_collective = convention_collective;

    const { data: dpae, error } = await admin
      .from('dpae')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[dpae POST] Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table dpae non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ dpae }, { status: 201 });
  } catch (err: any) {
    console.error('[dpae POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PATCH: Update DPAE status ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const { id, status, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de la DPAE requis' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const allowedFields = [
      'status', 'date_envoi', 'date_confirmation', 'rejet_motif', 'notes',
    ];
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }
    if (status !== undefined) updateData.status = status;

    // Auto-set timestamps
    if (status === 'envoyee' && !fields.date_envoi) {
      updateData.date_envoi = new Date().toISOString();
    }
    if (status === 'confirmee' && !fields.date_confirmation) {
      updateData.date_confirmation = new Date().toISOString();
    }

    const { data: dpae, error } = await admin
      .from('dpae')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[dpae PATCH] Update error:', error);
      throw error;
    }

    if (!dpae) {
      return NextResponse.json({ error: 'DPAE non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ dpae });
  } catch (err: any) {
    console.error('[dpae PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE: Delete DPAE ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la DPAE requis' }, { status: 400 });
    }

    const { error } = await admin
      .from('dpae')
      .delete()
      .eq('id', id)
      .eq('cabinet_id', cabinet.id);

    if (error) {
      console.error('[dpae DELETE] Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[dpae DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
