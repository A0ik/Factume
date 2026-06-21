/**
 * ALCHEMIST — Client Stripe (browser) centralisé.
 *
 * Singleton `loadStripe` : UNE SEULE fois pour toute l'app (recommandé par Stripe,
 * évite de re-charger stripe.js). Corrige le bug historique d'EmbeddedCheckout qui
 * lisait `NEXT_PUBLIC_STRIPE_PK` alors que `.env.example` documente
 * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. On supporte les DEUX noms pour ne casser
 * aucun setup local existant.
 *
 * ⚠️ Côté client uniquement — ce fichier ne doit jamais être importé par du code
 * serveur (route handlers, server components). Pour le serveur, instancier
 * `new Stripe(process.env.STRIPE_SECRET_KEY!)` localement.
 */
import { loadStripe, type Stripe } from '@stripe/stripe-js';

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_PK ||
  null;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePublishableKey) {
    // Aucune clé publishable configurée — on renvoie null ; les composants
    // consommateurs affichent l'état « Configuration Stripe manquante ».
    if (typeof console !== 'undefined' && !stripePromise) {
      console.warn(
        '[stripe-client] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante — paiement désactivé.',
      );
    }
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
}

/** Vrai si une clé publishable est configurée (pour affichage conditionnel d'UI). */
export const hasStripePublishableKey = Boolean(stripePublishableKey);
