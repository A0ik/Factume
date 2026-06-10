import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Gérer les erreurs OAuth
    if (error) {
      console.error('[auth-callback] OAuth error:', error);
      return NextResponse.redirect(new URL('/login?error=google_oauth_failed', req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
    }

    // BASTION: Échange direct avec Google (bypass Supabase OAuth)
    // On obtient un ID token Google qu'on passe ensuite à Supabase via signInWithIdToken.
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[auth-callback] Missing Google credentials');
      return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }

    const redirectUri = `${req.nextUrl.origin}/auth/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[auth-callback] Token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResponse.json() as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
    };

    if (!tokens.id_token) {
      console.error('[auth-callback] No ID token in Google response');
      return NextResponse.redirect(new URL('/login?error=missing_id_token', req.url));
    }

    // Créer la session Supabase via l'ID token Google
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

    const { data, error: sessionError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: tokens.id_token,
    });

    if (sessionError || !data.user) {
      console.error('[auth-callback] Supabase signInWithIdToken error:', sessionError);
      return NextResponse.redirect(new URL('/login?error=session_creation_failed', req.url));
    }

    // Créer ou mettre à jour le profil utilisateur
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

    // Rediriger vers le dashboard ou l'onboarding selon le profil
    let redirectPath = '/dashboard';
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', data.user.id)
      .single();

    if (!profile?.onboarding_done) {
      redirectPath = '/onboarding/quick';
    }

    const redirectUrl = new URL(redirectPath, req.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[auth-callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/login?error=unknown_error', req.url));
  }
}
