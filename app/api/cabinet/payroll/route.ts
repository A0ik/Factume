import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { calculerCotisations } from '@/lib/labor-law/cotisations';

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

const VALID_STATUSES = ['brouillon', 'valide', 'paye'] as const;

// ─── GET: List bulletins ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const mois = searchParams.get('mois');
    const annee = searchParams.get('annee');
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');

    let query = admin
      .from('bulletins_paie')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('created_at', { ascending: false });

    if (mois) query = query.eq('mois', parseInt(mois));
    if (annee) query = query.eq('annee', parseInt(annee));
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);

    const { data: bulletins, error } = await query;

    if (error) {
      console.error('[payroll GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ bulletins: [] });
      }
      throw error;
    }

    return NextResponse.json({ bulletins: bulletins || [] });
  } catch (err: any) {
    console.error('[payroll GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST: Create / Upsert bulletin ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const {
      employee_id, mois, annee, status,
      salaire_brut, salaire_brut_annuel,
      heures_mensuelles, heures_supp_25, heures_supp_50,
      prime_exceptionnelle, prime_13mois, prime_performance,
      jours_maladie, jours_absence,
      taux_horaire, statut_cadre,
      periode_debut, periode_fin,
      nombre_jours_ouvres,
      // Données entreprise (pour le bulletin)
      employee_data, company_data,
    } = body;

    if (!employee_id || !mois || !annee) {
      return NextResponse.json(
        { error: 'employee_id, mois et annee sont requis' },
        { status: 400 },
      );
    }

    if (mois < 1 || mois > 12) {
      return NextResponse.json({ error: 'Mois invalide (1-12)' }, { status: 400 });
    }

    const brutTotal = (salaire_brut || 0)
      + (prime_exceptionnelle || 0)
      + (prime_13mois || 0)
      + (prime_performance || 0);

    if (brutTotal <= 0) {
      return NextResponse.json(
        { error: 'Le salaire brut doit être supérieur à 0' },
        { status: 400 },
      );
    }

    // Calculer les cotisations
    const cotisations = calculerCotisations({
      salaireBrut: brutTotal,
      salaireBrutAnnuel: salaire_brut_annuel || brutTotal * 12,
      statut: statut_cadre === 'cadre' ? 'cadre' : 'non_cadre',
      tempsPartiel: (heures_mensuelles || 151.67) < 151.67,
    });

    // Préparer les données du bulletin
    const bulletinData: Record<string, any> = {
      cabinet_id: cabinet.id,
      employee_id,
      mois,
      annee,
      status: status || 'brouillon',
      salaire_brut: brutTotal,
      salaire_net: cotisations.salaireNet,
      salaire_net_imposable: cotisations.salaireNetImposable,
      cotisations_patronales: cotisations.patronales.total,
      cotisations_salariales: cotisations.salariales.total,
      cout_employeur: cotisations.coutEmployer,
      cotisations_detail: {
        patronales: cotisations.patronales,
        salariales: cotisations.salariales,
      },
      heures_mensuelles: heures_mensuelles || 151.67,
      heures_supp_25: heures_supp_25 || 0,
      heures_supp_50: heures_supp_50 || 0,
      jours_maladie: jours_maladie || 0,
      jours_absence: jours_absence || 0,
      taux_horaire: taux_horaire || 0,
      periode_debut: periode_debut || null,
      periode_fin: periode_fin || null,
      nombre_jours_ouvres: nombre_jours_ouvres || 22,
      employee_data: employee_data || null,
      company_data: company_data || null,
      reduction_fillon: cotisations.patronales.reduction_fillon,
    };

    // Upsert : vérifier si un bulletin existe déjà pour ce salarié/mois/année
    const { data: existing } = await admin
      .from('bulletins_paie')
      .select('id')
      .eq('cabinet_id', cabinet.id)
      .eq('employee_id', employee_id)
      .eq('mois', mois)
      .eq('annee', annee)
      .maybeSingle();

    let result;

    if (existing) {
      // Update existing bulletin
      const { data: bulletin, error } = await admin
        .from('bulletins_paie')
        .update({
          ...bulletinData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('cabinet_id', cabinet.id)
        .select()
        .single();

      if (error) {
        console.error('[payroll POST] Upsert error:', error);
        throw error;
      }
      result = bulletin;
    } else {
      // Insert new bulletin
      const { data: bulletin, error } = await admin
        .from('bulletins_paie')
        .insert(bulletinData)
        .select()
        .single();

      if (error) {
        console.error('[payroll POST] Insert error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'Table bulletins_paie non trouvée' }, { status: 500 });
        }
        throw error;
      }
      result = bulletin;
    }

    return NextResponse.json({ bulletin: result }, { status: existing ? 200 : 201 });
  } catch (err: any) {
    console.error('[payroll POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── PATCH: Update bulletin status ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const body = await req.json();
    const { id, status, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const allowedFields = ['status', 'salaire_brut', 'notes'];
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }
    if (status !== undefined) updateData.status = status;

    const { data: bulletin, error } = await admin
      .from('bulletins_paie')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[payroll PATCH] Update error:', error);
      throw error;
    }

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ bulletin });
  } catch (err: any) {
    console.error('[payroll PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ─── DELETE: Delete bulletin ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    }

    const { error } = await admin
      .from('bulletins_paie')
      .delete()
      .eq('id', id)
      .eq('cabinet_id', cabinet.id);

    if (error) {
      console.error('[payroll DELETE] Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[payroll DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
