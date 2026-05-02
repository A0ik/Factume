import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // Generate the OAuth link
    const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';

    const oauthUrl = `https://connect.stripe.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(`${baseUrl}/api/stripe-connect/callback`)}&` +
      `state=${state}`;

    return NextResponse.json({ url: oauthUrl });
  } catch (error: any) {
    console.error('[Stripe Connect OAuth URL]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
