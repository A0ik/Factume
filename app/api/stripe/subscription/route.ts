import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

// Tu gardes ta super structure de prix !
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

    // 1. Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile?.email, metadata: { userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 2. Créer l'abonnement en attente de paiement (Payment Element)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, plan },
    });

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
    return NextResponse.json({ error: err.message || 'Une erreur est survenue. Veuillez réessayer.' }, { status: 500 });
  }
}