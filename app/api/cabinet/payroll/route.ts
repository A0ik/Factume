import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { calculerCotisations } from '@/lib/labor-law/cotisations';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const { data: profile } = await admin.from('profiles').select('subscription_tier').eq('id', user.id).single();
  if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) return { error: NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 }) };
  const cabinet = await getCabinetForUser(user.id);
  if (!cabinet) return { error: NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 }) };
  return { admin, cabinet };
}

const VALID_STATUSES = ['brouillon', 'valide', 'paye'];

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
    let query = admin.from('bulletins_paie').select('*').eq('cabinet_id', cabinet.id).order('created_at', { ascending: false });
    if (mois) query = query.eq('mois', parseInt(mois));
    if (annee) query = query.eq('annee', parseInt(annee));
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ bulletins: [] });
      throw error;
    }
    return NextResponse.json({ bulletins: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST — upsert bulletin mappé sur les VRAIES colonnes de bulletins_paie
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const b = await req.json();
    const { employee_id, client_id, mois, annee, status, periode_debut, periode_fin,
      salaire_brut, heures_mensuelles, heures_supp_25, heures_supp_50,
      prime_exceptionnelle, prime_13mois, prime_performance } = b;

    if (!employee_id || !mois || !annee) return NextResponse.json({ error: 'employee_id, mois et annee sont requis' }, { status: 400 });
    if (mois < 1 || mois > 12) return NextResponse.json({ error: 'Mois invalide (1-12)' }, { status: 400 });

    const primes = (prime_exceptionnelle || 0) + (prime_13mois || 0) + (prime_performance || 0);
    const brutTotal = (salaire_brut || 0) + primes;
    if (brutTotal <= 0) return NextResponse.json({ error: 'Le salaire brut doit être supérieur à 0' }, { status: 400 });

    let cotisations: any = null;
    try {
      cotisations = calculerCotisations({
        salaireBrut: brutTotal,
        salaireBrutAnnuel: brutTotal * 12,
        statut: b.statut_cadre === 'cadre' ? 'cadre' : 'non_cadre',
        tempsPartiel: (heures_mensuelles || 151.67) < 151.67,
      });
    } catch {
      cotisations = null;
    }

    // Colonnes réelles de bulletins_paie uniquement
    const bulletinData: Record<string, any> = {
      cabinet_id: cabinet.id,
      employee_id,
      mois: Number(mois),
      annee: Number(annee),
      status: status || 'brouillon',
      periode_debut: periode_debut || `${annee}-${String(mois).padStart(2, '0')}-01`,
      periode_fin: periode_fin || `${annee}-${String(mois).padStart(2, '0')}-28`,
      salaire_brut: brutTotal,
      primes_total: primes || null,
      total_heures: heures_mensuelles || 151.67,
      heures_supp_25: heures_supp_25 || 0,
      heures_supp_50: heures_supp_50 || 0,
    };
    if (client_id !== undefined) bulletinData.client_id = client_id;
    if (cotisations) {
      bulletinData.salaire_net = cotisations.salaireNet;
      bulletinData.net_imposable = cotisations.salaireNetImposable;
      bulletinData.cout_employeur = cotisations.coutEmployer;
      // jsonb dans la table réelle
      bulletinData.cotisations_patronales = cotisations.patronales;
      bulletinData.cotisations_salariales = cotisations.salariales;
    }

    // Upsert par (employee, mois, annee)
    const { data: existing } = await admin.from('bulletins_paie').select('id').eq('cabinet_id', cabinet.id).eq('employee_id', employee_id).eq('mois', mois).eq('annee', annee).maybeSingle();

    let result;
    if (existing) {
      const { data: bulletin, error } = await admin.from('bulletins_paie').update({ ...bulletinData, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('cabinet_id', cabinet.id).select().single();
      if (error) throw error;
      result = bulletin;
    } else {
      const { data: bulletin, error } = await admin.from('bulletins_paie').insert(bulletinData).select().single();
      if (error) {
        if (error.code === '42P01') return NextResponse.json({ error: 'Table bulletins_paie non trouvée' }, { status: 500 });
        throw error;
      }
      result = bulletin;
    }
    return NextResponse.json({ bulletin: result }, { status: existing ? 200 : 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const { id, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: `Statut invalide : ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    const { data, error } = await admin.from('bulletins_paie').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('cabinet_id', cabinet.id).select().single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Bulletin non trouvé' }, { status: 404 });
    return NextResponse.json({ bulletin: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const { error } = await admin.from('bulletins_paie').delete().eq('id', id).eq('cabinet_id', cabinet.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
