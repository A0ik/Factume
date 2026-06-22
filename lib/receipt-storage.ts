// ---------------------------------------------------------------------------
// ZEUS (CIBLE 2) — Accès au bucket Storage PRIVÉ `receipts` (justificatifs OCR).
// ---------------------------------------------------------------------------
// Le bucket `receipts` est PRIVÉ (public = false). Tous les pipelines OCR
// (ocr-core, ocr-mistral, ocr-bulk, …) utilisaient getPublicUrl(), ce qui
// produisait des URLs publiques renvoyant 404 « Bucket not found » sur un
// bucket privé. On passe aux URLs signées (createSignedUrl), courte durée.
//
// Les justificatifs des notes de frais MANUELLES vivent dans le bucket PUBLIC
// `assets` — ils restent accessibles via getPublicUrl et ne passent pas ici.
//
// ⚠️ Ce module est CLIENT-SAFE (aucun import serveur / aucune clé) afin de
// pouvoir être importé par le hook useSignedUrl côté navigateur. La création
// d'URL signée (createAdminClient) vit côté route serveur uniquement.
// ---------------------------------------------------------------------------

export const RECEIPTS_BUCKET = 'receipts';

/** Détecte une URL Supabase pointant vers le bucket privé receipts. */
const RECEIPTS_PUBLIC_URL_RE = /\/storage\/v1\/object\/(?:public|sign)\/receipts\//;

/** true si l'URL donnée est un justificatif du bucket privé receipts (à signer). */
export function isReceiptsPrivateUrl(input: string | null | undefined): boolean {
  return !!input && RECEIPTS_PUBLIC_URL_RE.test(input);
}

/**
 * Extrait le chemin Storage (path) d'une URL receipts (publique ou signée),
 * OU renvoie le path tel quel s'il en est déjà un.
 *   ".../object/public/receipts/<userId>/<file>.pdf" → "<userId>/<file>.pdf"
 * Renvoie null si l'entrée n'est pas exploitable.
 */
export function extractReceiptPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = input.match(/\/storage\/v1\/object\/(?:public|sign)\/receipts\/(.+)$/);
  if (match) return decodeURIComponent(match[1]);
  // Déjà un path simple (sans schéma http) ?
  if (!/^https?:\/\//i.test(input) && input.includes('/')) return input;
  return null;
}
