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

const VALID_TYPES = ['mensuelle', 'arret_maladie', 'reprise_maladie', 'fin_contrat', 'autre_evenement'];
const VALID_STATUSES = ['en_preparation', 'envoyee', 'acceptee', 'rejetee'];

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    let query = admin.from('dsn').select('*').eq('cabinet_id', cabinet.id).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ dsn: [] });
      throw error;
    }
    return NextResponse.json({ dsn: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST — colonnes réelles de la table `dsn`
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const b = await req.json();

    // NOT NULL réels : type_dsn, mois, annee
    if (!b.type_dsn || !b.mois || !b.annee) return NextResponse.json({ error: 'type_dsn, mois et annee sont requis' }, { status: 400 });
    if (!VALID_TYPES.includes(b.type_dsn)) return NextResponse.json({ error: `Type invalide : ${VALID_TYPES.join(', ')}` }, { status: 400 });

    const { data, error } = await admin.from('dsn').insert({
      cabinet_id: cabinet.id,
      client_id: b.client_id || null,
      type_dsn: b.type_dsn,
      mois: Number(b.mois),
      annee: Number(b.annee),
      nb_salaries: b.nb_salaries || null,
      total_brut: b.total_brut || null,
      total_net: b.total_net || null,
      total_pas: b.total_pas || null,
      date_echeance: b.date_echeance || null,
      status: b.status || 'en_preparation',
    }).select().single();

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'Table dsn non trouvée' }, { status: 500 });
      throw error;
    }
    return NextResponse.json({ dsn: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — statut (envoyée / acceptée)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) return auth.error;
    const { admin, cabinet } = auth;
    const { id, status, numero_dsn } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID de la DSN requis' }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: `Statut invalide : ${VALID_STATUSES.join(', ')}` }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === 'envoyee') updates.date_envoi = new Date().toISOString();
    }
    if (numero_dsn !== undefined) updates.numero_dsn = numero_dsn;

    const { data, error } = await admin.from('dsn').update(updates).eq('id', id).eq('cabinet_id', cabinet.id).select().single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'DSN non trouvée' }, { status: 404 });
    return NextResponse.json({ dsn: data });
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
    const { error } = await admin.from('dsn').delete().eq('id', id).eq('cabinet_id', cabinet.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
