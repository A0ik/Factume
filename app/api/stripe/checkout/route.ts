import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/stripe/checkout
 *
 * Stripe Checkout HOSTED (redirect) — mode subscription.
 * LOI 10 (Webhook Souverain) : la source de vérité reste le webhook
 * `checkout.session.completed` qui active l'abonnement en base.
 *
 * Body: { plan: 'pro' | 'business', yearly?: boolean }
 * Returns: { url } — vers laquelle rediriger le navigateur.
 */
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
    // 1. Auth — userId depuis la session, jamais du body
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const userId = user.id;

    // 2. Validation du plan + intervalle
    const { plan, yearly = false } = await req.json();
    if (plan !== 'pro' && plan !== 'business') {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    }
    const interval = yearly ? 'yearly' : 'monthly';
    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) {
      return NextResponse.json(
        { error: `Plan ${plan}/${interval} non configuré côté Stripe.`, code: 'NO_PRICE' },
        { status: 400 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

    // 3. Anti-double-charge : si un abonnement actif existe déjà → refuser
    if (profile.stripe_subscription_id) {
      try {
        const existing = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        if (existing.status === 'active' || existing.status === 'trialing') {
          return NextResponse.json(
            { error: 'Vous avez déjà un abonnement actif. Gérez-le depuis vos réglages.', code: 'ALREADY_SUBSCRIBED' },
            { status: 409 },
          );
        }
      } catch {
        // Abonnement supprimé/expiré côté Stripe — on peut continuer
      }
    }

    // 4. Créer ou réutiliser le Customer Stripe
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: profile.email, metadata: { userId } },
        { idempotencyKey: 'customer_' + userId },
      );
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 5. Session Checkout Hosted (mode subscription)
    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://factu.me';

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        // Métadonnées propagées sur la session ET l'abonnement (le webhook lit l'une ou l'autre)
        metadata: { userId, plan },
        subscription_data: { metadata: { userId, plan } },
        allow_promotion_codes: true,
        tax_id_collection: { enabled: true },
        // LOI 1 (Arbiter) : le consentement CGV ne doit JAMAIS bloquer le cash.
        // On a déjà une case CGU à l'inscription — on ne redemande pas un ToS
        // Stripe qui casse le checkout si l'URL n'est pas renseignée au Dashboard.
        // (URL ToS Dashboard à renseigner manuellement : https://factu.me/legal/cgu)
        success_url: `${origin}/dashboard?upgraded=1&plan=${plan}`,
        cancel_url: `${origin}/paywall?canceled=1`,
      },
      { idempotencyKey: `checkout_${userId}_${plan}_${interval}_${Date.now()}` }, // nonce temporel : session fraîche à chaque tentative (aligné avec /subscription)
    );

    if (!session.url) {
      return NextResponse.json({ error: "Stripe n'a pas retourné d'URL de paiement." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const err = error as Error & { type?: string; code?: string };
    if (err.type === 'StripeCardError') {
      return NextResponse.json({ error: 'Votre carte a été refusée.' }, { status: 400 });
    }
    console.error('[checkout]', err?.message || err);
    return NextResponse.json(
      { error: 'Impossible de démarrer le paiement. Veuillez réessayer.' },
      { status: 500 },
    );
  }
}
