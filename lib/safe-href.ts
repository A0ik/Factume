// ODIN (S3) — Valide le schéma d'une URL issue de la BDD avant de la rendre dans un href.
// Empêche l'injection `javascript:` (ou toute autre scheme dangereuse) si une colonne BDD
// (notifications.link, invoices.stripe_payment_url, invoices.payment_link…) contient une
// valeur arbitraire. On n'accepte que http(s), mailto, tel et les chemins relatifs.
// Retourne undefined si la valeur est refusée → React rend un href sûr (pas de navigation).
export function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed) ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  // Toute autre forme (javascript:, data:, blob:, vbscript:, etc.) → rejetée.
  return undefined;
}
