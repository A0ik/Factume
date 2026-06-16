import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// BASTION (CIBLE 1A) — Flux PKCE natif Supabase.
//signInWithGoogle() utilise supabase.auth.signInWithOAuth ({ provider: 'google' }),
// ce qui déclenche le parcours : Navigateur → Supabase → Google → callback Supabase
// (https://<ref>.supabase.co/auth/v1/callback) → Supabase échange le code et crée la
// session → redirection vers CE route handler avec ?code=<CODE_PKCE>.
//
// Notre unique job ici : échanger ce code PKCE contre une session via
// exchangeCodeForSession(). L'ancienne version faisait un échange direct avec Google
// (oauth2.googleapis.com/token + signInWithIdToken) → le code reçu étant un code PKCE
// Supabase, Google répondait `invalid_grant` → connexion Google systématiquement cassée.
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // 1. Erreur renvoyée par Google ou Supabase (ex: acces_denied, popup fermé)
  if (error) {
    console.error('[auth-callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(new URL(`/login?error=google_oauth_failed`, req.url));
  }

  // 2. En flux PKCE, on doit recevoir ?code=. Sinon, le flux a été interrompu.
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
  }

  // 3. Client serveur branché sur les cookies (pour y écrire la session).
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );

  // 4. Échange PKCE : code → session. C'est le correctif central.
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    console.error('[auth-callback] exchangeCodeForSession error:', exchangeError);
    return NextResponse.redirect(new URL('/login?error=session_creation_failed', req.url));
  }

  // 5. Enrichir le profil avec les données Google (colonnes réelles du schéma).
  // handle_new_user() n'insère que (id, email) ; on complète first_name/last_name.
  const metadata = data.user.user_metadata || {};
  const googleName: string = metadata.full_name || metadata.name || '';
  const nameParts = googleName.trim().split(/\s+/);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: data.user.id,
      email: data.user.email,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

  if (profileError) {
    console.error('[auth-callback] profile upsert warning:', profileError.message);
    // Non bloquant : la session est valide, le profil minimal existe déjà.
  }

  // 6. Rediriger vers le dashboard ou l'onboarding selon l'état du profil.
  let redirectPath = '/dashboard';
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', data.user.id)
    .single();

  if (!profile?.onboarding_done) {
    redirectPath = '/onboarding/quick';
  }

  return NextResponse.redirect(new URL(redirectPath, req.url));
}
