/**
 * ZÉNITH (CIBLE 1 — Relances bloquantes) — Logique pure de classification d'une
 * facture avant envoi d'une relance. Partagée par toutes les surfaces de relance
 * (RemindersModal, BulkActions, /documents, CopilotFAB, /invoices/[id]) pour qu'on
 * ne puisse PLUS jamais tomber dans l'impasse silencieuse « 0 envoyée ».
 *
 * Règle d'or : la garde client doit refléter EXACTEMENT le test serveur
 * (lib/reminders.ts:86 `if (!client?.email)`). Avant, la garde client exigeait
 * `inv.client?.id` truthy pour déclencher le pop-up, ce qui laissait passer :
 *   1. les factures SANS client lié (client_id null → client null) — 85 % des cas
 *      relançables en production — => envoi fantôme + toast « sans email ».
 *   2. les clients renvoyés sous forme de TABLEAU par Supabase
 *      (`inv.client?.id` vaut alors `undefined` sur l'Array) => garde sautée.
 */

export interface RelanceClient {
  id: string;
  name?: string | null;
  email?: string | null;
}

/**
 * Normalise le client d'une facture en un objet unique.
 * Supabase `client:clients(*)` peut renvoyer un tableau (relation ambiguë /
 * 1→n) ou un objet ; on gère les deux formes comme le serveur le fait
 * (lib/reminders.ts:76).
 */
export function normalizeRelanceClient(inv: any): RelanceClient | null {
  if (!inv) return null;
  const c = inv.client;
  if (Array.isArray(c)) return (c[0] as RelanceClient) ?? null;
  return (c as RelanceClient) ?? null;
}

export type RelanceStatus = 'ready' | 'missing-email' | 'no-client';

/**
 * Classifie une facture pour la relance :
 *  - 'no-client'     : aucun client exploitable (impossible d'écrire un email).
 *  - 'missing-email' : client lié mais sans email (pop-up de saisie + persistance).
 *  - 'ready'         : client + email présents, on peut envoyer.
 *
 * Ce prédicat est la source unique de vérité : la garde UI et le test serveur
 * doivent toujours s'accorder sur ces définitions.
 */
export function classifyRelanceInvoice(inv: any): RelanceStatus {
  const client = normalizeRelanceClient(inv);
  if (!client || !client.id) return 'no-client';
  if (!client.email || !String(client.email).trim()) return 'missing-email';
  return 'ready';
}

/** Nom d'affichage dégradé pour une facture (sans client lisible). */
export function relanceDisplayLabel(inv: any): string {
  const client = normalizeRelanceClient(inv);
  return (
    client?.name ||
    inv?.client_name_override ||
    inv?.client_name ||
    `Facture n° ${inv?.number || 'N/A'}`
  );
}
