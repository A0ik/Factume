// ─────────────────────────────────────────────────────────────────────────────
// ATELIER (CIBLE 2 & 3) — Token de paiement court.
//
// Le QR code et le lien cliquable de la facture pointent vers une URL courte
// interne `https://factu.me/pay/<token>` qui redirige (302) vers le vrai
// checkout du prestataire (Stripe/SumUp). Bénéfices :
//   • CIBLE 2 — payload QR ~35 chars au lieu de 200+ (checkout Stripe) → moins
//     de modules → code moins dense → scannable instantanément par un smartphone.
//   • CIBLE 3 — un seul endroit à rendre cliquable ; la route /pay fait la
//     résolution centrale via resolvePaymentLink (plus de logique divergente).
//
// Le token (8 chars, base56 sans caractères ambigus) est l'unique secret de la
// route publique /pay/[token] — espace 56^8 ≈ 9.6e13, inguessable.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

/** Alphabet sans 0/O/1/I/l pour éviter les confusions à la lecture. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TOKEN_LEN = 8;
const MAX_MINT_ATTEMPTS = 4;

/**
 * Génère un token aléatoire URL-safe (Web Crypto). Jamais deux fois le même en
// pratique (56^8 combinaisons).
 */
export function mintShortToken(): string {
  const bytes = new Uint32Array(TOKEN_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < TOKEN_LEN; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Construit l'URL courte absolue d'un token. */
export function buildShortPayUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me').replace(/\/+$/, '');
  return `${base}/pay/${token}`;
}

/**
 * Garantit qu'une facture possède un token ; le crée (et persiste) sinon.
 * Idempotent et sûr contre la concurrence :
 *  • si `existing` est déjà renseigné → renvoyer tel quel (pas de DB) ;
 *  • sinon on UPDATE ... WHERE payment_short_token IS NULL (on n'écrase jamais un
 *    token posé concurremment), puis on retry en cas de collision unique (23505).
 * Renvoie le token (existant ou fraîchement créé), ou null si échec.
 */
export async function ensureShortToken(
  admin: SupabaseClient,
  invoiceId: string,
  existing: string | null | undefined,
): Promise<string | null> {
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_MINT_ATTEMPTS; attempt++) {
    const token = mintShortToken();

    // Update conditionnel : ne touche que les lignes encore sans token.
    const { data, error } = await admin
      .from('invoices')
      .update({ payment_short_token: token })
      .eq('id', invoiceId)
      .is('payment_short_token', null)
      .select('payment_short_token');

    if (!error) {
      // Ligne mise à jour → on a posé le token.
      if (data && data.length > 0) return token;
      // 0 ligne → un token a été posé concurremment (ou la facture n'existe pas).
      const { data: cur } = await admin
        .from('invoices')
        .select('payment_short_token')
        .eq('id', invoiceId)
        .maybeSingle();
      if (cur?.payment_short_token) return cur.payment_short_token;
      // Toujours rien et ligne inexistante → on abandonne.
      if (attempt === MAX_MINT_ATTEMPTS - 1) return null;
      continue;
    }

    // Collision sur l'unique index → on retente avec un nouveau token.
    if (error.code === '23505') continue;

    console.error('[pay-token] ensureShortToken erreur inattendue :', error.code, error.message);
    return null;
  }

  return null;
}
