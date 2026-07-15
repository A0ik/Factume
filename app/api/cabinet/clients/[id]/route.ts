import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const clients = await getCabinetClients(cabinet.id);
    const client = clients.find((c: any) => c.id === id);
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, company_name, first_name, last_name, siret, subscription_tier')
      .eq('id', client.client_user_id)
      .single();

    return NextResponse.json({ client, profile });
  } catch (err: any) {
    console.error('[API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// PROMÉTHÉE (CIBLE 2 #4) — Chaînon manquant : la fiche client cabinet n'était JAMAIS
// éditable (aucun PATCH, zéro .update() sur cabinet_clients dans tout le repo). C'est la
// cause racine de l'impasse email (« allez sur la fiche client » → fiche read-only).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const body = await req.json();
    const {
      company_name, siret, address, zip_code, city, phone,
      contact_email, contact_name, notes,
    } = body;

    // Allowlist anti-mass-assignment — on ne passe que les champs éditables attendus.
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : null);
    const updates: Record<string, unknown> = {};
    if (company_name !== undefined) updates.company_name = str(company_name);
    if (siret !== undefined) updates.siret = str(siret);
    if (address !== undefined) updates.address = str(address);
    if (zip_code !== undefined) updates.zip_code = str(zip_code);
    if (city !== undefined) updates.city = str(city);
    if (phone !== undefined) updates.phone = str(phone);
    if (contact_name !== undefined) updates.contact_name = str(contact_name);
    if (notes !== undefined) updates.notes = str(notes);
    if (contact_email !== undefined) {
      const email = str(contact_email) || '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 });
      }
      updates.contact_email = email || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    // Sécurité : on ne modère QUE un client appartenant AU cabinet de l'utilisateur.
    const { data: updated, error } = await admin
      .from('cabinet_clients')
      .update(updates)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!updated) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });

    return NextResponse.json({ client: updated });
  } catch (err: any) {
    console.error('[API Error]', err);
    return NextResponse.json({ error: err.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
