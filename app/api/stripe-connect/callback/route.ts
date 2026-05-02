import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // User denied or error occurred
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=${error}`);
    }

    if (!code) {
      return NextResponse.json({ error: 'Code OAuth manquant' }, { status: 400 });
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

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

    // Get the connected account details
    const account = await stripe.accounts.retrieve(tokenData.stripe_user_id);

    // Store in database
    await supabase
      .from('profiles')
      .update({
        stripe_connect_account_id: tokenData.stripe_user_id,
        stripe_connect_access_token: tokenData.access_token,
        stripe_connect_refresh_token: tokenData.refresh_token,
        stripe_connect_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        stripe_connect_onboarding_completed: account.details_submitted,
      })
      .eq('id', user.id);

    // Redirect back to settings with success
    return NextResponse.redirect(`${baseUrl}/settings?stripe-connect=success`);
  } catch (error: any) {
    console.error('[Stripe Connect Callback]', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/settings?stripe-connect-error=${error.message}`);
  }
}
