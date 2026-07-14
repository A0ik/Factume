import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { withQrDataUrl } from '../pdf';
import { generatePdfBuffer } from '../pdf-server';
import type { Invoice } from '@/types';

// Extrait le texte dessiné d'un PDF généré. Les flux pdf-lib sont compressés
// (FlateDecode) ET les chaînes sont encodées en hexadécimal <...> : on décompresse
// puis on décode l'hex pour pouvoir y chercher du texte lisible.
function pdfText(bytes: Uint8Array): string {
  const latin = Buffer.from(bytes).toString('latin1');
  let raw = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin)) !== null) {
    try {
      raw += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n';
    } catch {
      /* flux non-Flate (image, police…) — ignoré */
    }
  }
  const decoded = raw.replace(/<([0-9A-Fa-f]{2,})>/g, (_match, h: string) => {
    try { return Buffer.from(h, 'hex').toString('latin1'); } catch { return ''; }
  });
  return decoded.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// ALCHEMIST (BUG : QR manquant sur le PDF téléchargé) — Reproduction :
// facture SumUp calquée sur FACT-2026-077 (payment_provider=sumup, payment_link
// peuplé, payment_link_stale=false). Le résolveur renvoie une URL valide, et le
// moteur SERVEUR pdf-lib génère le QR via QRCode.toBuffer (Node, fiable).
// Ces tests figent deux contrats cassés par les corrections précédentes :
//   1. generatePdfBuffer NE DOIT PAS muter l'invoice en entrée (sinon un QR
//      obsolète survit aux régénérations — CIBLE 2).
//   2. Le chemin serveur produit bien un PDF valide pour une facture SumUp
//      (QR garanti côté Node, indépendant du navigateur).
// ─────────────────────────────────────────────────────────────────────────────

function makeSumupInvoice(): Invoice {
  return {
    id: 'test-sumup-1',
    number: 'FACT-2026-TEST',
    document_type: 'invoice',
    status: 'sent',
    subtotal: 120,
    vat_amount: 0,
    discount_amount: 0,
    total: 120,
    currency: 'EUR',
    issue_date: '2026-06-16',
    due_date: '2026-07-16',
    items: [],
    client_name_override: 'Client Test',
    client_email: 'client@test.com',
    payment_provider: 'sumup',
    payment_link: 'https://checkout.sumup.com/pay/c-test123',
    sumup_checkout_id: 'test123',
    payment_link_amount: 120,
    payment_link_stale: false,
  } as unknown as Invoice;
}

describe('generatePdfBuffer — chemin serveur (pdf-lib), QR garanti', () => {
  it('ne mute PAS l\'invoice en entrée (BUG régénération : QR obsolète qui survit)', async () => {
    const inv = makeSumupInvoice();
    expect((inv as any).qr_data_url).toBeUndefined();

    // Que le rendu réussisse ou non, l'ancien code mutait inv.qr_data_url AVANT
    // l'appelle pdf-lib. On ne doit plus jamais toucher à l'objet en entrée.
    await generatePdfBuffer(inv, null).catch(() => {});

    expect((inv as any).qr_data_url).toBeUndefined();
  });

  it('produit un PDF valide (en-tête %PDF) pour une facture SumUp', async () => {
    const bytes = await generatePdfBuffer(makeSumupInvoice(), null);
    const header = Buffer.from(bytes.slice(0, 5)).toString('latin1');
    expect(header.startsWith('%PDF')).toBe(true);
    expect(bytes.length).toBeGreaterThan(2000);
  });

  it('embarque le BLOC PAIEMENT (libellé + URL SumUp) pour une SumUp propre', async () => {
    // Reproduction de FACT-2026-077 : provider=sumup + payment_link peuplé.
    const bytes = await generatePdfBuffer(makeSumupInvoice(), null);
    const text = pdfText(bytes);
    expect(text).toContain('sumup');               // libellé « PAIEMENT EN LIGNE (SUMUP) »
    expect(text).toContain('checkout.sumup.com');  // l'URL est dessinée dans le pavé
  });

  it('RÉSILIENCE : provider=stripe sans URL + lien SumUp → le bloc s\'affiche quand même', async () => {
    // Reproduction de FACT-2026-035 : payment_provider='stripe' mais le vrai lien
    // est SumUp. AVANT : résolveur strict → URL vide → AUCUN bloc (« facture normale »).
    // MAINTENANT : repli résilient → le bloc s'affiche (libellé neutre, QR correct).
    const corrupt = {
      ...makeSumupInvoice(),
      payment_provider: 'stripe',
      stripe_payment_url: null,
    } as unknown as Invoice;
    const bytes = await generatePdfBuffer(corrupt, null);
    const text = pdfText(bytes);
    expect(text).toContain('checkout.sumup.com'); // le bloc paiement s'affiche
  });
});

describe('withQrDataUrl — injection immuable du QR (chemin client)', () => {
  it('renvoie un qr_data_url pour une facture SumUp sans muter l\'entrée', async () => {
    const inv = makeSumupInvoice();
    const result = await withQrDataUrl(inv);

    expect((inv as any).qr_data_url).toBeUndefined(); // entrée intacte
    expect((result as any).qr_data_url).toBeTruthy(); // QR injecté sur la copie
    expect(typeof (result as any).qr_data_url).toBe('string');
    expect((result as any).qr_data_url.startsWith('data:image/')).toBe(true);
  });

  it('ne fait rien quand il n\'y a pas d\'URL de paiement', async () => {
    const inv = makeSumupInvoice();
    (inv as any).payment_link = null;
    (inv as any).sumup_checkout_id = null;
    (inv as any).payment_provider = null;
    const result = await withQrDataUrl(inv);
    expect((result as any).qr_data_url).toBeUndefined();
  });
});
