/**
 * ALCHEMIST — Vérification d'intégration (vrai Node = environnement Vercel prod).
 * Prouve que le moteur SERVEUR pdf-lib rend le bloc paiement + embarque le QR
 * pour une facture SumUp propre. En jsdom (vitest) la lib qrcode produit un PNG
 * invalide, ce qui fausse le rendu ; ce script tourne en vrai Node où qrcode
 * fonctionne (-> reflecte la prod).
 *
 * Usage : npx tsx scripts/verify-qr-pdf.ts
 */
import zlib from 'zlib';
import { generatePdfBuffer } from '../lib/pdf-server';

const sumupInvoice = {
  id: 'verify-1',
  number: 'FACT-VERIFY',
  document_type: 'invoice',
  status: 'sent',
  currency: 'EUR',
  issue_date: '2026-06-16',
  due_date: '2026-07-16',
  subtotal: 120,
  vat_amount: 0,
  discount_amount: 0,
  total: 120,
  items: [{ description: 'Prestation test', quantity: 1, unit_price: 120, vat_rate: 0, total: 120 }],
  client_name_override: 'Client Test',
  client_email: 'c@test.com',
  payment_provider: 'sumup',
  payment_link: 'https://checkout.sumup.com/pay/c-verify123',
  sumup_checkout_id: 'verify123',
  payment_link_amount: 120,
  payment_link_stale: false,
} as any;

function pdfText(bytes: Uint8Array): string {
  const latin = Buffer.from(bytes).toString('latin1');
  let out = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin)) !== null) {
    try {
      out += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n';
    } catch {
      /* flux non-Flate — ignoré */
    }
  }
  return out;
}

(async () => {
  const bytes = await generatePdfBuffer(sumupInvoice, null);
  const latin = Buffer.from(bytes).toString('latin1');
  const lowerRaw = latin.toLowerCase();

  // Décompression + compte des flux
  let decompressed = '';
  let streamCount = 0;
  let inflated = 0;
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin)) !== null) {
    streamCount++;
    try {
      decompressed += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n';
      inflated++;
    } catch {}
  }
  const lowerDec = decompressed.toLowerCase();
  const imageCount = (latin.match(/\/Subtype\s*\/Image/gi) || []).length;

  console.log('=== ALCHEMIST — vérification bloc paiement + QR (vrai Node = prod) ===');
  console.log('PDF valide (%PDF)        :', latin.startsWith('%PDF'));
  console.log('Taille PDF (octets)      :', bytes.length);
  console.log('FlateDecode présent      :', latin.includes('FlateDecode'));
  console.log('Streams / décompressés   :', streamCount, '/', inflated);
  console.log('Images embarquées        :', imageCount, '(>=1 = QR présent)');
  console.log('--- texte du bloc (raw) ---');
  console.log('  raw "sumup"            :', lowerRaw.includes('sumup'));
  console.log('  raw "checkout.sumup"   :', lowerRaw.includes('checkout.sumup.com'));
  console.log('  raw "paiement"         :', lowerRaw.includes('paiement'));
  console.log('--- texte du bloc (décompressé) ---');
  console.log('  dec "sumup"            :', lowerDec.includes('sumup'));
  console.log('  dec "checkout.sumup"   :', lowerDec.includes('checkout.sumup.com'));
  console.log('  dec "paiement"         :', lowerDec.includes('paiement'));
})();
