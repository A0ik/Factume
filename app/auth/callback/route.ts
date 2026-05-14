import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Gérer les erreurs OAuth
    if (error) {
      console.error('[auth-callback] OAuth error:', error);
      return NextResponse.redirect(new URL('/login?error=google_oauth_failed', req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) {
            cs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Record<string, unknown>)
            );
          },
        },
      }
    );

    // Échanger le code contre une session Supabase
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('[auth-callback] Session exchange error:', sessionError);
      return NextResponse.redirect(new URL('/login?error=session_exchange_failed', req.url));
    }

    // Créer ou mettre à jour le profil utilisateur
    if (data.user) {
      const metadata = data.user.user_metadata || {};
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: metadata.full_name || metadata.name || data.user.email?.split('@')[0] || 'Utilisateur',
          avatar_url: metadata.avatar_url || metadata.picture,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) {
        console.error('[auth-callback] Profile upsert error:', profileError);
        // Ne pas bloquer la connexion si le profil échoue
      }
    }

    // Rediriger vers le dashboard ou une page de bienvenue
    // Vérifier si c'est un premier connexion pour rediriger vers l'onboarding
    const redirectUrl = new URL('/dashboard', req.url);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[auth-callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/login?error=unknown_error', req.url));
  }
}
