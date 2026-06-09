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

/** Company-name indicators that suggest a B2B relationship */
const COMPANY_INDICATORS = [
  /soci[eé]t[eé]/i,
  /entreprise/i,
  /s\.?a\.?(r\.?l\.?)?/i,
  /e\.?u\.?r\.?l\.?/i,
  /s\.?a\.?s/i,
  /s\.?n\.?c/i,
  /s\.?c\.?p/i,
  /ltd/i,
  /inc\./i,
  /gmbh/i,
  /corp\./i,
  /agence/i,
  /startup/i,
  / cabinet /i,
  /bureau/i,
  /conseil/i,
  /consulting/i,
  /studio/i,
  /agenc/i,
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
 * Returns the default TVA rate based on client type.
 * B2C individuals with no explicit TVA rate get 0% (auto-entrepreneur / franchise de TVA).
 * B2B clients default to 20%.
 */
export function getDefaultTVARate(isB2C: boolean): number {
  return isB2C ? 0 : 20;
}
