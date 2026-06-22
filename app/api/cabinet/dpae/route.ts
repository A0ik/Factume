import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

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

// Statuts alignés sur l'UI cabinet (colonne `status` est text libre).
const VALID_STATUSES = ['en_preparation', 'envoyee', 'confirmee', 'rejetee'];

// GET
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    let query = admin.from('dpae').select('*').eq('cabinet_id', cabinet.id).order('date_embauche', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ dpae: [] });
      throw error;
    }
    return NextResponse.json({ dpae: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST — colonnes réelles de la table `dpae`
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const b = await req.json();

    // NOT NULL réels : employeur_siret, employeur_nom, salarie_nom, salarie_prenom, date_embauche, type_contrat
    if (!b.employeur_siret || !b.employeur_nom || !b.salarie_nom || !b.salarie_prenom || !b.date_embauche || !b.type_contrat) {
      return NextResponse.json({ error: 'employeur_siret, employeur_nom, salarie_nom, salarie_prenom, date_embauche et type_contrat sont requis' }, { status: 400 });
    }

    const { data, error } = await admin.from('dpae').insert({
      cabinet_id: cabinet.id,
      client_id: b.client_id || null,
      employee_id: b.employee_id || null,
      employeur_siret: String(b.employeur_siret).replace(/\s/g, ''),
      employeur_nom: b.employeur_nom,
      employeur_urssaf: b.employeur_urssaf || null,
      salarie_nom: b.salarie_nom,
      salarie_prenom: b.salarie_prenom,
      salarie_civilite: b.salarie_civilite || null,
      salarie_nir: b.salarie_nir ? String(b.salarie_nir).replace(/\s/g, '') : null,
      salarie_date_naissance: b.salarie_date_naissance || null,
      date_embauche: b.date_embauche,
      type_contrat: b.type_contrat,
      poste: b.poste || null,
      salaire_brut: b.salaire_brut || null,
      heures_hebdo: b.heures_hebdo || null,
      convention_collective: b.convention_collective || null,
      status: b.status || 'en_preparation',
    }).select().single();

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'Table dpae non trouvée' }, { status: 500 });
      throw error;
    }
    return NextResponse.json({ dpae: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — statut (envoyée / confirmée)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const { id, status, observations } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID de la DPAE requis' }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: `Statut invalide : ${VALID_STATUSES.join(', ')}` }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === 'envoyee') updates.date_envoi = new Date().toISOString();
      if (status === 'confirmee') updates.date_confirmation = new Date().toISOString();
    }
    if (observations !== undefined) updates.observations = observations;

    const { data, error } = await admin.from('dpae').update(updates).eq('id', id).eq('cabinet_id', cabinet.id).select().single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'DPAE non trouvée' }, { status: 404 });
    return NextResponse.json({ dpae: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const { error } = await admin.from('dpae').delete().eq('id', id).eq('cabinet_id', cabinet.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
