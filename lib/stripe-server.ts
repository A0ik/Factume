// ---------------------------------------------------------------------------
// HERMÈS CIBLE 3 — Helper Stripe serveur centralisé + flag Issuing.
// Avant, chaque route instanziait `new Stripe(process.env.STRIPE_SECRET_KEY!)`
// localement (9 routes). On factorise ici pour Issuing et au-delà.
// ---------------------------------------------------------------------------

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** Singleton Stripe côté serveur (clé secrète). */
export function getStripeServer(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY manquant — configuration serveur incomplète.');
  }
  // On reprend la même init que les routes historiques (pas d'apiVersion forcée).
  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * HERMÈS — Option C « pont ».
 * Stripe Issuing n'est PAS self-serve : il faut un card program approuvé par
 * Stripe Sales (KYB 2026, délai 4-8 sem.). Tant que STRIPE_ISSUING_ENABLED n'est
 * pas 'true', l'émission RÉELLE (stripe.issuing.*) est désactivée — les commandes
 * sont persistées en statut 'queued' sans encaisser la fee (honnête vis-à-vis
 * du client : on ne facture pas un service qu'on ne peut pas encore rendre).
 */
export const ISSUING_ENABLED = process.env.STRIPE_ISSUING_ENABLED === 'true';

/** Montant des frais de commande (centimes, EUR). */
export const CARD_FEES = {
  virtual: 500,    // 5,00 €
  physical: 3000,  // 30,00 €
} as const;

export type CardType = 'virtual' | 'physical';
