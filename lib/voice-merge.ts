/**
 * Fusion robuste des lignes renvoyées par l'IA (voix ou texte) avec l'état courant.
 *
 * Problème résolu (LOI 3 — Arbiter) : quand l'utilisateur RE-parle pour modifier,
 * l'IA peut renvoyer une liste partielle (un seul article) au lieu de la liste
 * complète modifiée. Remplacer aveuglément efface alors les articles existents.
 *
 * Règles :
 *  - action 'replaced'            → remplacement total intentionnel
 *  - action 'added'               → AJOUTE les nouvelles lignes (dédoublonnées)
 *  - action 'removed'             → la liste renvoyée sans les lignes supprimées
 *  - 'modified' / inconnu + liste plus courte que l'existant → FUSION (sécurité)
 *  - sinon (liste complète)        → on prend la liste renvoyée
 */

export interface MergeableItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export function normalizeDescription(s: string | undefined | null): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function mergeInvoiceItems(
  existing: MergeableItem[],
  incoming: MergeableItem[] | undefined | null,
  action?: string | null,
): MergeableItem[] {
  const safeIncoming = (incoming || []).filter(
    (i) => i && (i.description || i.unit_price || i.quantity),
  );
  if (safeIncoming.length === 0) return existing;

  const dedupeAppend = (base: MergeableItem[], add: MergeableItem[]): MergeableItem[] => {
    const seen = new Set(base.map((i) => normalizeDescription(i.description)));
    const fresh = add.filter((i) => !seen.has(normalizeDescription(i.description)));
    return [...base, ...(fresh.length ? fresh : add)];
  };

  switch (action) {
    case 'replaced':
      return safeIncoming;
    case 'added':
      return dedupeAppend(existing, safeIncoming);
    case 'removed':
      // La liste renvoyée est censée être l'existant moins les supprimées.
      return safeIncoming;
    case 'modified':
    default: {
      // L'IA doit renvoyer la liste COMPLÈTE modifiée.
      // Filet de sécurité : si la liste renvoyée est plus courte que l'existant,
      // c'est que l'IA a perdu des lignes → on fusionne au lieu d'écraser.
      if (existing.length > 0 && safeIncoming.length < existing.length) {
        return dedupeAppend(existing, safeIncoming);
      }
      return safeIncoming;
    }
  }
}
