// ─────────────────────────────────────────────────────────────────────────────
// INSPECTOR (BUG 2 + BUG 3) — Source de vérité UNIQUE pour le lien de paiement.
//
// Avant : le prestataire actif était INFÉRÉ d'une constellation de colonnes
// (payment_link, stripe_payment_url, stripe_payment_link_url/_id,
// sumup_checkout_id) par 4 résolveurs divergents (lib/pdf-server.ts, lib/pdf.ts,
// lib/templates.ts, components/pdf-document.tsx). Conséquences :
//   • BUG 2 — un switch Stripe→SumUp laissait la colonne legacy
//     stripe_payment_link_url peuplée → le QR pointait vers SumUp mais le
//     libellé disait STRIPE (résolveurs en désaccord).
//   • BUG 3 — aucune colonne ne mémorisait le montant figé dans le checkout →
//     une édition de prix laissait un QR obsolète chargeable à l'ancien montant.
//
// Ce module est l'unique autorité. Voir lib/__tests__/payment-link.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Invoice } from '@/types';

export type PaymentProvider = 'stripe' | 'sumup';

export interface ResolvedPaymentLink {
  /** Prestataire actif, ou null si non déterminé (ligne pré-migration). */
  provider: PaymentProvider | null;
  /** URL résolue. TOUJOURS vide si isStale → aucun QR obsolète jamais rendu. */
  url: string;
  /** Montant figé dans le checkout au moment de la création du lien. */
  amount: number | null;
  /** true quand le lien est invalidé et doit être régénéré. */
  isStale: boolean;
}

/**
 * Résout le lien de paiement depuis une facture. Contrat :
 *  1. payment_link_stale = true → url vide (règle monétaire absolue, BUG 3).
 *  2. payment_provider set → source de vérité ; on lit l'URL dans la colonne du
 *     provider (BUG 2 : plus d'inférence ambiguë).
 *  3. payment_provider null (ligne pré-migration) → repli sur l'ancienne
 *     précédence pour ne pas casser les factures existantes.
 */
export function resolvePaymentLink(invoice: Invoice | Record<string, unknown>): ResolvedPaymentLink {
  const inv = invoice as any;
  const provider: PaymentProvider | null = inv.payment_provider ?? null;
  const amount: number | null = inv.payment_link_amount ?? null;

  // BUG 3 — un lien invalidé ne s'affiche JAMAIS, quel que soit l'état des colonnes.
  if (inv.payment_link_stale === true) {
    return { provider, url: '', amount, isStale: true };
  }

  let url = '';
  let resolvedProvider: PaymentProvider | null = provider;
  if (provider === 'stripe') {
    url = inv.stripe_payment_url || inv.stripe_payment_link_url || '';
  } else if (provider === 'sumup') {
    url = inv.payment_link || (inv.sumup_checkout_id ? `https://checkout.sumup.com/${inv.sumup_checkout_id}` : '');
  } else {
    // Repli legacy — précédence historique (avant la colonne payment_provider).
    url =
      inv.payment_link ||
      inv.stripe_payment_url ||
      inv.stripe_payment_link_url ||
      (inv.sumup_checkout_id ? `https://checkout.sumup.com/${inv.sumup_checkout_id}` : '');
  }

  // ALCHEMIST (BUG : « pavé paiement manquant ») — RÉSILIENCE. Si le prestataire
  // déclaré n'a PAS d'URL (donnée corrompue/legacy : payment_provider='stripe' mais
  // stripe_payment_url NULL alors qu'un lien SumUp existe — ex. FACT-2026-035), le
  // résolveur strict renvoyait une URL vide → le PDF sortait SANS bloc paiement,
  // comme une facture normale. On retombe sur n'importe quel lien actif plutôt que
  // de n'en afficher aucun. On neutralise le provider (libellé générique
  // « PAIEMENT EN LIGNE ») pour ne pas réintroduire BUG 2 (QR SumUp + libellé Stripe).
  if (!url) {
    const fallback =
      inv.payment_link ||
      inv.stripe_payment_url ||
      inv.stripe_payment_link_url ||
      (inv.sumup_checkout_id ? `https://checkout.sumup.com/${inv.sumup_checkout_id}` : '');
    if (fallback) {
      url = fallback;
      resolvedProvider = null;
    }
  }

  return { provider: resolvedProvider, url, amount, isStale: false };
}

/** Un lien actif et utilisable existe-t-il (pas stale, URL résolue) ? */
export function hasActivePaymentLink(invoice: Invoice | Record<string, unknown>): boolean {
  return !!resolvePaymentLink(invoice).url;
}

/**
 * Construit l'objet update Supabase pour un lien fraîchement créé.
 *
 * Écrit : payment_provider, payment_link_amount, payment_link_stale=false, et les
 * colonnes du provider choisi. Nullifie TOUTES les colonnes du prestataire opposé
 * (legacy stripe_payment_link_url/_id incluse) — c'est le correctif central de
 * BUG 2 : un switch prestataire ne laisse plus jamais de colonne orpheline.
 */
export function buildFreshLinkUpdate(
  provider: PaymentProvider,
  payload: { url: string; amount: number; sumupId?: string | null },
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    payment_provider: provider,
    payment_link_amount: payload.amount,
    payment_link_stale: false,
    // Réinitialisation totale d'abord — on ne laisse aucune colonne orpheline.
    payment_link: null,
    stripe_payment_url: null,
    stripe_payment_link_id: null,
    stripe_payment_link_url: null,
    sumup_checkout_id: null,
  };

  if (provider === 'stripe') {
    update.stripe_payment_url = payload.url;
    update.payment_link = payload.url;
  } else {
    update.payment_link = payload.url;
    if (payload.sumupId) update.sumup_checkout_id = payload.sumupId;
  }

  return update;
}

/**
 * Invalide TOUT lien de paiement (BUG 3). Nullifie chaque colonne + lève le
 * drapeau payment_link_stale. payment_provider est VOLONTAIREMENT conservé
 * (non présent dans l'update) pour que le client sache quel prestataire
 * régénérer.
 */
export function buildVoidLinkUpdate(): Record<string, unknown> {
  return {
    payment_link: null,
    stripe_payment_url: null,
    stripe_payment_link_id: null,
    stripe_payment_link_url: null,
    sumup_checkout_id: null,
    payment_link_amount: null,
    payment_link_stale: true,
  };
}
