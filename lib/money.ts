/**
 * Money arithmetic utilities — all calculations use integer cents internally
 * to avoid JavaScript floating-point errors (0.1 + 0.2 !== 0.3).
 */

export function cents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(c: number): number {
  return c / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Multiply quantity × unit_price in cents, return cents */
export function multiplyCents(qty: number, unitPrice: number): number {
  return Math.round(cents(qty) * cents(unitPrice) / 100);
}

/** Apply a percentage discount to a cents amount */
export function discountCents(amountCents: number, discountPct: number): number {
  if (discountPct < 0) {
    console.warn('[money] discountCents: negative discount percent ignored:', discountPct);
    return 0;
  }
  if (discountPct === 0) return 0;
  return Math.round(amountCents * cents(discountPct) / 10000);
}

/** Apply VAT rate to a cents amount */
export function vatCents(amountCents: number, vatRate: number): number {
  return Math.round(amountCents * cents(vatRate) / 10000);
}

/** Calculate full invoice totals from items (all in cents) */
export interface InvoiceItem {
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_percent?: number; // remise ligne en % (0-100)
  discount_amount?: number;  // remise ligne en € (prioritaire si > 0)
}

/** Remise globale : soit en %, soit en € (le € est prioritaire s'il est > 0). */
export interface GlobalDiscount {
  percent?: number;
  amount?: number;
}

/**
 * Calcule les totaux d'une facture en gérant les remises LIGNE (% ou €) et
 * GLOBALE (% ou €). Toute l'arithmétique se fait en centimes entiers pour
 * éviter les erreurs de flottants.
 *
 * @param items lignes (avec discount_percent et/ou discount_amount par ligne)
 * @param globalDiscount remise globale : nombre = %, ou {percent}/{amount}
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  globalDiscount: number | GlobalDiscount = 0,
) {
  // Normalisation de la remise globale
  const gAmountCents =
    typeof globalDiscount === 'object' && globalDiscount?.amount && globalDiscount.amount > 0
      ? cents(globalDiscount.amount)
      : 0;
  const gPercent =
    typeof globalDiscount === 'number'
      ? globalDiscount
      : gAmountCents > 0
        ? 0
        : globalDiscount?.percent ?? 0;

  // 1. HT par ligne après remise ligne (% ou €)
  const lineNetCentsArr: number[] = [];
  let grossSubtotalCents = 0;
  let subtotalAfterLineDiscountsCents = 0;
  let totalLineDiscountCents = 0;

  for (const item of items) {
    const lineTotalCents = multiplyCents(item.quantity, item.unit_price);
    grossSubtotalCents += lineTotalCents;

    let lineDiscCents = 0;
    if (item.discount_amount && item.discount_amount > 0) {
      // Remise ligne en € (plafonnée au montant de la ligne)
      lineDiscCents = Math.min(cents(item.discount_amount), lineTotalCents);
    } else if (item.discount_percent && item.discount_percent > 0) {
      lineDiscCents = discountCents(lineTotalCents, item.discount_percent);
    }
    totalLineDiscountCents += lineDiscCents;

    const lineNetCents = lineTotalCents - lineDiscCents;
    lineNetCentsArr.push(lineNetCents);
    subtotalAfterLineDiscountsCents += lineNetCents;
  }

  // 2. Remise globale (% ou €)
  let globalDiscountAmountCents = 0;
  if (gAmountCents > 0) {
    globalDiscountAmountCents = Math.min(gAmountCents, subtotalAfterLineDiscountsCents);
  } else if (gPercent > 0) {
    globalDiscountAmountCents = discountCents(subtotalAfterLineDiscountsCents, gPercent);
  }
  const discountedSubtotalCents = subtotalAfterLineDiscountsCents - globalDiscountAmountCents;

  // 3. TVA — on répartit la remise globale € proportionnellement sur chaque ligne
  //    pour préserver la justesse par bande de TVA.
  let totalVatCents = 0;
  if (subtotalAfterLineDiscountsCents > 0) {
    for (let i = 0; i < items.length; i++) {
      const share =
        globalDiscountAmountCents > 0
          ? Math.round((globalDiscountAmountCents * lineNetCentsArr[i]) / subtotalAfterLineDiscountsCents)
          : 0;
      const lineNetAfterGlobalCents = lineNetCentsArr[i] - share;
      totalVatCents += vatCents(lineNetAfterGlobalCents, items[i].vat_rate);
    }
  }

  const finalTotalCents = discountedSubtotalCents + totalVatCents;

  return {
    // Sous-total HT NET après toutes les remises (semantic inchangée pour la persistance)
    subtotal: roundMoney(fromCents(discountedSubtotalCents)),
    vatAmount: roundMoney(fromCents(totalVatCents)),
    // Remise globale en € (champ persisté discount_amount)
    discountAmount: roundMoney(fromCents(globalDiscountAmountCents)),
    total: roundMoney(fromCents(finalTotalCents)),
    // Champs supplémentaires pour les breakdowns UI (non cassants)
    grossSubtotal: roundMoney(fromCents(grossSubtotalCents)),
    lineDiscountAmount: roundMoney(fromCents(totalLineDiscountCents)),
  };
}
