import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { buildFreshLinkUpdate } from '@/lib/payment-link';
import { ensureShortToken, buildShortPayUrl } from '@/lib/pay-token';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { invoiceId, amount, description, stripeConnectId } = await req.json();

    // Verify the invoice belongs to the authenticated user (+ champs nécessaires.
    // ATELIER (CIBLE 3) — avant on ne sélectionnait que l'id et on ne PERSISTAIT
    // JAMAIS l'URL Stripe → la colonne stripe_payment_url restait NULL → la page
    // share et le PDF affichaient un lien mort, même avec une <a> correcte.
    const supabaseAdmin = createAdminClient();
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, number, total, payment_short_token')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();
    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

    const stripe = getStripe();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: description || `Facture ${invoice.number || invoiceId}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}`,
      metadata: { invoiceId },
    };

    // Route funds to the user's connected Stripe account
    if (stripeConnectId) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: stripeConnectId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // ATELIER (CIBLE 2 & 3) — on persiste enfin l'URL (source de vérité unique) +
    // le token d'URL courte. Fin du lien mort sur la page share et le PDF.
    const shortToken = await ensureShortToken(supabaseAdmin, invoiceId, invoice.payment_short_token);
    const freshUpdate = buildFreshLinkUpdate('stripe', {
      url: session.url as string,
      amount: Number(invoice.total ?? amount ?? 0),
    });
    if (shortToken) freshUpdate.payment_short_token = shortToken;

    const { error: persistErr } = await supabaseAdmin
      .from('invoices')
      .update(freshUpdate)
      .eq('id', invoiceId);

    if (persistErr) {
      console.error('[stripe-payment-link] DB persist failed:', persistErr.message);
    }

    return NextResponse.json({
      url: session.url,
      shortUrl: buildShortPayUrl(shortToken) ?? session.url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
