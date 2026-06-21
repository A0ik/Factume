// ---------------------------------------------------------------------------
// TVA (VAT) Validation & Correction Module
// Ensures HT + TVA_amount = TTC consistency across invoice line items
// Fixes the bug where AI subtracts TVA instead of adding it
// ---------------------------------------------------------------------------

import { roundMoney } from '@/lib/money';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  // Computed:
  total_ht?: number;
  total_ttc?: number;
  vat_amount?: number;
}

export interface TVACorrection {
  index: number;
  field: string;
  original: number;
  corrected: number;
}

export interface ValidationResult {
  corrected: boolean;
  items: InvoiceItem[];
  corrections: TVACorrection[];
}

// ---------------------------------------------------------------------------
// Main: Validate and correct TVA calculations
// ---------------------------------------------------------------------------

/**
 * Validates and corrects TVA calculations for invoice line items.
 *
 * For each item, it computes:
 *   - total_ht = quantity * unit_price
 *   - vat_amount = total_ht * (vat_rate / 100)
 *   - total_ttc = total_ht + vat_amount
 *
 * If the item already carries total_ht / total_ttc / vat_amount, those are
 * cross-checked and silently corrected when they don't match the formula.
 *
 * The function also handles the edge case where the AI returns TTC instead of
 * HT (e.g. "300 ht 10% tva" being misinterpreted as TTC=270 instead of TTC=330).
 */
export function validateAndCorrectTVA(items: InvoiceItem[]): ValidationResult {
  const corrections: TVACorrection[] = [];
  const correctedItems: InvoiceItem[] = items.map((rawItem, index) => {
    // Shallow clone to avoid mutating the original
    const item: InvoiceItem = { ...rawItem };

    // --- Compute expected values from base fields ---
    const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1;
    const unitPrice = typeof item.unit_price === 'number' && Number.isFinite(item.unit_price) ? item.unit_price : 0;
    const vatRate = typeof item.vat_rate === 'number' && Number.isFinite(item.vat_rate) ? item.vat_rate : 20;

    const expectedTotalHT = roundMoney(quantity * unitPrice);
    const expectedVatAmount = roundMoney(expectedTotalHT * (vatRate / 100));
    const expectedTotalTTC = roundMoney(expectedTotalHT + expectedVatAmount);

    // --- Validate / correct total_ht ---
    if (item.total_ht !== undefined && item.total_ht !== null) {
      const providedHT = Number(item.total_ht);
      if (Number.isFinite(providedHT) && Math.abs(providedHT - expectedTotalHT) > 0.01) {
        corrections.push({
          index,
          field: 'total_ht',
          original: providedHT,
          corrected: expectedTotalHT,
        });
      }
    }
    item.total_ht = expectedTotalHT;

    // --- Validate / correct vat_amount ---
    if (item.vat_amount !== undefined && item.vat_amount !== null) {
      const providedVat = Number(item.vat_amount);
      if (Number.isFinite(providedVat) && Math.abs(providedVat - expectedVatAmount) > 0.01) {
        corrections.push({
          index,
          field: 'vat_amount',
          original: providedVat,
          corrected: expectedVatAmount,
        });
      }
    }
    item.vat_amount = expectedVatAmount;

    // --- Validate / correct total_ttc ---
    // This is the critical fix: AI sometimes computes TTC = HT - TVA instead of HT + TVA
    if (item.total_ttc !== undefined && item.total_ttc !== null) {
      const providedTTC = Number(item.total_ttc);
      if (Number.isFinite(providedTTC) && Math.abs(providedTTC - expectedTotalTTC) > 0.01) {
        corrections.push({
          index,
          field: 'total_ttc',
          original: providedTTC,
          corrected: expectedTotalTTC,
        });
      }
    }
    item.total_ttc = expectedTotalTTC;

    // --- Ensure base fields are valid numbers in the item ---
    item.quantity = quantity;
    item.unit_price = unitPrice;
    item.vat_rate = vatRate;

    return item;
  });

  return {
    corrected: corrections.length > 0,
    items: correctedItems,
    corrections,
  };
}

// ---------------------------------------------------------------------------
// B2C Detection
// ---------------------------------------------------------------------------

/**
 * Company-name indicators that suggest a B2B relationship.
 * CIBLE 3 (AEGIS) — enrichi : formes juridiques FR/intl + noms de commerces
 * et d'activités typiques (café, garage, pharmacie…) pour ne plus rater les
 * clients entreprise au nom « marque » (ex : « Café Croissant »).
 */
