import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { logStripeEnv, logStripeError } from '@/lib/stripe-diagnostics';

// MONOLITH: Structure de prix centralisée — plus de plan Solo
const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID!,
  },
};

export async function POST(req: NextRequest) {
  try {
    // OVERLORD (CIBLE 4) — trace la présence des vars Stripe pour identifier le 500.
    logStripeEnv('subscription');
    // Auth check - get userId from session, not from body
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const userId = user.id;

    const { plan, yearly = false } = await req.json();
    const interval = yearly ? 'yearly' : 'monthly';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    if (!PRICE_IDS[plan]) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) return NextResponse.json({ error: `Ce plan (${plan} / ${interval === 'yearly' ? 'annuel' : 'mensuel'}) n'est pas encore configuré. Veuillez contacter le support.` }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (!profile) return NextResponse.json({ error: 'Profil introuvable. Veuillez vous reconnecter.' }, { status: 404 });

    // 1b. Vérifier qu'aucun abonnement actif n'existe déjà (anti-double-charge)
    if (profile.stripe_subscription_id) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id,
          { expand: ['latest_invoice.payment_intent'] },
        );
        if (existingSub.status === 'active' || existingSub.status === 'trialing') {
          return NextResponse.json(
            { error: 'Vous avez déjà un abonnement actif. Veuillez annuler votre abonnement actuel avant d\'en souscrire un nouveau.' },
            { status: 409 }
          );
        }
        // CIBLE 1 (AEGIS) — Réutiliser un abonnement incomplet/past_due pour le MÊME prix
        // plutôt que d'en créer un nouveau à chaque POST (cause racine du spam 429).
        // Aucune carte n'étant encore attachée à un abonnement incomplet, le réutiliser
        // est sûr et évite l'accumulation d'abonnements orphelins côté Stripe.
        if (existingSub.status === 'incomplete' || existingSub.status === 'past_due') {
          const existingPriceId = existingSub.items?.data?.[0]?.price?.id;
          if (existingPriceId === priceId) {
            const inv = existingSub.latest_invoice as Stripe.Invoice | null;
            const pi = inv?.payment_intent as Stripe.PaymentIntent | null;
            const existingSecret = pi?.client_secret ?? null;
            if (existingSecret) {
              return NextResponse.json({
                clientSecret: existingSecret,
                subscriptionId: existingSub.id,
              });
            }
          }
        }
      } catch {
        // Subscription not found in Stripe (deleted/expired) — safe to proceed
      }
    }

    // 1. Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: profile?.email, metadata: { userId } },
        { idempotencyKey: 'customer_' + userId }
      );
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 2. Créer l'abonnement en attente de paiement (Payment Element)
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId, plan },
      },
      // CIBLE 1 (AEGIS) — clé idempotente STABLE (sans Date.now()) : deux POST
      // identiques pour le même user/plan/interval sont dédupliqués par Stripe
      // au lieu de créer chacun un abonnement neuf (source du 429).
      { idempotencyKey: 'sub_' + userId + '_' + plan + '_' + interval }
    );

    // 3. Extraire le client_secret pour le formulaire de paiement
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    if (!clientSecret) {
      // Annuler l'abonnement incomplet pour éviter qu'il reste bloqué dans Stripe
      await stripe.subscriptions.cancel(subscription.id);
      return NextResponse.json({ error: 'Impossible d\'initialiser le formulaire de paiement. Veuillez réessayer dans quelques instants.' }, { status: 500 });
    }

    // 4. Sauvegarder le stripe_subscription_id MAINTENANT pour que le webhook puisse
    //    trouver le profil et activer l'abonnement après confirmation du paiement.
    await supabase.from('profiles').update({
      stripe_subscription_id: subscription.id,
    }).eq('id', userId);

    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });

  } catch (error: unknown) {
    const err = error as Error & { type?: string; code?: string };
    // Traduire les erreurs Stripe communes en français
    if (err.type === 'StripeCardError') {
      return NextResponse.json({ error: 'Votre carte a été refusée. Veuillez vérifier vos informations.' }, { status: 400 });
    }
    if (err.code === 'resource_missing') {
      return NextResponse.json({ error: 'Configuration de paiement introuvable. Veuillez contacter le support.' }, { status: 400 });
    }
    console.error('[API Error]', err);
    logStripeError('subscription', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}