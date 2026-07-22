import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { buildFreshLinkUpdate } from '@/lib/payment-link';
import { ensureShortToken, buildShortPayUrl } from '@/lib/pay-token';
import { getPaidTotal, computeRemaining } from '@/lib/invoice-balance';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId, force } = await req.json();

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

    // ODIN (CIBLE 2) — Vérité comptable : le lien charge le SOLDE RESTANT, pas le
    // total. Un acompte déjà versé est déduit. remaining = total − Σ acomptes.
    const paidTotal = await getPaidTotal(admin, invoiceId);
    const remaining = computeRemaining(Number(invoice.total ?? 0), paidTotal);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: 'Cette facture est déjà soldée (acomptes ≥ total).' },
        { status: 400 },
      );
    }

    // FIXER (BUG 1) — cache court-circuité quand l'utilisateur force la régénération
    // (changement de prestataire Stripe ↔ SumUp, ou lien expiré à recréer).
    const existingStripeUrl = invoice.stripe_payment_url || invoice.stripe_payment_link_url;
    if (existingStripeUrl && !force) {
      return NextResponse.json({
        paymentLinkUrl: existingStripeUrl,
        shortUrl: buildShortPayUrl(invoice.payment_short_token) ?? existingStripeUrl,
        paymentLinkId: invoice.stripe_payment_link_id || null,
      });
    }

    // Get user's Stripe Connect account ID (stored as stripe_connect_account_id)
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json({
        error: 'Vous devez connecter votre compte Stripe avant de créer des liens de paiement',
        requiresConnect: true,
      }, { status: 400 });
    }

    // Use platform secret key with stripeAccount for Connect Standard
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      stripeAccount: profile.stripe_connect_account_id,
    });

    // Build line items from invoice items.
    // ODIN (CIBLE 2) — si un acompte a été versé, on charge le SOLDE RESTANT en une
    // seule ligne (vérité comptable + évite toute dérive d'arrondi sur la somme des
    // lignes). Sans acompte, on garde l'itemisation normale.
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    if (paidTotal > 0) {
      lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Solde restant — Facture ${invoice.number || ''}`.substring(0, 100) },
          unit_amount: Math.round(remaining * 100),
        },
        quantity: 1,
      }];
    } else {
      lineItems = (invoice.items || []).map(
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
            unit_amount: Math.round(remaining * 100),
          },
          quantity: 1,
        });
      }
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

    // INSPECTOR (BUG 2) — source de vérité unique : on pose payment_provider +
    // payment_link_amount, et on nullifie TOUTES les colonnes adverses (legacy
    // stripe_payment_link_url/_id ET sumup_checkout_id) via buildFreshLinkUpdate.
    // Avant, seul sumup_checkout_id était nettoyé → la legacy Stripe survécût
    // et corrompait les résolveurs.
    // ATELIER (CIBLE 2 & 3) — mint/ensure le token d'URL courte (QR léger + lien).
    const shortToken = await ensureShortToken(admin, invoiceId, invoice.payment_short_token);
    const freshUpdate = buildFreshLinkUpdate('stripe', {
      url: session.url as string,
      // ODIN (CIBLE 2) — on figure le SOLDE RESTANT réellement chargé (et non le
      // total), pour que l'auto-régénération et les résolveurs restent cohérents.
      amount: remaining,
    });
    if (shortToken) freshUpdate.payment_short_token = shortToken;

    const { error: updateErr } = await admin
      .from('invoices')
      .update(freshUpdate)
      .eq('id', invoiceId);

    if (updateErr) {
      console.error('[Stripe Connect Payment Link] DB update failed:', updateErr.message);
    }

    return NextResponse.json({
      paymentLinkId: session.id,
      paymentLinkUrl: session.url,
      shortUrl: buildShortPayUrl(shortToken) ?? session.url,
    });
  } catch (error: any) {
    console.error('[Stripe Connect Payment Link]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
