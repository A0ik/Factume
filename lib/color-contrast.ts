// ─────────────────────────────────────────────────────────────────────────────
// SAGE (CIBLE 1) — Contraste WCAG 2.1 pour le TOTAL TTC.
//
// Bug racine : la couleur du texte du TOTAL TTC était hardcodée (blanc, ou accent),
// quel que soit le fond. Si l'utilisateur choisit un accent clair (ex. jaune pâle),
// le fond de la bande TOTAL devenait clair et le texte blanc → illisible.
//
// Solution : calculer la luminance relative WCAG du fond et choisir la couleur de
// texte qui maximise le ratio de contraste parmi {noir, blanc, accent}. On inclut
// l'accent comme candidat pour préserver l'esthétique des templates qui l'utilisent
// délibérément — mais seulement s'il contraste suffisamment.
//
// Réf. formule : https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
// ─────────────────────────────────────────────────────────────────────────────

/** Couleur RGB normalisée 0..1 (sRGB). */
export interface RGB01 {
  r: number;
  g: number;
  b: number;
}

/** hex (#RGB, #RRGGBB, #RRGGBBAA) → canaux 0..1. */
export function hexToRGB01(hex: string): RGB01 {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h.slice(0, 6), 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/** canaux 0..1 → #RRGGBB. */
export function rgb01ToHex(c: RGB01): string {
  const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return '#' + [c.r, c.g, c.b].map((v) => to255(v).toString(16).padStart(2, '0')).join('');
}

/** Linéarisation d'un canal sRGB (0..1) — étape WCAG. */
function channelLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function relativeLuminance(c: RGB01): number {
  return (
    0.2126 * channelLinear(c.r) +
    0.7152 * channelLinear(c.g) +
    0.0722 * channelLinear(c.b)
  );
}

/** Ratio de contraste WCAG entre deux couleurs (1..21). */
export function contrastRatio(a: RGB01, b: RGB01): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Choisit la couleur de texte (parmi noir, blanc, et accent si fourni) qui maximise
 * le contraste avec le fond. Garantit la lisibilité WCAG quelle que soit la teinte
 * du fond, tout en conservant l'accent lorsqu'il reste suffisamment contrasté.
 */
export function bestTextRGB01(bg: RGB01, accent?: RGB01): RGB01 {
  const candidates: RGB01[] = [
    { r: 0, g: 0, b: 0 },
    { r: 1, g: 1, b: 1 },
  ];
  if (accent) candidates.push(accent);

  let best = candidates[0];
  let bestRatio = -1;
  for (const cand of candidates) {
    const ratio = contrastRatio(bg, cand);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = cand;
    }
  }
  return best;
}

/** Variante hex (pour react-pdf / CSS). */
export function bestTextHex(bgHex: string, accentHex?: string): string {
  return rgb01ToHex(
    bestTextRGB01(hexToRGB01(bgHex), accentHex ? hexToRGB01(accentHex) : undefined),
  );
}
