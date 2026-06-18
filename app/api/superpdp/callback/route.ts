import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { exchangeAndStoreConnection } from '@/lib/superPdpClient';
import { cookies } from 'next/headers';

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  );
}

/**
 * GET /api/superpdp/callback
 *
 * Terminaison du flux OAuth Authorization Code : valide le state (CSRF), échange
 * le code contre les tokens, vérifie la concordance SIREN (le compte connecté
 * doit correspondre au SIRET du profil), et stocke la connexion chiffrée.
 */
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const redirect = (path: string) => NextResponse.redirect(`${base}${path}`);

  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) return redirect(`/settings?superpdp_error=${encodeURIComponent(error)}`);
    if (!code || !state) return redirect('/settings?superpdp_error=missing_params');

    const cookieStore = await cookies();
    const savedState = cookieStore.get('superpdp_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return redirect('/settings?superpdp_error=state_mismatch');
    }

    // Expiration du state (10 min)
    const ts = parseInt(state.split('_')[0], 10);
    if (isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) {
      return redirect('/settings?superpdp_error=state_expired');
    }

    const userId = state.split('_')[2];
    if (!userId) return redirect('/settings?superpdp_error=invalid_state');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login?redirect=/settings');
    if (user.id !== userId) return redirect('/settings?superpdp_error=user_mismatch');

    // Garde-fou concordance SIREN (SIRET du profil)
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('siret')
      .eq('id', user.id)
      .single();
    const expectedSiren = (profile?.siret || '').replace(/\s/g, '').substring(0, 9);

    const result = await exchangeAndStoreConnection({
      userId: user.id,
      code,
      origin: req.nextUrl.origin,
      expectedSiren: /^\d{9}$/.test(expectedSiren) ? expectedSiren : undefined,
    });

    const response = result.created
      ? redirect('/settings?superpdp=connected')
      : redirect(`/settings?superpdp_error=${encodeURIComponent(result.error || 'exchange_failed')}`);

    response.cookies.delete('superpdp_oauth_state');
    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[superpdp-callback]', err.message);
    const r = redirect('/settings?superpdp_error=internal_error');
    r.cookies.delete('superpdp_oauth_state');
    return r;
  }
}
