import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getClientIp } from '@/lib/rate-limit';
import { isDisposableEmail } from '@/lib/disposable-emails';

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
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié. Veuillez vous reconnecter.' }, { status: 401 });
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

    // Block disposable emails
    if (profile.email && isDisposableEmail(profile.email)) {
      return NextResponse.json({ error: 'Les adresses email jetables ne sont pas acceptées. Veuillez utiliser une adresse email valide.' }, { status: 400 });
    }

    // Atomic trial activation check (prevents race conditions)
    const clientIp = getClientIp(req);
    const { data: trialCheck, error: trialCheckError } = await supabase
      .rpc('activate_trial_check', { p_user_id: userId, p_ip_address: clientIp || null });

    if (trialCheckError) {
      return NextResponse.json({ error: 'Erreur lors de la vérification. Veuillez réessayer.' }, { status: 500 });
    }

    if (!trialCheck || !trialCheck[0]?.can_activate) {
      return NextResponse.json({ error: trialCheck?.[0]?.reason || 'Essai non disponible.' }, { status: 400 });
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
      trial_ip_address: clientIp || null,
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
