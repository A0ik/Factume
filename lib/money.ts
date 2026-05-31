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
  if (discountPct <= 0) return 0;
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
  discount_percent?: number;
}

export function calculateInvoiceTotals(items: InvoiceItem[], globalDiscountPct: number = 0) {
  let subtotalAfterLineDiscountsCents = 0;
  let totalVatCents = 0;

  for (const item of items) {
    const lineTotalCents = multiplyCents(item.quantity, item.unit_price);
    const lineDiscCents = discountCents(lineTotalCents, item.discount_percent || 0);
    const lineNetCents = lineTotalCents - lineDiscCents;
    subtotalAfterLineDiscountsCents += lineNetCents;

    const afterGlobalDiscCents = globalDiscountPct > 0
      ? lineNetCents - discountCents(lineNetCents, globalDiscountPct)
      : lineNetCents;
    totalVatCents += vatCents(afterGlobalDiscCents, item.vat_rate);
  }

  const globalDiscountAmountCents = discountCents(subtotalAfterLineDiscountsCents, globalDiscountPct);
  const discountedSubtotalCents = subtotalAfterLineDiscountsCents - globalDiscountAmountCents;
  const finalTotalCents = discountedSubtotalCents + totalVatCents;

  return {
    subtotal: roundMoney(fromCents(discountedSubtotalCents)),
    vatAmount: roundMoney(fromCents(totalVatCents)),
    discountAmount: roundMoney(fromCents(globalDiscountAmountCents)),
    total: roundMoney(fromCents(finalTotalCents)),
  };
}
