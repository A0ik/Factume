import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'ID de facture requis' }, { status: 400 });
    }

    // Get invoice details
    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Get user's Stripe Connect account ID (stored as stripe_connect_id)
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_id) {
      return NextResponse.json({
        error: 'Vous devez connecter votre compte Stripe avant de créer des liens de paiement',
        requiresConnect: true,
      }, { status: 400 });
    }

    // Use platform secret key with stripeAccount for Connect Standard
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      stripeAccount: profile.stripe_connect_id,
    });

    // Build line items from invoice items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = (invoice.items || []).map(
      (item: { description: string; unit_price: number; vat_rate: number; quantity: number; total: number }) => {
        const ttcPrice = item.unit_price * (1 + (item.vat_rate ?? 20) / 100);
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: (item.description || 'Prestation').substring(0, 100),
            },
            unit_amount: Math.round(ttcPrice * 100),
          },
          quantity: item.quantity || 1,
        };
      },
    );

    // Fallback if no items
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `Facture ${invoice.number}` },
          unit_amount: Math.round((invoice.total || 0) * 100),
        },
        quantity: 1,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a checkout session on the connected account
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${appUrl}/invoices/${invoice.id}?paid=true`,
      cancel_url: `${appUrl}/invoices/${invoice.id}`,
      metadata: {
        invoice_id: invoice.id,
        user_id: user.id,
        invoice_number: invoice.number || '',
      },
      payment_intent_data: {
        metadata: {
          invoice_id: invoice.id,
          user_id: user.id,
        },
      },
    });

    // Update invoice with Stripe payment info
    await admin
      .from('invoices')
      .update({
        stripe_payment_url: session.url,
        payment_link: session.url,
      })
      .eq('id', invoiceId);

    return NextResponse.json({
      paymentLinkId: session.id,
      paymentLinkUrl: session.url,
      shortUrl: session.url,
    });
  } catch (error: any) {
    console.error('[Stripe Connect Payment Link]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
