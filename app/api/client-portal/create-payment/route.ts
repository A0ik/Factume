import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, token } = await req.json();
    if (!invoiceId || !token) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const supabase = createAdminClient();

    // ── Valider le token d'accès au portail client (anti-IDOR — CIBLE 3b) ──────
    // Avant, le token était accepté SANS vérification : n'importe qui avec un UUID
    // de facture pouvait spawn un checkout Stripe sur la facture d'autrui (flux
    // argent). On résout le token comme la route GET /[token], on vérifie l'expiry
    // et on borne la facture au client + user du token.
    const { data: portalToken, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('client_id, user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !portalToken) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }
    if (portalToken.expires_at && new Date(portalToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Verify the invoice, BOUNDED to the token's client + user (anti-IDOR)
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:client_id(*)')
      .eq('id', invoiceId)
      .eq('user_id', portalToken.user_id)
      .eq('client_id', portalToken.client_id)
      .single();

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Get user's Stripe Connect account if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, company_name')
      .eq('id', invoice.user_id)
      .single();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: invoice.currency?.toLowerCase() || 'eur',
          product_data: {
            name: `Facture ${invoice.number || invoiceId}`,
          },
          unit_amount: Math.round((invoice.total || invoice.amount || 0) * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/${token}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/${token}?payment=cancelled`,
      metadata: {
        invoiceId: invoice.id,
        userId: invoice.user_id,
      },
    };

    // If user has Stripe Connect, create on their behalf
    if (profile?.stripe_connect_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round((invoice.total || invoice.amount || 0) * 100 * 0.015), // 1.5% fee
        transfer_data: {
          destination: profile.stripe_connect_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
