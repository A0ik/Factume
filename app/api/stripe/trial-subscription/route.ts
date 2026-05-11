import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

const PRICE_IDS: Record<string, Record<string, string>> = {
  solo: {
    monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_SOLO_YEARLY_PRICE_ID!,
  },
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
    const { plan, userId, yearly = false } = await req.json();
    const interval = yearly ? 'yearly' : 'monthly';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    if (!userId) return NextResponse.json({ error: 'Utilisateur non identifié. Veuillez vous reconnecter.' }, { status: 400 });
    if (!PRICE_IDS[plan]) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) return NextResponse.json({ error: `Ce plan (${plan} / ${interval === 'yearly' ? 'annuel' : 'mensuel'}) n'est pas encore configuré. Veuillez contacter le support.` }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (!profile) return NextResponse.json({ error: 'Profil introuvable. Veuillez vous reconnecter.' }, { status: 404 });

    // Prevent trial abuse: reject if user already had a trial
    if (profile.trial_start_date) {
      return NextResponse.json({ error: 'Vous avez déjà utilisé votre période d\'essai.' }, { status: 400 });
    }

    // 1. Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile?.email, metadata: { userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 2. Créer l'abonnement avec 7 jours d'essai gratuit
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 7,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        userId,
        plan,
        trialStart: new Date().toISOString(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    // 3. Créer un SetupIntent pour collecter la carte pendant l'essai
    // (Pas de PaymentIntent car la facture d'essai est $0)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        userId,
        subscriptionId: subscription.id,
        plan,
      },
    });

    // 4. On ne met PAS à jour le profil ici.
    // Le profil sera mis à jour par le webhook setup_intent.succeeded
    // quand l'utilisateur aura complété le formulaire de paiement.
    // On stocke seulement le subscription_id pour le webhook.
    await supabase.from('profiles').update({
      stripe_subscription_id: subscription.id,
    }).eq('id', userId);

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      subscriptionId: subscription.id,
      trialDays: 7,
      isSetupMode: true,
    });

  } catch (error: unknown) {
    const err = error as Error & { type?: string; code?: string };
    if (err.code === 'resource_missing') {
      return NextResponse.json({ error: 'Configuration de paiement introuvable. Veuillez contacter le support.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Une erreur est survenue. Veuillez réessayer.' }, { status: 500 });
  }
}
