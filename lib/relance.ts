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
 * Extrait l'email destinataire d'une facture, en couvrant les 3 cas réels :
 *  1. client lié avec email (join `client.email`) ;
 *  2. client saisi en ligne à la création, NON lié (snapshot `inv.client_email`) ;
 *  3. brouillon Copilot (champ camelCase `inv.clientEmail`).
 * Renvoie '' si aucun email exploitable.
 */
export function relanceEmail(inv: any): string {
  const client = normalizeRelanceClient(inv);
  const fromJoin = client?.email ? String(client.email).trim() : '';
  if (fromJoin) return fromJoin;
  const denorm = inv?.client_email ? String(inv.client_email).trim() : '';
  if (denorm) return denorm;
  const camel = inv?.clientEmail ? String(inv.clientEmail).trim() : '';
  return camel;
}

/**
 * Classifie une facture pour la relance :
 *  - 'ready'         : un email destinataire est disponible (client lié OU snapshot
 *                      dénormalisé client_email). On peut envoyer.
 *  - 'missing-email' : client LIÉ (client_id) mais sans email — on capture et on
 *                      persiste dans la fiche client (clients.email).
 *  - 'no-client'     : ni client lié, ni email dénormalisé — on capture un email et
 *                      on l'écrit dans le snapshot de la facture (non-fiscal).
 *
 * ZÉNITH (CIBLE 1) — Avant, 'no-client' renvoyait vers une facture verrouillée
 * (immuable) → impasse. Désormais le snapshot client_email compte comme destinataire
 * valide (80 factures de prod B2C/inline), et le cas résiduel sans aucun email est
 * résolu par un pop-up qui écrit dans invoices.client_email (carve-out non-fiscal).
 */
export function classifyRelanceInvoice(inv: any): RelanceStatus {
  if (relanceEmail(inv)) return 'ready';
  const client = normalizeRelanceClient(inv);
  if (client && client.id) return 'missing-email';
  return 'no-client';
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
