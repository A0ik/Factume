/**
 * Server-side PDF generation using pdf-lib.
 * Supports templates 1-6, logo embedding, payment links, and proper French character encoding.
 */
import { PDFDocument, rgb, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { resolveTermsText } from './payment-terms';
import { bestTextRGB01, legibleAccentRGB01, type RGB01 } from './color-contrast';
import React from 'react';
import type { Invoice, Profile } from '@/types';
import { withQrDataUrl } from './pdf';

/**
 * Generate a real PDF buffer for preview and download. (VULCAIN build fix —
 * déplacée depuis lib/pdf.ts : elle y faisait un `await import('./pdf-server')`
 * qu'webpack bundlait quand même côté client, tirant `fs` via pdf.ts ← GenerateurForm.)
 *
 * Strategy: pdf-lib first (reliable in serverless), @react-pdf/renderer as fallback.
 * On ne mute JAMAIS l'invoice en entrée (sinon un QR obsolète survit aux régénérations).
 */
export async function generatePdfBuffer(invoice: Invoice, profile?: Profile | null): Promise<Uint8Array> {
  try {
    const buffer = await generateInvoicePdfBuffer(invoice, profile);
    return new Uint8Array(buffer);
  } catch (pdfLibErr) {
    console.warn('[pdf] pdf-lib failed, trying @react-pdf/renderer:', (pdfLibErr as Error).message);
    try {
      const { renderToBuffer } = await import('@react-pdf/renderer');
      const { PdfDocument } = await import('@/components/pdf-document');
      const invoiceWithQr = await withQrDataUrl(invoice);
      const element = React.createElement(PdfDocument, { invoice: invoiceWithQr, profile: profile || {} as Profile });
      return await renderToBuffer(element as any);
    } catch (reactPdfErr) {
      console.error('[pdf] Both PDF engines failed. pdf-lib:', (pdfLibErr as Error).message, '| react-pdf:', (reactPdfErr as Error).message);
      throw pdfLibErr;
    }
  }
}

/**
 * APEX — Charge un fichier police TTF depuis lib/fonts/. Les polices Inter sont
 * auto-hébergées (OFL), chargées de façon synchrone et déterministe (zéro dépendance
 * réseau au runtime). Utilisé par embedFont() après registerFontkit(fontkit).
 */
function loadFont(name: string): Uint8Array {
  return fs.readFileSync(path.join(process.cwd(), 'lib', 'fonts', name));
}

/** Fetch a remote image and embed it. Returns null on any error so callers can skip gracefully. */
async function fetchAndEmbedImage(pdfDoc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2 * 1024 * 1024) {
      console.warn('[PDF] Logo too large, skipping:', buf.byteLength);
      return null;
    }
    const bytes = new Uint8Array(buf);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    if (isPng) return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0.114, 0.62, 0.459);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
}

function mixRgb(c: RGB, alpha: number, bg: RGB = rgb(1, 1, 1)): RGB {
  return rgb(c.red * alpha + bg.red * (1 - alpha), c.green * alpha + bg.green * (1 - alpha), c.blue * alpha + bg.blue * (1 - alpha));
}

// SAGE (CIBLE 1) — Contraste WCAG du TOTAL TTC : choisit la couleur de texte la plus
// lisible (noir / blanc / accent) selon la luminance du fond, pour qu'un accent clair
// ne rende jamais le total illisible. Adapte le pdf-lib RGB (0..1) au helper partagé.
function bestTextOn(bg: RGB, accent?: RGB): RGB {
  const to01 = (c: RGB): RGB01 => ({ r: c.red, g: c.green, b: c.blue });
  const pick = bestTextRGB01(to01(bg), accent ? to01(accent) : undefined);
  return rgb(pick.r, pick.g, pick.b);
}

// TITAN (CIBLE contraste) — Variante « accent lisible » pour les libellés en
// accent sur fond clair : conserve l'accent s'il passe AA (4.5:1), sinon
// l'assombrit juste assez pour rester lisible (préserve la teinte de marque).
function legibleAccentOn(bg: RGB, accent: RGB): RGB {
  const to01 = (c: RGB): RGB01 => ({ r: c.red, g: c.green, b: c.blue });
  const pick = legibleAccentRGB01(to01(bg), to01(accent));
  return rgb(pick.r, pick.g, pick.b);
}

const sameColor = (a: RGB, b: RGB): boolean =>
  a.red === b.red && a.green === b.green && a.blue === b.blue;

// ── Safe text (WinAnsiEncoding — French accented chars ARE supported: e9=e8=e0=ea=eb=e7...) ──

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
    .replace(/[\u2018\u2019]/g, "'").replace(/[""]/g, '"')
    .replace(/\u2026/g, '...')
    // PROMETHEUS (CIBLE 2) \u2014 VERIFI\u00C9 par test round-trip : pdf-lib + StandardFonts
    // rendent \u20AC (U+20AC), les accents fran\u00E7ais et les ligatures (\u0153). L'ancienne
    // ligne `\u20AC \u2192 "EUR"` \u00E9tait un BUG qui affichait le mot "EUR". On ne strippe plus.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // retire uniquement les contr\u00F4les C0 (garde \t\n\r)
}

// ── Drawing primitives ────────────────────────────────────────────────────────

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  size: number, font: PDFFont, color: RGB, maxWidth?: number,
): void {
  let t = safe(text);
  if (maxWidth) {
    while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -1);
  }
  if (!t) return;
  page.drawText(t, { x, y, size, font, color });
}

function rightText(
  page: PDFPage, text: string, rightEdge: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: rightEdge - w, y, size, font, color });
}

