// ---------------------------------------------------------------------------
// HERMÈS CIBLE 3 — Finalisation d'une carte (étape 2/2 : émission).
// Appelée par le client après confirmation du PaymentIntent de la fee.
//  - ISSUING_ENABLED = false (pont)  → ligne 'queued', aucune émission réelle.
//  - ISSUING_ENABLED = true           → cardholder + card créés chez Stripe.
// Idempotent : une commande déjà finalisée renvoie la ligne existante.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { getStripeServer, ISSUING_ENABLED, type CardType } from '@/lib/stripe-server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    const userId = user.id;

    const { paymentIntentId, shipping } = await req.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId requis.' }, { status: 400 });
    }

    const sub = await getUserSubscriptionStatus(userId);
    try {
      requireFeature(sub, 'issuingCard');
    } catch {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const stripe = getStripeServer();

    // Vérifie le PaymentIntent
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Le paiement n\'est pas finalisé.' }, { status: 400 });
    }
    if (intent.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Paiement invalide pour cet utilisateur.' }, { status: 403 });
    }
    const cardType = (intent.metadata?.cardType as CardType) || 'virtual';

    // Ligne existante (idempotence)
    const { data: existing } = await supabase
      .from('stripe_cards')
      .select('*')
      .eq('fee_payment_intent_id', paymentIntentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing && (existing.status === 'active' || existing.status === 'queued')) {
      return NextResponse.json({ card: existing, queued: existing.status === 'queued' });
    }

    // PONT — Issuing désactivé : on persiste en file (queued), sans émettre.
    if (!ISSUING_ENABLED) {
      const payload = {
        user_id: userId,
        type: cardType,
        status: 'queued' as const,
        fee_amount: intent.amount,
        fee_currency: 'eur',
        fee_payment_intent_id: paymentIntentId,
        shipping_name: shipping?.name || null,
        shipping_address: shipping?.address || null,
      };
      let row;
      if (existing) {
        const r = await supabase.from('stripe_cards').update(payload).eq('id', existing.id).select().single();
        row = r.data;
      } else {
        const r = await supabase.from('stripe_cards').insert(payload).select().single();
        row = r.data;
      }
      return NextResponse.json({ card: row, queued: true });
    }

    // ÉMISSION RÉELLE — card program approuvé (STRIPE_ISSUING_ENABLED=true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_cardholder_id, company_name, first_name, last_name, address, city, postal_code')
      .eq('id', userId)
      .single();

    const pName =
      profile?.company_name ||
      `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
      'Client Factu.me';

    // 1. Cardholder (un par utilisateur — réutilisé)
    let cardholderId = profile?.stripe_cardholder_id;
    if (!cardholderId) {
      const cardholder = await stripe.issuing.cardholders.create({
        type: 'individual',
        name: pName,
        email: profile?.email || undefined,
        billing: {
          address: {
            line1: profile?.address || 'Adresse à compléter',
            city: profile?.city || 'Paris',
            postal_code: profile?.postal_code || '75000',
            country: 'FR',
          },
        },
      });
      cardholderId = cardholder.id;
      await supabase.from('profiles').update({ stripe_cardholder_id: cardholderId }).eq('id', userId);
    }

    // 2. Card (virtuelle ou physique)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardParams: any = {
      cardholder: cardholderId,
      currency: 'eur',
      type: cardType,
    };
    if (cardType === 'physical' && shipping?.address) {
      cardParams.shipping = {
        name: shipping.name || pName,
        address: shipping.address,
      };
    }
    const card = await stripe.issuing.cards.create(cardParams);

    // 3. Persiste
    const update = {
      cardholder_id: cardholderId,
      card_id: card.id,
      last4: card.last4 || null,
      brand: card.brand || null,
      exp_month: card.exp_month || null,
      exp_year: card.exp_year || null,
      status: (card.status as string) || 'active',
      shipping_name: shipping?.name || null,
      shipping_address: shipping?.address || null,
    };
    let row;
    if (existing) {
      const r = await supabase.from('stripe_cards').update(update).eq('id', existing.id).select().single();
      row = r.data;
    } else {
      const r = await supabase
        .from('stripe_cards')
        .insert({
          user_id: userId,
          type: cardType,
          fee_amount: intent.amount,
          fee_currency: 'eur',
          fee_payment_intent_id: paymentIntentId,
          ...update,
        })
        .select()
        .single();
      row = r.data;
    }

    return NextResponse.json({ card: row, queued: false });
  } catch (e) {
    console.error('[Issuing finalize-card] error:', e);
    return NextResponse.json({ error: 'Erreur lors de la finalisation de la carte.' }, { status: 500 });
  }
}
