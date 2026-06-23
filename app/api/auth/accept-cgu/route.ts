import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * ARGOS (CIBLE 1) — Acceptation opposable des CGU/CGV.
 * POST /api/auth/accept-cgu
 * Enregistre cgu_accepted=true + cgu_accepted_at=now() sur le profil de l'utilisateur
 * authentifié. Le middleware redirige vers /legal/accept tout utilisateur non-acceptant.
 * Le corps doit contenir { accepted: true } pour éviter les validations purement UI.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.accepted !== true) {
      return NextResponse.json({ error: "Vous devez accepter les CGU et CGV pour continuer." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié. Veuillez vous connecter.' }, { status: 401 });
    }

    // upsert pour tolérer la race condition (profil pas encore créé par le trigger).
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        cgu_accepted: true,
        cgu_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('[accept-cgu] update error:', error.message);
      return NextResponse.json({ error: "Impossible d'enregistrer votre acceptation. Réessayez." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[accept-cgu] error:', err);
    return NextResponse.json({ error: 'Erreur inattendue. Réessayez.' }, { status: 500 });
  }
}
