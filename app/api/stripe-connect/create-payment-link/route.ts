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

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'ID de facture requis' }, { status: 400 });
    }

    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Get user's Stripe Connect account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_access_token')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json({
        error: 'Vous devez connecter votre compte Stripe avant de créer des liens de paiement',
        requiresConnect: true
      }, { status: 400 });
    }

    // Initialize Stripe with the user's access token
    const stripe = new Stripe(profile.stripe_connect_access_token);

    // Create line items from invoice items for better detail
    const lineItems = await Promise.all(
      invoice.items.map(async (item: any) => {
        // Create a product for each invoice item
        const product = await stripe.products.create({
          name: item.description.substring(0, 100), // Stripe limits product name length
          description: item.description,
          metadata: {
            invoice_id: invoice.id,
            invoice_item_id: item.id,
          },
        });

        // Create a price for this product
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(item.unit_price * 100), // Convert to cents
          currency: 'eur',
        });

        return {
          price: price.id,
          quantity: item.quantity,
        };
      })
    );

    // Create a payment link with all line items
    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}?payment=success`,
        },
      },
      metadata: {
        invoice_id: invoice.id,
        user_id: user.id,
        invoice_number: invoice.number,
      },
    });

    // Update invoice with Stripe payment link
    await supabase
      .from('invoices')
      .update({
        stripe_payment_link_id: paymentLink.id,
        stripe_payment_link_url: paymentLink.url,
      })
      .eq('id', invoiceId);

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.url,
      shortUrl: paymentLink.url,
    });
  } catch (error: any) {
    console.error('[Stripe Connect Payment Link]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
