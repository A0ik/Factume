import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, token } = await req.json();
    if (!invoiceId || !token) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const supabase = createAdminClient();

    // Verify the invoice and get details
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:client_id(*)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    // Verify access token (simple check: invoice share token or client portal token)
    // For now, just check the invoice exists and is not paid

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