function centreText(
  page: PDFPage, text: string, x: number, w: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const tw = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: x + (w - tw) / 2, y, size, font, color });
}

/** Wrap long text over multiple lines; returns new y. */
function drawWrapped(
  page: PDFPage, text: string, x: number, y: number, maxW: number,
  size: number, font: PDFFont, color: RGB, lineH: number, minY: number,
): number {
  const words = safe(text).split(/\s+/);
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (line && y > minY) { drawText(page, line, x, y, size, font, color); y -= lineH; }
      line = word;
    } else {
      line = test;
    }
  }
  if (line && y > minY) { drawText(page, line, x, y, size, font, color); y -= lineH; }
  return y;
}

/** Compte le nombre de lignes qu'un texte occupera une fois wrappé (miroir de drawWrapped). */
function wrapLines(text: string, maxW: number, size: number, font: PDFFont): number {
  const words = safe(text).split(/\s+/);
  let line = '';
  let count = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      count++;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) count++;
  return Math.max(1, count);
}

// ── Rounded rectangle (CIBLE 2) ──────────────────────────────────────────────
// pdf-lib n'a pas de rectangle arrondi natif. On compose un chemin SVG (4 quarts
// de cercle + segments) et on s'appuie sur page.drawSvgPath, qui inverse LUI-MÊME
// l'axe Y (scale(1,-1) — voir pdf-lib operations.js). On passe donc un path en
// coordonnées SVG (0,0)→(w,h), origine x = bord gauche, y = bord GAUCHE-BAS, et
// drawSvgPath reçoit y = bottomY + height (le haut PDF) pour retomber sur ses pieds.
// Convention (x, y) = coin bas-gauche, identique à page.drawRectangle.
export function drawRoundedRect(
  page: PDFPage,
  opts: {
    x: number; y: number; width: number; height: number;
    radius?: number;
    color?: RGB; borderColor?: RGB; borderWidth?: number;
  },
): void {
  const { x, y, width, height, color, borderColor, borderWidth } = opts;
  const radius = opts.radius ?? 6;
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  // Sature le rayon pour ne jamais dépasser la demi-largeur/hauteur (sinon auto-intersection).
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const path = r <= 0
    ? `M 0 0 H ${w} V ${h} H 0 Z`
    : `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(path, {
    x,
    y: y + h, // SVG (0,0)=haut-gauche → on ancre au HAUT PDF (bottomY + height)
    color,
    borderColor,
    borderWidth,
  });
}

/**
 * ATELIER (CIBLE 3) — Ajoute une annotation de lien cliquable (URI) sur une zone
 * rectangulaire de la page. Recette officielle pdf-lib (context.obj + register +
 * page.node.addAnnotation). Échoue silencieusement (log) pour ne jamais casser le
 * rendu PDF : un lien absent reste un défaut cosmétique, pas un crash.
 */
function addLinkAnnotation(page: PDFPage, x: number, y: number, w: number, h: number, uri: string): void {
  try {
    const doc = page.doc;
    const annot = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: uri },
    });
    page.node.addAnnot(doc.context.register(annot));
  } catch (err) {
    console.warn('[pdf-server] addLinkAnnotation failed:', (err as Error).message);
  }
}

// ── Template style definitions ────────────────────────────────────────────────

type TemplateStyle = {
  useSerif: boolean;
  headerFull: boolean;
  headerBg: RGB;
  headerH: number;
  bodyBg: RGB;
  rowEven: RGB;
  rowOdd: RGB;
  thBg: RGB;
  thText: RGB;
  totalBg: RGB;
  totalValueColor: (accent: RGB) => RGB;
  dividerColor: RGB;
  sectionBoxBg: RGB;
  /** ATELIER (CIBLE 4) — traitement du TOTAL TTC. Défaut 'bar' (bande pleine). */
  totalStyle?: 'bar' | 'flat' | 'card' | 'boxed';
};

function getStyle(templateId: number, accent: RGB): TemplateStyle {
  switch (templateId) {
    case 2:
      return {
        useSerif: true, headerFull: true,
        headerBg: rgb(0.102, 0.102, 0.18),
        headerH: 104,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.98, 0.98, 0.98),
        thBg: rgb(0.102, 0.102, 0.18), thText: rgb(0.9, 0.9, 0.9),
        totalBg: rgb(0.102, 0.102, 0.18),
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.8, 0.8, 0.85),
        sectionBoxBg: rgb(0.97, 0.97, 0.97),
      };
    case 3:
      return {
        useSerif: false, headerFull: true,
        headerBg: accent,
        headerH: 104,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.985, 0.985, 0.99),
        thBg: rgb(0.97, 0.97, 0.97), thText: accent,
        totalBg: accent,
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.91, 0.91, 0.93),
        sectionBoxBg: mixRgb(accent, 0.05),
      };
    case 4:
      return {
        useSerif: true, headerFull: false,
        headerBg: rgb(0.992, 0.976, 0.953),
        headerH: 8,
        bodyBg: rgb(0.992, 0.976, 0.953),
        rowEven: rgb(1, 0.99, 0.98), rowOdd: rgb(0.992, 0.973, 0.95),
        thBg: rgb(0.992, 0.976, 0.953), thText: accent,
        totalBg: rgb(0.102, 0.063, 0.012),
        totalValueColor: () => accent,
        dividerColor: mixRgb(accent, 0.25),
        sectionBoxBg: rgb(0.992, 0.973, 0.95),
      };
    case 5:
      return {
        useSerif: false, headerFull: true,
        headerBg: rgb(0.118, 0.161, 0.235),
        headerH: 104,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.973, 0.98, 0.992),
        thBg: rgb(0.118, 0.161, 0.235), thText: rgb(0.58, 0.635, 0.72),
        totalBg: rgb(0.118, 0.161, 0.235),
        totalValueColor: () => accent,
        dividerColor: rgb(0.886, 0.91, 0.941),
        sectionBoxBg: rgb(0.973, 0.98, 0.992),
      };
    case 6:
      return {
        useSerif: false, headerFull: true,
        headerBg: rgb(0.086, 0.388, 0.204),
        headerH: 104,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.97, 0.995, 0.98),
        thBg: rgb(0.941, 0.992, 0.957), thText: rgb(0.086, 0.502, 0.29),
        totalBg: rgb(0.086, 0.388, 0.204),
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.733, 0.973, 0.816),
        sectionBoxBg: rgb(0.941, 0.992, 0.957),
      };
    case 7:
      // ATELIER (CIBLE 4) — PUR : minimaliste épuré (Stripe/Linear). Filets
      // capillaires, lignes sans zebra, total à plat (filet accent + grand chiffre).
      return {
        useSerif: false, headerFull: false,
        headerBg: accent, headerH: 6,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(1, 1, 1),
        thBg: rgb(0.965, 0.97, 0.975), thText: accent,
        totalBg: rgb(1, 1, 1),
        totalValueColor: (a: RGB) => a,
        dividerColor: rgb(0.91, 0.91, 0.93),
        sectionBoxBg: rgb(0.985, 0.985, 0.988),
        totalStyle: 'flat',
      };
    case 8:
      // ATELIER (CIBLE 4) — AUDACE : moderne à fort impact. Bande accent pleine,
      // bandeau de tableau accent, zebra accent léger, TOTAL en carte accent.
      return {
        useSerif: false, headerFull: true,
        headerBg: accent, headerH: 120,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: mixRgb(accent, 0.04),
        thBg: accent, thText: rgb(1, 1, 1),
        totalBg: accent,
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: mixRgb(accent, 0.2),
        sectionBoxBg: mixRgb(accent, 0.06),
        totalStyle: 'card',
      };
    case 9:
      // ATELIER (CIBLE 4) — ÉLÉGANCE : formel/classique. Barre fine sombre, bandeau
      // de tableau gris à texte encre, zebra discret, TOTAL en boîte bordée accent.
      return {
        useSerif: false, headerFull: false,
        headerBg: rgb(0.07, 0.07, 0.07), headerH: 6,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.985, 0.985, 0.985),
        thBg: rgb(0.97, 0.97, 0.97), thText: rgb(0.07, 0.07, 0.07),
        totalBg: rgb(1, 1, 1),
        totalValueColor: (a: RGB) => a,
        dividerColor: rgb(0.8, 0.8, 0.8),
        sectionBoxBg: rgb(0.975, 0.975, 0.975),
        totalStyle: 'boxed',
      };
    default:
      return {
        useSerif: false, headerFull: false,
        headerBg: accent,
        headerH: 6,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.98, 0.98, 0.99),
        thBg: rgb(0.96, 0.96, 0.97), thText: rgb(0.42, 0.45, 0.5),
        totalBg: rgb(0.067, 0.067, 0.067),
        totalValueColor: () => accent,
        dividerColor: rgb(0.91, 0.91, 0.93),
        sectionBoxBg: rgb(0.973, 0.973, 0.98),
      };
  }
}

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generateInvoicePdfBuffer(invoice: any, profile: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // APEX (anti-AI-slop) — Police Inter embarquée (TTF via @pdf-lib/fontkit) pour
  // une cohérence web = PDF. Fini Helvetica/TimesRoman. 3 graisses : Regular, Bold,
  // Black (Black réservé au TOTAL TTC pour l'impact héroïque).
  pdfDoc.registerFontkit(fontkit);
  const reg = await pdfDoc.embedFont(loadFont('Inter-Regular.ttf'));
  const bold = await pdfDoc.embedFont(loadFont('Inter-Bold.ttf'));
  const black = await pdfDoc.embedFont(loadFont('Inter-Black.ttf'));
  const titleFont = bold;     // titres (label doc, société, label total) en Inter Bold
  const accentHero = black;   // TOTAL TTC en Inter Black (impact)

  const templateId: number = Number(profile?.template_id ?? 1);
  const accentHex: string = profile?.accent_color || '#10b981';
  const accent = hexToRgb(accentHex);
  const style = getStyle(templateId, accent);

  const ink = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.42, 0.45, 0.50);
  const subtle = style.dividerColor;
  const white = rgb(1, 1, 1);

  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0).replace(/\u202F/g, ' ');
  const fmtDate = (s: string) => {
    try {
      const d = new Date(s);
      const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return String(s); }
  };

  const DOC_LABELS: Record<string, string> = {
    invoice: 'FACTURE', quote: 'DEVIS', credit_note: 'AVOIR',
    purchase_order: 'BON DE COMMANDE', delivery_note: 'BON DE LIVRAISON',
    deposit: "FACTURE D'ACOMPTE",
  };
  const docLabel = DOC_LABELS[invoice.document_type] || 'FACTURE';
  const senderName = safe(profile?.company_name || 'Mon Entreprise');
  const clientName = safe(invoice.client?.name || invoice.client_name_override || 'Client');
  const items: any[] = invoice.items || [];

  const logoImage = profile?.logo_url ? await fetchAndEmbedImage(pdfDoc, profile.logo_url) : null;

  const W = 595.28, H = 841.89;
  const margin = 44;
  const contentW = W - margin * 2;
  const minY = 70;

  let page = pdfDoc.addPage([W, H]);
  let y = H;

  const needPage = () => {
    if (y > minY) return;
    page = pdfDoc.addPage([W, H]);
    if (style.bodyBg.red < 0.99) {
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
    }
    y = H - 40;
  };

  // Body background
  if (style.bodyBg.red < 0.99) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HEADER + LOGO ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (style.headerFull) {
    // Full coloured header band — TALLER to fit the logo inside
    page.drawRectangle({ x: 0, y: H - style.headerH, width: W, height: style.headerH, color: style.headerBg });

    // ── Logo inside the header (top-left, BIG) ──
    if (logoImage) {
      // CIBLE 2 — logo allégé (60 au lieu de 70) pour un en-tête moins massif.
      const maxLogoH = 60;
      const maxLogoW = 220;
      const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
      page.drawImage(logoImage, {
        x: margin,
        y: H - 16 - dims.height,
        width: dims.width,
        height: dims.height,
      });
    }

    // TITAN (CIBLE contraste) — tous les textes de la bande d'en-tête sont calculés
    // contre headerBg (qui vaut l'accent utilisateur pour les templates 3 & 8).
    // bestTextOn garantit du noir OU du blanc selon la luminance du fond : le SIRET,
    // l'adresse et les infos légales restent lisibles quelle que soit la couleur
    // choisie (fini le gris sur fond vert ou le blanc sur jaune clair).
    const headerText = bestTextOn(style.headerBg);

    // Doc label — right side
    rightText(page, docLabel, W - margin, H - 28, 9, titleFont, headerText);

    // Dates — right side, below doc label
    rightText(page, `Émis le ${fmtDate(invoice.issue_date)}`, W - margin, H - 46, 8.5, reg, headerText);
    if (invoice.due_date) {
      rightText(page, `Échéance : ${fmtDate(invoice.due_date)}`, W - margin, H - 60, 8.5, bold, headerText);
    }

    // Company name below logo area (inside header, bottom-left)
    if (!logoImage) {
      drawText(page, senderName, margin, H - 50, 14, titleFont, headerText);
    }
    if (profile?.siret) {
      drawText(page, `SIRET : ${safe(profile.siret)}`, margin, H - style.headerH + 12, 7, reg, headerText);
    }

    y = H - style.headerH - 20;

  } else {
    // Thin accent bar (templates 1, 4)
    page.drawRectangle({ x: 0, y: H - style.headerH, width: W, height: style.headerH, color: accent });
    y = H - style.headerH - 10;

    // ── Logo below thin bar, top-left, BIG ──
    if (logoImage) {
      const maxLogoH = 80;
      const maxLogoW = 240;
      const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
      page.drawImage(logoImage, {
        x: margin,
        y: y - dims.height,
        width: dims.width,
        height: dims.height,
      });
      y -= dims.height + 14;
    }

    // Doc label + dates — right side
    const infoX = W - margin;
    // TITAN (CIBLE contraste) — libellés en accent sur fond clair : accent conservé
    // s'il passe AA, sinon assombri (legibleAccentOn) pour rester lisible.
    const accentOnBody = legibleAccentOn(style.bodyBg, accent);
    drawText(page, safe(docLabel), infoX - 150, y + 50, 10, titleFont, accentOnBody);
    const dateStr = fmtDate(invoice.issue_date);
    drawText(page, `Émis le ${dateStr}`, infoX - 150, y + 34, 8.5, reg, muted);
    if (invoice.due_date) {
      drawText(page, `Échéance : ${fmtDate(invoice.due_date)}`, infoX - 150, y + 18, 8.5, bold, accentOnBody);
    }

    // Company name if no logo
    if (!logoImage) {
      drawText(page, senderName, margin, y, 18, titleFont, ink);
      y -= 24;
    }

    y -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SENDER + CLIENT INFO ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const halfX = W / 2 + 10;
  let ly = y;
  let ry = y;

  // ATELIER (CIBLE 1) — hiérarchie stricte : ÉMETTEUR (gauche) / FACTURÉ À (droite).
  // Le nom de l'entreprise n'est répété dans le corps QUE si l'en-tête affiche le
  // logo (et donc pas le nom). Sinon le nom est déjà dans la bande d'en-tête : on
  // évite la duplication qui le faisait apparaître « au milieu » du document.
  drawText(page, 'ÉMETTEUR', margin, ly, 7, bold, legibleAccentOn(style.bodyBg, accent));
  ly -= 14;
  if (logoImage) {
    drawText(page, senderName, margin, ly, 10, bold, ink, halfX - margin - 16);
    ly -= 13;
  }
  if (profile?.address) { drawText(page, safe(profile.address), margin, ly, 8.5, reg, muted, halfX - margin - 16); ly -= 12; }
  if (profile?.postal_code || profile?.city) {
    drawText(page, safe([profile.postal_code, profile.city].filter(Boolean).join(' ')), margin, ly, 8.5, reg, muted); ly -= 12;
  }
  if (profile?.phone) { drawText(page, safe(profile.phone), margin, ly, 8.5, reg, muted); ly -= 12; }
  if (profile?.email) { drawText(page, safe(profile.email), margin, ly, 8.5, reg, muted); ly -= 12; }

  // Client (right)
  // OVERLORD (CIBLE 6) — fusionner les colonnes plates (client libre/non lié en
  // base) dans l'objet client avant de dessiner, sinon SIRET/TVA/adresse
  // n'apparaissent jamais sur le PDF bien qu'ils soient persistés.
  const client: any = invoice.client ? { ...invoice.client } : {};
  for (const [prop, flat] of [
    ['siret', 'client_siret'],
    ['vat_number', 'client_vat_number'],
    ['address', 'client_address'],
    ['city', 'client_city'],
    ['postal_code', 'client_postal_code'],
    ['email', 'client_email'],
    ['phone', 'client_phone'],
  ] as Array<[string, string]>) {
    const v = (invoice as any)[flat];
    if (v) client[prop] = v;
  }
  const clientBoxX = halfX;
  const clientBoxW = W - margin - halfX;

  // Calculate dynamic box height based on actual content
  let clientFieldCount = 0;
  if (client?.address) clientFieldCount++;
  if (client?.postal_code || client?.city) clientFieldCount++;
  if (client?.email) clientFieldCount++;
  if (client?.siret) clientFieldCount++;
  if (client?.vat_number) clientFieldCount++;
  if (client?.phone) clientFieldCount++;
  const clientBoxH = 40 + clientFieldCount * 12;

  // Client card background — adapts to content, uses template colors (CIBLE 2 : arrondi)
  drawRoundedRect(page, { x: clientBoxX - 8, y: ry - clientBoxH + 4, width: clientBoxW + 16, height: clientBoxH, radius: 8, color: style.sectionBoxBg, borderColor: style.dividerColor, borderWidth: 0.5 });
  // Accent bar on left of client card
  page.drawRectangle({ x: clientBoxX - 8, y: ry - clientBoxH + 4, width: 3, height: clientBoxH, color: accent });

  drawText(page, 'FACTURÉ À', clientBoxX, ry - 4, 7, bold, legibleAccentOn(style.bodyBg, accent));
  drawText(page, clientName, clientBoxX, ry - 18, 10, bold, ink, clientBoxW);
  ry -= 28;
  if (client?.address) { drawText(page, safe(client.address), clientBoxX, ry, 8.5, reg, muted, clientBoxW); ry -= 12; }
  if (client?.postal_code || client?.city) {
    drawText(page, safe([client.postal_code, client.city].filter(Boolean).join(' ')), clientBoxX, ry, 8.5, reg, muted); ry -= 12;
  }
  if (client?.email) { drawText(page, safe(client.email), clientBoxX, ry, 8.5, reg, muted, clientBoxW); ry -= 12; }
  if (client?.siret) { drawText(page, `SIRET : ${safe(client.siret)}`, clientBoxX, ry, 7.5, reg, muted); ry -= 12; }
  if (client?.vat_number) { drawText(page, `TVA : ${safe(client.vat_number)}`, clientBoxX, ry, 7.5, reg, muted); ry -= 12; }
  if (client?.phone) { drawText(page, safe(client.phone), clientBoxX, ry, 8.5, reg, muted); ry -= 12; }

  y = Math.min(ly, ry) - 16;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: subtle });
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── TABLE ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const col = {
    desc: margin,
    qty: margin + contentW * 0.54,
    price: margin + contentW * 0.66,
    vat: margin + contentW * 0.79,
    total: margin + contentW * 0.90,
  };
  const rightEdge = W - margin;

  // Table header
  const thH = 24;
  page.drawRectangle({ x: margin, y: y - thH + 6, width: contentW, height: thH, color: style.thBg });
  // TITAN (CIBLE contraste) — couleur de texte d'en-tête de tableau garantie lisible :
  //   • fond = accent (AUDACE)         → noir/blanc strict (bestTextOn)
  //   • texte = accent sur fond clair  → accent assombri si besoin (legibleAccentOn)
  //   • couleurs fixes délibérées      → inchangées (gris/vert sur fond foncé)
  const thText = sameColor(style.thBg, accent)
    ? bestTextOn(style.thBg)
    : sameColor(style.thText, accent)
      ? legibleAccentOn(style.thBg, accent)
      : style.thText;
  const thY = y - 10;
  drawText(page, 'PRESTATION / DESCRIPTION', col.desc + 8, thY, 7, bold, thText);
  rightText(page, 'QTÉ', col.price - 8, thY, 7, bold, thText);
  rightText(page, 'P.U. HT', col.vat - 8, thY, 7, bold, thText);
  rightText(page, 'TVA', col.total - 8, thY, 7, bold, thText);
  rightText(page, 'TOTAL HT', rightEdge - 8, thY, 7, bold, thText);
  y -= thH;

  // Item rows
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowH = 26;

    needPage();

    const rowBg = i % 2 === 0 ? style.rowEven : style.rowOdd;
    if (rowBg.red < 0.99 || rowBg.green < 0.99 || rowBg.blue < 0.99) {
      page.drawRectangle({ x: margin, y: y - rowH + 6, width: contentW, height: rowH, color: rowBg });
    }

    const tdY = y - 12;
    const descW = col.qty - col.desc - 14;
    drawText(page, safe(item.description || ''), col.desc + 8, tdY, 9, reg, ink, descW);
    rightText(page, String(item.quantity ?? 1), col.price - 8, tdY, 9, reg, muted);
    rightText(page, fmt(item.unit_price ?? 0), col.vat - 8, tdY, 9, reg, muted);
    rightText(page, `${item.vat_rate ?? 0}%`, col.total - 8, tdY, 9, reg, muted);
    rightText(page, fmt(item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0)), rightEdge - 8, tdY, 9, bold, ink);

    y -= rowH;
  }

  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: subtle });
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── TOTALS ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const totW = 210;
  const totX = W - margin - totW;
  const totRight = W - margin;

  const totRow = (label: string, value: string, isFinal = false) => {
    needPage();
    if (isFinal) {
      const ts = style.totalStyle || 'bar';
      if (ts === 'flat') {
        // ATELIER (CIBLE 4) — PUR : total à plat (filet accent + grand chiffre).
        // SAGE (CIBLE 1) — valeur en couleur lisible (noir/blanc/accent) selon le fond.
        page.drawLine({ start: { x: totX - 12, y: y + 4 }, end: { x: totRight, y: y + 4 }, thickness: 1.2, color: accent });
        drawText(page, label, totX - 4, y - 8, 9, titleFont, muted);
        rightText(page, value, totRight, y - 14, 20, accentHero, bestTextOn(style.bodyBg, accent));
        y -= 34;
      } else if (ts === 'boxed') {
        // ATELIER (CIBLE 4) — ÉLÉGANCE : boîte claire bordée accent (CIBLE 2 : arrondi).
        // SAGE (CIBLE 1) — valeur en couleur lisible sur fond blanc.
        const boxH = 34;
        const boxBg = rgb(1, 1, 1);
        drawRoundedRect(page, { x: totX - 12, y: y - boxH + 8, width: totW + 12, height: boxH, radius: 8, color: boxBg, borderColor: accent, borderWidth: 1 });
        drawText(page, label, totX - 4, y - 8, 9, titleFont, muted);
        rightText(page, value, totRight, y - 10, 16, accentHero, bestTextOn(boxBg, accent));
        y -= boxH + 6;
      } else {
        // 'bar' (templates 1-6) ou 'card' (AUDACE) : bande pleine couleur totalBg (CIBLE 2 : arrondi).
        // SAGE (CIBLE 1) — texte (label + valeur) en couleur lisible selon la luminance du fond,
        // pour qu'un accent clair ne rende jamais le TOTAL illisible.
        const boxH = 34;
        drawRoundedRect(page, { x: totX - 12, y: y - boxH + 8, width: totW + 12, height: boxH, radius: 8, color: style.totalBg });
        const totalFg = bestTextOn(style.totalBg, accent);
        drawText(page, label, totX - 4, y - 8, 9, titleFont, totalFg);
        rightText(page, value, totRight, y - 10, 16, accentHero, totalFg);
        y -= boxH + 6;
      }
    } else {
      drawText(page, label, totX, y, 8.5, reg, muted);
      rightText(page, value, totRight, y, 8.5, bold, ink);
      y -= 15;
    }
  };

  totRow('Sous-total HT', fmt(invoice.subtotal ?? 0));
  totRow('TVA', fmt(invoice.vat_amount ?? 0));
  if ((invoice.discount_amount ?? 0) > 0) {
    totRow(`Remise (${invoice.discount_percent ?? 0}%)`, `-${fmt(invoice.discount_amount)}`);
  }
  y -= 4;
  totRow('TOTAL TTC', fmt(invoice.total ?? 0), true);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── VALIDITY / DOC-TYPE MENTIONS (hors factures & acomptes) ─────────────
  // PROMETHEUS (CIBLE 7) — chaque type de document porte ses mentions propres.
  // Les factures & acomptes ont leur bloc CONDITIONS DE PAIEMENT dédié plus bas.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    let validity = '';
    if (invoice.document_type === 'quote') {
      validity = "Devis valable 30 jours à compter de la date d'émission. Acceptation par signature électronique ou versement d'un acompte. Prix exprimés en euros (€), hors taxe sauf mention contraire.";
    } else if (invoice.document_type === 'credit_note') {
      validity = "Avoir relatif à la facture d'origine. Le présent avoir annule tout ou partie de la facture susvisée, conformément à l'article L.441-9 du Code de commerce.";
    } else if (invoice.document_type === 'purchase_order') {
      validity = "Bon de commande. L'acceptation par le vendeur vaut contrat de vente aux conditions définies ci-dessus.";
    } else if (invoice.document_type === 'delivery_note') {
      validity = "Bon de livraison. La marchandise a été réceptionnée conformément au présent document.";
    }
    if (validity) {
      needPage();
      y -= 8;
      const vMaxW = contentW - 20;
      const vLineH = 12;
      const vlines = wrapLines(validity, vMaxW, 8.5, bold);
      const vboxH = vlines * vLineH + 16;
      if (y - vboxH < minY) {
        page = pdfDoc.addPage([W, H]);
        if (style.bodyBg.red < 0.99) page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
        y = H - 40;
      }
      const vboxBottom = y - vboxH;
      drawRoundedRect(page, { x: margin, y: vboxBottom, width: contentW, height: vboxH, radius: 8, color: style.sectionBoxBg });
      page.drawRectangle({ x: margin, y: vboxBottom, width: 3, height: vboxH, color: accent });
      y -= 15;
      y = drawWrapped(page, safe(validity), margin + 10, y, vMaxW, 8.5, bold, ink, vLineH, vboxBottom + 8);
      y = vboxBottom - 10;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT LINK ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // INSPECTOR (BUG 2 + BUG 3) — résolveur unique : url vide si lien stale (aucun
  // QR obsolète), provider lu depuis payment_provider (source de vérité), repli
  // legacy pour les lignes pré-migration. Voir lib/payment-link.ts.
  const { resolvePaymentLink } = await import('./payment-link');
  const resolvedPayment = resolvePaymentLink(invoice as any);
  const paymentUrl = resolvedPayment.url;
  const providerName = resolvedPayment.provider === 'stripe' ? 'Stripe' : resolvedPayment.provider === 'sumup' ? 'SumUp' : '';

  // PROMETHEUS (CIBLE 6) — QR de paiement JAMAIS sur un devis / bon de commande
  // / bon de livraison / avoir : ces documents ne sont pas payables en ligne.
  // Factures & acomptes uniquement (l'acompte est bien exigible → lien de paiement).
  if (paymentUrl && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')) {
    // ATELIER (CIBLE 2 & 3) — URL courte préférée pour le QR (payload ~35 chars →
    // code moins dense) ET pour le lien cliquable. Repli sur l'URL provider si la
    // facture n'a pas encore de token (legacy non backfillé).
    const { buildShortPayUrl } = await import('./pay-token');
    const displayUrl = buildShortPayUrl(invoice.payment_short_token) || paymentUrl;

    // QR code — payload = URL courte. Params conformes ISO 18004 (margin 4, EC 'L').
    let qrImage: any = null;
    try {
      const { generateQrBuffer } = await import('./qr-generate');
      const qrBuffer = await generateQrBuffer(displayUrl);
      if (qrBuffer && qrBuffer.length > 0) qrImage = await pdfDoc.embedPng(qrBuffer);
    } catch (qrErr) {
      console.error('[pdf-server] QR buffer embed failed:', (qrErr as Error).message);
    }
    if (!qrImage) {
      try {
        const { generateQrDataUrl } = await import('./qr-generate');
        const dataUrl = await generateQrDataUrl(displayUrl);
        if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
          qrImage = await pdfDoc.embedPng(Buffer.from(dataUrl.replace('data:image/png;base64,', ''), 'base64'));
        }
      } catch (fallbackErr) {
        console.error('[pdf-server] QR data-URL fallback failed:', (fallbackErr as Error).message);
      }
    }
    if (!qrImage) {
      console.error('[pdf-server] QR INTROUVABLE — rendu texte seul. URL:', displayUrl.slice(0, 80));
    }

    const qrSize = 64;                  // ≈ 2,26 cm — min ISO 18004 (close range) = 2 cm
    const boxH = qrImage ? 84 : 56;

    // Garde zone footer : on réserve la place, nouvelle page sinon (jamais tronqué).
    if (y - boxH < minY) {
      page = pdfDoc.addPage([W, H]);
      if (style.bodyBg.red < 0.99) page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
      y = H - 40;
    }
    y -= 8;

    const boxBottom = y - boxH;
    drawRoundedRect(page, { x: margin, y: boxBottom, width: contentW, height: boxH, radius: 8, color: mixRgb(accent, 0.08), borderColor: mixRgb(accent, 0.25), borderWidth: 0.5 });
    page.drawRectangle({ x: margin, y: boxBottom, width: 3, height: boxH, color: accent });

    const methodLabel = providerName ? `PAIEMENT EN LIGNE (${providerName.toUpperCase()})` : 'PAIEMENT EN LIGNE';
    drawText(page, methodLabel, margin + 12, y - 14, 7, bold, accent);

    const btnLabel = providerName ? `Payer ${fmt(invoice.total ?? 0)} avec ${providerName}` : `Payer ${fmt(invoice.total ?? 0)} en ligne`;
    drawText(page, btnLabel, margin + 12, y - 30, 11, bold, ink);

    // CIBLE 3 — URL affichée ENTIÈRE (courte) + cliquable (annotation sur la zone).
    const urlText = safe(displayUrl);
    const urlY = y - 46;
    const urlMaxW = W - margin - (margin + 12) - (qrImage ? qrSize + 24 : 24);
    drawText(page, urlText, margin + 12, urlY, 7.5, reg, accent, urlMaxW);
    const urlW = Math.min(reg.widthOfTextAtSize(urlText, 7.5), urlMaxW);
    addLinkAnnotation(page, margin + 12, urlY - 2, urlW, 12, displayUrl);

    if (qrImage) {
      drawText(page, 'Scannez pour payer :', margin + 12, y - 62, 7, reg, muted);
      const qrX = W - margin - qrSize - 14;
      const qrY = boxBottom + (boxH - qrSize) / 2;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      // CIBLE 3 — le QR lui-même est cliquable.
      addLinkAnnotation(page, qrX, qrY, qrSize, qrSize, displayUrl);
    } else {
      // Repli texte : URL centrée, cliquable sur toute la largeur.
      centreText(page, urlText, margin, contentW, y - 50, 7.5, reg, accent);
      addLinkAnnotation(page, margin, y - 54, contentW, 14, displayUrl);
    }

    y = boxBottom - 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── NOTES ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (invoice.notes) {
    needPage();
    y -= 8;
    // Box background
    const notesH = 30;
    drawRoundedRect(page, { x: margin, y: y - notesH, width: contentW, height: notesH + 14, radius: 8, color: style.sectionBoxBg });
    drawText(page, 'Notes', margin + 10, y, 8, bold, ink);
    y -= 13;
    y = drawWrapped(page, safe(invoice.notes), margin + 10, y, contentW - 20, 8.5, reg, muted, 13, minY);
    y -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BANK INFO ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if ((profile?.iban || profile?.bank_name) && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && y > minY + 50) {
    needPage();
    y -= 8;
    // Calculate dynamic bank box height based on content
    let bankFieldCount = 0;
    if (profile.bank_name) bankFieldCount++;
    if (profile.iban) bankFieldCount++;
    if (profile.bic) bankFieldCount++;
    const bankBoxH = 20 + bankFieldCount * 12;
    drawRoundedRect(page, { x: margin, y: y - bankBoxH, width: contentW, height: bankBoxH, radius: 8, color: style.sectionBoxBg, borderColor: style.dividerColor, borderWidth: 0.5 });
    page.drawRectangle({ x: margin, y: y - bankBoxH, width: 3, height: bankBoxH, color: accent });

    drawText(page, 'COORDONNÉES BANCAIRES', margin + 12, y - 6, 7, bold, accent);
    let by = y - 20;
    if (profile.bank_name) { drawText(page, `Banque : ${safe(profile.bank_name)}`, margin + 12, by, 8.5, reg, ink); by -= 12; }
    if (profile.iban) { drawText(page, `IBAN : ${safe(profile.iban)}`, margin + 12, by, 8.5, reg, ink); by -= 12; }
    if (profile.bic) { drawText(page, `BIC : ${safe(profile.bic)}`, margin + 12, by, 8.5, reg, ink); }
    y -= bankBoxH + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT TERMS (factures & acomptes uniquement) ──────────────────────
  // PROMETHEUS (CIBLE 1 + CIBLE 7) — résolveur unique (lib/payment-terms.ts).
  //   • CIBLE 1 : le terme est lu depuis invoice.payment_terms (termId sémantique)
  //     au lieu de toujours afficher « 30 jours ». Repli sur profiles.payment_terms
  //     pour les vieilles factures (colonne absente avant migration 20260620000005).
  //   • CIBLE 7 : ce bloc légal (indemnité 40 €, pénalités, CGV) ne concerne QUE
  //     les factures et acomptes — JAMAIS un devis / bon de commande / avoir.
  //   • Fix overlap : titleH 24 (était 18) — le titre dessiné à y-13 ne chevauche
  //     plus la 1re ligne du drawWrapped.
  // ═══════════════════════════════════════════════════════════════════════════

  if (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') {
    const termsText = resolveTermsText(invoice.payment_terms ?? profile?.payment_terms ?? null);
    if (termsText) {
      const termsMaxW = contentW - 20;
      const termsLineH = 12;
      const lines = wrapLines(termsText, termsMaxW, 8, reg);
      const titleH = 24; // CIBLE 1 — fix chevauchement titre/contenu (était 18)
      const boxH = titleH + lines * termsLineH + 10;

      // Garde zone footer : pas la place → nouvelle page (le bloc est toujours rendu).
      if (y - boxH < minY) {
        page = pdfDoc.addPage([W, H]);
        if (style.bodyBg.red < 0.99) page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
        y = H - 40;
      }

      const boxBottom = y - boxH;
      drawRoundedRect(page, { x: margin, y: boxBottom, width: contentW, height: boxH, radius: 8, color: style.sectionBoxBg });
      page.drawRectangle({ x: margin, y: boxBottom, width: 3, height: boxH, color: accent });
      drawText(page, 'CONDITIONS DE PAIEMENT', margin + 10, y - 13, 7.5, bold, accent);
      y -= titleH;
      y = drawWrapped(page, safe(termsText), margin + 10, y, termsMaxW, 8, reg, muted, termsLineH, boxBottom + 8);
      y = boxBottom - 10;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── LEGAL MENTION ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // PROMETHEUS (CIBLE 7) — mentions légales adaptées au type de document.
    // Les « pénalités de retard / indemnité 40 € » et la mention « double
    // exemplaire » ne concernent QUE les factures & acomptes. La mention
    // e-invoicing (Factur-X) s'applique aux factures, avoirs et acomptes.
    const dt = invoice.document_type;
    const defaultLegalParts: string[] = [];
    if (profile?.siret) defaultLegalParts.push(`SIRET : ${safe(profile.siret)}`);
    if (profile?.vat_number) defaultLegalParts.push(`TVA : ${safe(profile.vat_number)}`);
    if (profile?.legal_status === 'auto-entrepreneur') { defaultLegalParts.push("Dispense d'immatriculation au RCS et au RM"); defaultLegalParts.push('TVA non applicable, art. 293 B du CGI'); }
    if (dt === 'invoice' || dt === 'deposit') {
      defaultLegalParts.push('Pénalités de retard : 3× taux légal — Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L.441-6 c. com.)');
      defaultLegalParts.push("Conformément à l'article L.441-9 du Code de commerce, la facture est émise en double exemplaire.");
    }
    if (dt === 'invoice' || dt === 'credit_note' || dt === 'deposit') {
      defaultLegalParts.push('Facture électronique conforme à la loi française 2026 — Format Factur-X (EN 16931) — Transmise via PDP agréée');
    }
    const legalText = profile?.legal_mention || defaultLegalParts.join(' - ');
    if (legalText && y > minY + 30) {
      needPage();
      y -= 4;
      y = drawWrapped(page, safe(legalText), margin, y, contentW, 7, reg, muted, 10, minY);
      y -= 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── FOOTER — Invoice number + company info ───────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const footerY = 30;

  // Accent line
  page.drawLine({ start: { x: margin, y: footerY + 34 }, end: { x: W - margin, y: footerY + 34 }, thickness: 1.5, color: mixRgb(accent, 0.35) });

  // Invoice number — BIG and centered at bottom
  centreText(page, safe(invoice.number), 0, W, footerY + 18, 13, bold, ink);

  // Company info footer
  const parts: string[] = [senderName];
  if (profile?.siret) parts.push(`SIRET : ${safe(profile.siret)}`);
  if (profile?.legal_status === 'auto-entrepreneur') parts.push('TVA non applicable, art. 293 B du CGI');
  const footerStr = parts.join('  |  ');
  centreText(page, footerStr, 0, W, footerY + 4, 6.5, reg, muted);

  return pdfDoc.save();
}
