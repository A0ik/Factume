import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { logStripeEnv, logStripeError } from '@/lib/stripe-diagnostics';

// Structure des prix — MONOLITH: Plus de plan Solo
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

// Mapping des plans pour l'ordre (pour calculer si c'est un upgrade ou downgrade)
const PLAN_ORDER = ['free', 'pro', 'business'];

// Prix mensuels en euros (pour le calcul du prorata)
const PRICES = {
  solo: 14.99,
  pro: 14.99,
  business: 39.99,
};

/**
 * Calcule le prorata pour un changement d'abonnement
 * Utilise les timestamps de période Stripe pour un calcul précis.
 */
function calculateProrata(
  currentPlan: string,
  newPlan: string,
  periodStart: number,  // Unix timestamp (Stripe current_period_start)
  periodEnd: number,    // Unix timestamp (Stripe current_period_end)
): {
  prorataAmount: number;
  prorataPercent: number;
  isUpgrade: boolean;
  remainingDays: number;
} {
  if (!currentPlan || currentPlan === 'free' || currentPlan === newPlan) {
    return { prorataAmount: 0, prorataPercent: 0, isUpgrade: true, remainingDays: 0 };
  }

  const currentPrice = PRICES[currentPlan as keyof typeof PRICES] || 0;
  const newPrice = PRICES[newPlan as keyof typeof PRICES] || 0;
  const isUpgrade = PLAN_ORDER.indexOf(newPlan) > PLAN_ORDER.indexOf(currentPlan);

  const now = Date.now();
  const totalMs = (periodEnd - periodStart) * 1000;
  const remainingMs = Math.max(0, periodEnd * 1000 - now);
  const totalDays = totalMs / (1000 * 60 * 60 * 24);
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const prorataPercent = totalDays > 0 ? (remainingMs / totalMs) * 100 : 0;

  const priceDiff = newPrice - currentPrice;
  const prorataAmount = priceDiff * (remainingMs / totalMs);

  return {
    prorataAmount: Math.abs(prorataAmount),
    prorataPercent: Math.round(prorataPercent),
    isUpgrade,
    remainingDays,
  };
}

export async function POST(req: NextRequest) {
  try {
    // OVERLORD (CIBLE 4) — trace la présence des vars Stripe pour identifier le 500.
    logStripeEnv('change-subscription');
    // Auth check - get userId from session, not from body
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const userId = user.id;

    const { plan, yearly = false } = await req.json();
    const interval = yearly ? 'yearly' : 'monthly';

    if (!PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) {
      return NextResponse.json({ error: `Missing ${interval} price for ${plan}` }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createAdminClient();

    // Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { userId }
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Champ correct en DB : stripe_subscription_id
    const currentSubscriptionId = profile?.stripe_subscription_id;
    const currentPlan = profile?.subscription_tier;
    let prorataInfo = null;

    if (currentSubscriptionId && currentPlan && currentPlan !== 'free') {
      try {
        const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

        // Prorata calculé depuis les timestamps Stripe (précis)
        prorataInfo = calculateProrata(
          currentPlan,
          plan,
          currentSubscription.current_period_start,
          currentSubscription.current_period_end,
        );

        const isUpgrade = prorataInfo.isUpgrade;

        const itemId = currentSubscription.items.data[0]?.id;
        if (!itemId) {
          return NextResponse.json({ error: 'Aucun article d\'abonnement trouvé dans Stripe. Veuillez contacter le support.' }, { status: 400 });
        }

        // Mise à jour de la souscription existante avec proration Stripe native
        await stripe.subscriptions.update(currentSubscriptionId, {
          items: [{
            id: itemId,
            price: priceId,
          }],
          // Pour les upgrades : facturer immédiatement le différentiel
          // Pour les downgrades : créer la proratisation sur la prochaine facture
          proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
          metadata: { plan, userId },
        });

        // Tier sera mis à jour par le webhook customer.subscription.updated
        // Ne PAS updater ici pour éviter de donner l'accès avant confirmation Stripe

        return NextResponse.json({
          success: true,
          prorata: prorataInfo,
          message: isUpgrade
            ? `Abonnement mis à niveau vers ${plan}. Le différentiel a été facturé.`
            : `Abonnement modifié vers ${plan}. Le crédit sera appliqué à votre prochaine facture.`,
        });

      } catch (stripeError: unknown) {
        const se = stripeError as Error & { code?: string };
        // Si la subscription n'existe plus dans Stripe (annulée, test, etc.),
        // on tombe sur le chemin "nouvelle souscription" au lieu de retourner une erreur.
        const isNotFound = se.code === 'resource_missing' || se.message?.includes('No such subscription');
        if (!isNotFound) {
          console.error('[change-subscription] Erreur Stripe:', se.message);
          logStripeError('change-subscription', stripeError);
          return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
        }
        // Subscription invalide → on continue vers la création d'une nouvelle
      }
    }

    // Pas d'abonnement existant (ou subscription Stripe invalide) → nouvelle souscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { plan, userId },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      prorata: prorataInfo,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[change-subscription] Error:', err.message);
    logStripeError('change-subscription', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * GET - Récupérer les informations de prorata pour un changement de plan
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check - get userId from session
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const userId = user.id;
    const newPlan = searchParams.get('plan');

    if (!newPlan) {
      return NextResponse.json({ error: 'Missing plan parameter' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPlan = profile?.subscription_tier;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let prorataInfo = { prorataAmount: 0, prorataPercent: 0, isUpgrade: true, remainingDays: 0 };
    if (profile?.stripe_subscription_id && currentPlan && currentPlan !== 'free') {
      try {
        const currentSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        prorataInfo = calculateProrata(
          currentPlan,
          newPlan,
          currentSubscription.current_period_start,
          currentSubscription.current_period_end,
        );
      } catch {
        // Subscription non trouvée — pas de prorata
      }
    }

    // Calculer les prix
    const currentPrice = currentPlan && currentPlan !== 'free' ? PRICES[currentPlan as keyof typeof PRICES] : 0;
    const newPrice = PRICES[newPlan as keyof typeof PRICES] || 0;

    return NextResponse.json({
      currentPlan,
      currentPrice,
      newPlan,
      newPrice,
      ...prorataInfo,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[change-subscription] GET Error:', err.message);
    logStripeError('change-subscription:get', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
