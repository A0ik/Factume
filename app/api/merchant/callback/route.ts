import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(new URL('/connections?error=' + encodeURIComponent(errorParam), req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connections?error=missing_params', req.url));
  }

  // --- Validate OAuth state against cookie ---
  const savedState = req.cookies.get('merchant_oauth_state')?.value;
  if (!savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/connections?error=invalid_state', req.url));
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const provider = stateData.provider;

    // Get user from session cookie
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(
      req.cookies.get('sb-access-token')?.value || ''
    );

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Create the merchant connection
    const { error } = await admin.from('merchant_connections').insert({
      user_id: user.id,
      provider,
      provider_account_id: `demo_${provider}_${user.id.slice(0, 8)}`,
      credentials_encrypted: JSON.stringify({ access_token: 'mock_token', refresh_token: 'mock_refresh' }),
      status: 'active',
      auto_import: true,
    });

    if (error) throw error;

    // Clear the state cookie
    const res = NextResponse.redirect(new URL('/connections?success=true', req.url));
    res.cookies.set('merchant_oauth_state', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/connections?error=callback_failed', req.url));
  }
}
