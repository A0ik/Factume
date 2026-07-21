import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

// ATHÉNA CIBLE 1A — upload du logo/photo client côté SERVEUR.
// Avant : upload 100% client qui échouait en RLS car le chemin passé à
// .from('client-logos').upload('client-logos/<uid>/...') mettait le nom du bucket
// comme 1er dossier → storage.foldername(name)[1] = 'client-logos' ≠ auth.uid().
// Ici : auth serveur + client admin (bypass RLS) + chemin propre <uid>/<clientId>.<ext>.
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX = 2 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier.' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Format d'image non supporté." }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: 'Image trop lourde (max 2 Mo).' }, { status: 400 });

    const admin = createAdminClient();

    // Garde d'appartenance : le client doit appartenir à l'utilisateur.
    const { data: client } = await admin.from('clients').select('user_id').eq('id', id).single();
    if (!client || client.user_id !== user.id) {
      return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
    }

    const rawExt = (file.name.split('.').pop() || 'png').toLowerCase();
    const safeExt = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'png';
    // Chemin PROPRE (sans préfixe bucket) : <uid>/<clientId>.<ext>
    const filePath = `${user.id}/${id}.${safeExt}`;

    const { error: upErr } = await admin
      .storage
      .from('client-logos')
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (upErr) { console.error('[client-logo upload]', upErr); throw upErr; }

    const { data: { publicUrl } } = admin.storage.from('client-logos').getPublicUrl(filePath);
    await admin.from('clients').update({ logo_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', id);

    return NextResponse.json({ logoUrl: publicUrl });
  } catch (e: any) {
    console.error('[clients/logo POST]', e);
    return NextResponse.json({ error: e?.message || 'Erreur serveur.' }, { status: 500 });
  }
}
