import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { validateDSN } from '@/lib/labor-law/dsn-generator';

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

const VALID_TYPES = ['mensuelle', 'arret_maladie', 'reprise_maladie', 'fin_contrat', 'autre_evenement'];
const VALID_STATUSES = ['en_preparation', 'en_attente', 'envoyee', 'acceptee', 'rejetee', 'en_anomalie'];

// ─── GET: List DSNs ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const mois = searchParams.get('mois');
    const annee = searchParams.get('annee');
    const typeDsn = searchParams.get('type_dsn');
    const status = searchParams.get('status');

    let query = admin
      .from('dsn')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('created_at', { ascending: false });

    if (mois) query = query.eq('mois', parseInt(mois));
    if (annee) query = query.eq('annee', parseInt(annee));
    if (typeDsn) query = query.eq('type_dsn', typeDsn);
    if (status) query = query.eq('status', status);

    const { data: dsnList, error } = await query;

    if (error) {
      console.error('[dsn GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ dsn: [] });
      }
      throw error;
    }

    return NextResponse.json({ dsn: dsnList || [] });
  } catch (err: any) {
    console.error('[dsn GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST: Create DSN ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const {
      mois, annee, type_dsn, status, effectif,
      siret, raison_sociale, code_ape, code_urssaf,
      salaries_data, fichier_contenu,
      contact_nom, contact_prenom, contact_telephone, contact_email,
      notes,
    } = body;

    // Required fields
    if (!mois || !annee || !type_dsn) {
      return NextResponse.json(
        { error: 'mois, annee et type_dsn sont requis' },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(type_dsn)) {
      return NextResponse.json(
        { error: `Type de DSN invalide. Valeurs autorisées : ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (mois < 1 || mois > 12) {
      return NextResponse.json({ error: 'Mois invalide (1-12)' }, { status: 400 });
    }

    // Validate DSN data if salaries provided
    if (salaries_data && Array.isArray(salaries_data)) {
      const validation = validateDSN({
        siret: siret || '',
        raisonSociale: raison_sociale || '',
        adresse: '',
        codePostal: '',
        ville: '',
        codeApe: code_ape || '',
        codeUrssaf: code_urssaf || '',
        effectif: effectif || 0,
        mois,
        annee,
        typeDsn: type_dsn,
        salaries: salaries_data,
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Erreurs de validation', details: validation.errors },
          { status: 400 },
        );
      }
    }

    const insertData: Record<string, any> = {
      cabinet_id: cabinet.id,
      mois,
      annee,
      type_dsn,
      status: status || 'en_preparation',
    };

    if (effectif !== undefined) insertData.effectif = effectif;
    if (siret !== undefined) insertData.siret = siret;
    if (raison_sociale !== undefined) insertData.raison_sociale = raison_sociale;
    if (code_ape !== undefined) insertData.code_ape = code_ape;
    if (code_urssaf !== undefined) insertData.code_urssaf = code_urssaf;
    if (salaries_data !== undefined) insertData.salaries_data = salaries_data;
    if (fichier_contenu !== undefined) insertData.fichier_contenu = fichier_contenu;
    if (contact_nom !== undefined) insertData.contact_nom = contact_nom;
    if (contact_prenom !== undefined) insertData.contact_prenom = contact_prenom;
    if (contact_telephone !== undefined) insertData.contact_telephone = contact_telephone;
    if (contact_email !== undefined) insertData.contact_email = contact_email;
    if (notes !== undefined) insertData.notes = notes;

    const { data: dsn, error } = await admin
      .from('dsn')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[dsn POST] Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table dsn non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ dsn }, { status: 201 });
  } catch (err: any) {
    console.error('[dsn POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PATCH: Update DSN ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const { id, status, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de la DSN requis' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const allowedFields = [
      'status', 'fichier_contenu', 'salaries_data', 'notes',
      'date_envoi', 'date_retour', 'anomalie_details',
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

    const { data: dsn, error } = await admin
      .from('dsn')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[dsn PATCH] Update error:', error);
      throw error;
    }

    if (!dsn) {
      return NextResponse.json({ error: 'DSN non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ dsn });
  } catch (err: any) {
    console.error('[dsn PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE: Delete DSN ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la DSN requis' }, { status: 400 });
    }

    const { error } = await admin
      .from('dsn')
      .delete()
      .eq('id', id)
      .eq('cabinet_id', cabinet.id);

    if (error) {
      console.error('[dsn DELETE] Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[dsn DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
