import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { buildAuthorizeUrl } from '@/lib/superPdpClient';
import { cookies } from 'next/headers';

/**
 * GET /api/superpdp/connect
 *
 * Initie le flux OAuth Authorization Code pour brancher le compte SuperPDP de
 * l'utilisateur (modèle marque grise). Pré-remplit l'email (login_hint) et le
 * SIREN (superpdp_company_number, scheme fr_siren). Pose un state en cookie
 * httpOnly (CSRF) validé au callback.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('siret, email')
      .eq('id', user.id)
      .single();

    const siren = (profile?.siret || '').replace(/\s/g, '').substring(0, 9);
    const loginHint = profile?.email || user.email || undefined;

    const state = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${user.id}`;

    const url = buildAuthorizeUrl({
      origin: req.nextUrl.origin,
      state,
      loginHint,
      companySiren: /^\d{9}$/.test(siren) ? siren : undefined,
    });

    const response = NextResponse.json({ url });
    response.cookies.set('superpdp_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[superpdp-connect]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
