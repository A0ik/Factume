import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { generatePdfBuffer } from '../pdf-server';
import type { Invoice } from '@/types';

// PROMETHEUS (CIBLE 1/6/7) — tests de non-régression du rendu PDF par type de
// document. Ils verrouillent les comportements réparés cette session et
// protègent le rebuild des templates (CIBLE 2). Reprend le décodeur pdf-lib
// (FlateDecode + hex) du test pdf-qr.

function pdfText(bytes: Uint8Array): string {
  const latin = Buffer.from(bytes).toString('latin1');
  let raw = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin)) !== null) {
    try {
      raw += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n';
    } catch { /* flux non-Flate (image, police) — ignoré */ }
  }
  return raw.replace(/<([0-9A-Fa-f]{2,})>/g, (_match, h: string) => {
    try { return Buffer.from(h, 'hex').toString('latin1'); } catch { return ''; }
  }).toLowerCase();
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'test-inv-1',
    number: 'FACT-2026-TEST',
    document_type: 'invoice',
    status: 'draft',
    subtotal: 100,
    vat_amount: 20,
    discount_amount: 0,
    total: 120,
    currency: 'EUR',
    issue_date: '2026-06-20',
    due_date: '2026-07-20',
    items: [{ id: '1', description: 'Prestation', quantity: 1, unit_price: 100, vat_rate: 20, total: 100 } as any],
    client_name_override: 'Client Test',
    ...overrides,
  } as unknown as Invoice;
}

describe('CIBLE 1 — conditions de paiement lues depuis le termId (fix « toujours 30 jours »)', () => {
  it('payment_terms=days15 → « sous 15 jours » (et NON « sous 30 jours »)', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ payment_terms: 'days15' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('sous 15 jours');
    expect(text).not.toContain('sous 30 jours');
  });

  it('payment_terms=reception → « à réception » (jamais « sous 0 jour »)', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ payment_terms: 'reception' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('réception');
    expect(text).not.toMatch(/sous 0 jour/);
  });

  it('payment_terms=end_of_month → mention « fin du mois »', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ payment_terms: 'end_of_month' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('fin du mois');
  });

  it('sans payment_terms (vieille facture) → repli profil (« sous 30 jours »)', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ payment_terms: undefined } as any), { payment_terms: '30' } as any);
    const text = pdfText(bytes);
    expect(text).toContain('sous 30 jours');
  });
});

describe('CIBLE 6 — QR / bloc paiement JAMAIS sur un devis', () => {
  it('un devis avec un lien SumUp ne rend NI le QR NI le bloc paiement', async () => {
    const quote = makeInvoice({
      document_type: 'quote',
      payment_provider: 'sumup',
      payment_link: 'https://checkout.sumup.com/pay/c-test123',
      sumup_checkout_id: 'test123',
      payment_link_amount: 120,
      payment_link_stale: false,
    } as any);
    const bytes = await generatePdfBuffer(quote, null);
    const text = pdfText(bytes);
    expect(text).not.toContain('checkout.sumup.com');
    expect(text).not.toContain('paiement en ligne');
  });
});

describe('CIBLE 7 — conformité par type de document', () => {
  it('devis : « valable 30 jours », SANS conditions de paiement ni indemnité 40 €', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ document_type: 'quote' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('valable 30 jours');
    expect(text).not.toContain('conditions de paiement');
    // l'indemnité forfaitaire 40 € ne doit figurer que sur facture/acompte
    expect(text).not.toContain('frais de recouvrement');
    expect(text).not.toContain('double exemplaire');
  });

  it('avoir : mention « avoir » + e-facturation, SANS pénalités de retard', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ document_type: 'credit_note' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('avoir');
    expect(text).toContain('facture électronique');
    expect(text).not.toContain('pénalités de retard');
  });

  it('bon de commande : mention dédiée', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ document_type: 'purchase_order' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('bon de commande');
  });

  it('facture : conditions de paiement + indemnité forfaitaire présentes', async () => {
    const bytes = await generatePdfBuffer(makeInvoice({ payment_terms: 'days30' } as any), null);
    const text = pdfText(bytes);
    expect(text).toContain('conditions de paiement');
    // NB : € est encodé WinAnsi 0x80 (non représentable en latin1 du décodeur de
    // test) — on asserte sur le libellé accent-safe de l'indemnité, pas sur « 40 € ».
    expect(text).toContain('frais de recouvrement');
    expect(text).toContain('sous 30 jours');
  });
});