const COMPANY_INDICATORS = [
  // Formes juridiques françaises
  /soci[eé]t[eé]/i,
  /entreprise/i,
  /s\.?a\.?(r\.?l\.?)?/i,
  /e\.?u\.?r\.?l\.?/i,
  /s\.?a\.?s/i,
  /sasu/i,
  /eirl/i,
  /s\.?c\.?i/i,
  /s\.?c\.?o\.?p/i,
  /s\.?n\.?c/i,
  /s\.?c\.?p/i,
  /s\.?c\.?a/i,
  /auto[\s-]?entrepreneu/i,
  /micro[\s-]?entreprise/i,
  /holding/i,
  /\bgroup\b/i,
  // Formes étrangères
  /ltd/i,
  /inc\./i,
  /gmbh/i,
  /corp\./i,
  /\bllc\b/i,
  // Activités de services / bureaux
  /agence/i,
  /agenc/i,
  /startup/i,
  /cabinet/i,
  /bureau/i,
  /conseil/i,
  /consulting/i,
  /studio/i,
  /clinique/i,
  /institut/i,
  /kin[eé]/i,
  /coiff/i,
  // Commerces & activités (signal B2B fort en France)
  /restaurant/i,
  /\bresto\b/i,
  /bistr(o|ot)/i,
  /brasserie/i,
  /caf[eé]/i,
  /boulangerie/i,
  /pâtisserie/i,
  /boucherie/i,
  /pharmacie/i,
  /garage/i,
  /h[oô]tel/i,
  /boutique/i,
  /magasin/i,
  /commerce/i,
  /marchand/i,
  /atelier/i,
  /usine/i,
  /transport/i,
  /\btaxi\b/i,
];

/**
 * Detects whether a client is an individual (B2C) rather than a business (B2B).
 * Returns true when:
 *  - No SIRET is provided
 *  - No company-name indicators are found in the client name or address
 */
export function isB2CClient(client: {
  name?: string | null;
  siret?: string | null;
  address?: string | null;
}): boolean {
  // If SIRET is provided, it's a business
  if (client.siret && typeof client.siret === 'string' && /^\d{14}$/.test(client.siret.trim())) {
    return false;
  }

  // Check for company indicators in the name
  const nameToCheck = client.name || '';
  const addressToCheck = client.address || '';
  const combinedText = `${nameToCheck} ${addressToCheck}`.trim();

  for (const pattern of COMPANY_INDICATORS) {
    if (pattern.test(combinedText)) {
      return false;
    }
  }

  // No SIRET and no company indicators => likely an individual
  return nameToCheck.length > 0;
}

/**
 * ATELIER (e-invoicing / réforme FR 2026) — Une facture doit-elle être transmise
 * électroniquement via la PA (SuperPDP) ?
 *
 * RÈGLE OFFICIELLE : SEUL le B2B (client assujetti = entreprise) est soumis à la
 * facturation électronique (POST /invoices). Le B2C (particulier) relève de
 * l'e-reporting (endpoints SuperPDP /b2c_*), JAMAIS de /invoices.
 *
 * Source de vérité unique : SIRET client (14 chiffres) ou indicateurs d'entreprise,
 * via isB2CClient() — le même détecteur que le flux voix. On accepte aussi un
 * client_type explicite ('b2b'/'business' vs 'b2c'/'individual') comme fast-path
 * pour la cohérence avec l'existant, mais le SIRET reste l'autorité.
 */
export interface B2BInvoiceLike {
  client_type?: string | null;
  client?: { name?: string | null; siret?: string | null; address?: string | null; client_type?: string | null } | null;
  client_name_override?: string | null;
  client_siret?: string | null;
  client_address?: string | null;
}

export function isInvoiceB2B(invoice: B2BInvoiceLike | null | undefined): boolean {
  if (!invoice) return false;
  const ct = invoice.client_type || invoice.client?.client_type;
  if (ct === 'b2b' || ct === 'business') return true;
  if (ct === 'b2c' || ct === 'individual') return false;
  // Sinon : détection par SIRET / nom d'entreprise (signal fiable de la réforme).
  const name = invoice.client_name_override || invoice.client?.name || null;
  const siret = invoice.client_siret || invoice.client?.siret || null;
  // Conservateur : ni SIRET ni nom → on ne peut pas confirmer le B2B → on ne
  // transmet PAS (mieux vaut s'abstenir que transmettre à tort un cas douteux).
  if (!siret && !name) return false;
  return !isB2CClient({
    name,
    siret,
    address: invoice.client_address || invoice.client?.address || null,
  });
}

/**
 * Returns the default TVA rate based on client type.
 * B2C individuals with no explicit TVA rate get 0% (auto-entrepreneur / franchise de TVA).
 * B2B clients default to 20%.
 */
export function getDefaultTVARate(isB2C: boolean): number {
  return isB2C ? 0 : 20;
}

// ---------------------------------------------------------------------------
// Multilingual Tax Term Detection — Secondary Defense
// ---------------------------------------------------------------------------

