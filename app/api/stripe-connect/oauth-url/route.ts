import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    // Initialize Stripe with Connect client ID
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID!;

    if (!clientId) {
      return NextResponse.json({ error: 'Configuration Stripe Connect manquante' }, { status: 500 });
    }

    // Generate the OAuth link with cryptographically secure CSRF state
    const state = randomBytes(32).toString('hex');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';

    const oauthUrl = `https://connect.stripe.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(`${baseUrl}/api/stripe-connect/callback`)}&` +
      `state=${state}`;

    const response = NextResponse.json({ url: oauthUrl });
    response.cookies.set('stripe_connect_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    });
    return response;
  } catch (error: any) {
    console.error('[Stripe Connect OAuth URL]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
