// ─────────────────────────────────────────────────────────────────────────────
// ODIN (CIBLE 2) — Vérité comptable des acomptes.
//
// Règle d'or : un lien de paiement ne JAMAIS charger le total d'une facture
// partiellement réglée. Il charge le SOLDE RESTANT :
//
//     remaining = total − Σ partial_payments.amount
//
// Avant ce module, les 4 routes de création de lien (Stripe Connect, Stripe
// legacy, portail client, SumUp) lisaient `invoice.total` et ignoraient les
// acomptes déjà validés → un client qui versait un acompte de 100 € sur une
// facture de 500 € puis réouvrait le lien était re-facturé 500 €. Catastrophe
// comptable. Ce module est l'unique source du montant à charger.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Somme des acomptes déjà validés d'une facture (lecture serveur, via un client
 * admin/service). Retourne 0 si aucun acompte — formule stable pour le cas nominal.
 */
export async function getPaidTotal(
  admin: SupabaseClient,
  invoiceId: string,
): Promise<number> {
  const { data } = await admin
    .from('partial_payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  return (data ?? []).reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);
}

/**
 * Reste à payer = total − paidTotal. Arrondi à 2 décimales (centimes Stripe),
//  jamais négatif (un trop-perçu est géré côté avoir, pas via un lien négatif).
 */
export function computeRemaining(total: number, paidTotal: number): number {
  const remaining = Number(total ?? 0) - Number(paidTotal ?? 0);
  return Math.max(0, Math.round(remaining * 100) / 100);
}

/**
 * Variante pure côté client : calcule le reste à payer depuis une liste de
 * paiements déjà chargée (state `partialPayments` de la page facture).
 */
export function computeRemainingFromPayments(
  total: number,
  payments: { amount: number | string | null }[] | null | undefined,
): number {
  const paid = (payments ?? []).reduce(
    (sum, p) => sum + Number(p?.amount ?? 0),
    0,
  );
  return computeRemaining(total, paid);
}
