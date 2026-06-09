import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { encryptToken } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // User denied or error occurred
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=${error}`);
    }

    if (!code) {
      return NextResponse.json({ error: 'Code OAuth manquant' }, { status: 400 });
    }

    // Validate CSRF state from cookie
    const savedState = req.cookies.get('stripe_connect_state')?.value;
    if (!state || !savedState || state !== savedState) {
      return NextResponse.json({ error: 'Invalid CSRF state' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Exchange authorization code for access token
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID!;
    const clientSecret = process.env.STRIPE_SECRET_KEY!;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';

    // Use fetch directly to exchange code for token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Stripe Connect Token Error]', errorText);
      return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('[Stripe Connect Token Data]', JSON.stringify({
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      stripe_user_id: tokenData.stripe_user_id,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    }));

    // Get the connected account details using the connected account's token
    // IMPORTANT: Use the access_token to create a new Stripe instance for the connected account
    const connectedStripe = new Stripe(tokenData.access_token);
    let accountDetails = null;
    try {
      const account = await connectedStripe.accounts.retrieve();
      accountDetails = {
        id: account.id,
        country: account.country,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      };
      console.log('[Stripe Connect Account]', JSON.stringify(accountDetails));
    } catch (accountError) {
      console.warn('[Stripe Connect Account Warning]', 'Could not fetch account details:', accountError);
      // Continue anyway, we have the account ID from tokenData
    }

    // Store in database — tokens are encrypted at rest using AES-256-GCM
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string;
    try {
      encryptedAccessToken = encryptToken(tokenData.access_token);
      encryptedRefreshToken = encryptToken(tokenData.refresh_token);
    } catch (e) {
      console.error('[Stripe Connect] Token encryption failed:', e);
      return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=encryption_failed`);
    }

    await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: tokenData.stripe_user_id,
        stripe_connect_access_token: encryptedAccessToken,
        stripe_connect_refresh_token: encryptedRefreshToken,
        // Stripe Standard tokens don't always have expires_in, handle it safely
        stripe_connect_token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        stripe_connect_onboarding_completed: accountDetails?.details_submitted || false,
      })
      .eq('id', user.id);

    // Redirect back to settings with success
    return NextResponse.redirect(`${baseUrl}/settings?stripe-connect=success`);
  } catch (error: any) {
    console.error('[Stripe Connect Callback]', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=internal_error`);
  }
}