/** Terms that indicate the user meant HT (before tax) */
const HT_INDICATORS = [
  /\bht\b/i, /\bhors\s*tax/i, /\bnet\b/i, /\bnetto\b/i,
  /\bsin\s*iva\b/i, /\bohne\s*mwst\b/i, /\bsenza\s*iva\b/i,
  /\bsem\s*iva\b/i, /\bavant\s*tax/i, /\bbefore\s*tax/i,
  /\bexcl\s*tax/i, /\bexclusive\s*of\s*tax/i, /\btax\s*excluded/i,
  /\bexon[eé]r/i, /\bfranchise/i,
];

/** Terms that indicate the user meant TTC (after tax) */
const TTC_INDICATORS = [
  /\bttc\b/i, /\btoutes\s*taxes\s*comprises/i, /\bgross\b/i,
  /\bbrutto\b/i, /\bcon\s*iva\b/i, /\bcom\s*iva\b/i,
  /\binkl\s*mwst/i, /\binclusive\s*tax/i, /\btax\s*included/i,
  /\bwith\s*tax/i, /\btout\s*compris/i, /\blordo\b/i,
];

export interface TranscriptTaxHints {
  mentionsHT: boolean;
  mentionsTTC: boolean;
  originalLanguage: string;
}

/**
 * Detects whether the transcript suggests the user meant HT or TTC.
 * Used as a hint for the secondary validation pass.
 */
export function detectTranscriptTaxHints(transcript: string): TranscriptTaxHints {
  const lower = transcript.toLowerCase();
  let mentionsHT = false;
  let mentionsTTC = false;

  for (const pattern of HT_INDICATORS) {
    if (pattern.test(lower)) { mentionsHT = true; break; }
  }
  for (const pattern of TTC_INDICATORS) {
    if (pattern.test(lower)) { mentionsTTC = true; break; }
  }

  return { mentionsHT, mentionsTTC, originalLanguage: '' };
}

/**
 * Secondary defense: detect the classic AI bug where "300 HT 10%" produces
 * unit_price=270 (TTC - TVA) instead of the correct unit_price=300 (the raw HT amount).
 *
 * Logic: If the user said "net/HT/Netto" but the unit_price equals what you'd get
 * by SUBTRACTING tax from the stated amount (i.e. amount * (1 - rate/100)),
 * that's the bug. Correct it back to the raw stated amount.
 */
export function detectTTCMisinterpretation(
  items: InvoiceItem[],
  hints: TranscriptTaxHints,
): ValidationResult {
  const corrections: TVACorrection[] = [];

  // Only run secondary check if transcript suggests HT was intended
  if (!hints.mentionsHT || hints.mentionsTTC) {
    return { corrected: false, items, corrections };
  }

  const correctedItems = items.map((item, index) => {
    const unitPrice = typeof item.unit_price === 'number' && Number.isFinite(item.unit_price)
      ? item.unit_price : 0;
    const vatRate = typeof item.vat_rate === 'number' && Number.isFinite(item.vat_rate)
      ? item.vat_rate : 20;

    if (unitPrice <= 0 || vatRate <= 0) return item;

    // The AI bug: it interpreted HT amount as TTC and subtracted tax
    // If the user said "300 HT 10%" and AI returned 270, that's 300 * (1 - 0.10) = 270
    // The correct HT should be 300
    const bugPrice = roundMoney(unitPrice / (1 - vatRate / 100));

    // Also check if AI subtracted the tax amount instead of keeping the raw amount
    // 300 - 30 = 270 instead of keeping 300
    const rawAmount = roundMoney(unitPrice / (1 - vatRate / 100));

    // Heuristic: if the raw amount is a round number (typical for human speech)
    // and the unit_price is exactly rawAmount * (1 - vatRate/100), it's the bug
    if (rawAmount > 0 && Number.isFinite(rawAmount)) {
      const isRoundNumber = rawAmount % 1 === 0 && rawAmount >= 10;
      const looksLikeBug = Math.abs(unitPrice - roundMoney(rawAmount * (1 - vatRate / 100))) < 0.02;

      if (isRoundNumber && looksLikeBug && rawAmount !== unitPrice) {
        corrections.push({
          index,
          field: 'unit_price',
          original: unitPrice,
          corrected: rawAmount,
        });

        const corrected = { ...item, unit_price: rawAmount };

        // Recompute computed fields
        const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1;
        corrected.total_ht = roundMoney(quantity * rawAmount);
        corrected.vat_amount = roundMoney(corrected.total_ht * (vatRate / 100));
        corrected.total_ttc = roundMoney(corrected.total_ht + corrected.vat_amount);

        return corrected;
      }
    }

    return item;
  });

  return {
    corrected: corrections.length > 0,
    items: correctedItems,
    corrections,
  };
}
