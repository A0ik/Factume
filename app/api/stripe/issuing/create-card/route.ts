// ---------------------------------------------------------------------------
// HERMÈS CIBLE 3 — Commande d'une carte Stripe Issuing (étape 1/2 : la fee).
// Crée un PaymentIntent unique de 5€ (virtuelle) ou 30€ (physique).
// L'émission réelle (cardholder + card) se fait dans finalize-card, APRÈS
// confirmation du paiement — et seulement si STRIPE_ISSUING_ENABLED.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { getStripeServer, ISSUING_ENABLED, CARD_FEES, type CardType } from '@/lib/stripe-server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    const userId = user.id;

    const rl = rateLimit({ key: getClientIp(req), limit: 5, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, { status: 429 });
    }

    const { type } = await req.json();
    if (type !== 'virtual' && type !== 'physical') {
      return NextResponse.json({ error: 'Type de carte invalide (virtual ou physical).' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Gate : Pro + Business
    const sub = await getUserSubscriptionStatus(userId);
    try {
      requireFeature(sub, 'issuingCard');
    } catch {
      return NextResponse.json(
        { error: 'Les cartes sont réservées aux plans Pro et Business.' },
        { status: 403 },
      );
    }

    // HERMÈS — Option C « pont » : tant que le card program Stripe n'est pas
    // approuvé, on n'encaisse AUCUNE fee. Réponse 503 + flag pour l'UI.
    if (!ISSUING_ENABLED) {
      return NextResponse.json(
        {
          issuingEnabled: false,
          error: "Le programme de cartes est en cours d'activation chez Stripe. Vous serez notifié dès qu'il sera disponible — votre carte ne sera pas débitée.",
        },
        { status: 503 },
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();
    if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

    const stripe = getStripeServer();

    // Customer (lazy, pattern idempotent des autres routes)
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const amount = CARD_FEES[type as CardType];

    // Trace de commande avant paiement (statut 'pending')
    const { data: cardRow } = await supabase
      .from('stripe_cards')
      .insert({
        user_id: userId,
        type,
        status: 'pending',
        fee_amount: amount,
        fee_currency: 'eur',
      })
      .select()
      .single();

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        cardType: type,
        cardRowId: cardRow?.id || '',
        purpose: 'issuing_card_fee',
      },
      description:
        type === 'physical'
          ? 'Frais de commande — carte physique Factu.me'
          : 'Frais de commande — carte virtuelle Factu.me',
    });

    if (cardRow) {
      await supabase.from('stripe_cards').update({ fee_payment_intent_id: intent.id }).eq('id', cardRow.id);
    }

    return NextResponse.json({
      issuingEnabled: true,
      clientSecret: intent.client_secret,
      amount,
      type,
      cardRowId: cardRow?.id,
    });
  } catch (e) {
    console.error('[Issuing create-card] error:', e);
    return NextResponse.json({ error: 'Erreur lors de la commande de la carte.' }, { status: 500 });
  }
}
