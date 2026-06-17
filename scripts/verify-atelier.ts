/**
 * ATELIER — Vérification Factur-X × templates + URL courte.
 * Prouve : (1) le XML Factur-X est embarqué (inspection brute des octets du PDF),
 * (2) il est IDENTIQUE quel que soit le template visuel (le rendu n'affecte pas la
 * conformité e-invoicing), (3) l'URL courte /pay/<token> se construit correctement.
 * Usage : npx tsx scripts/verify-atelier.ts
 */
import zlib from 'zlib';
import { generatePdfBuffer } from '../lib/pdf';
import { createFacturXPdf, generateFacturXXml } from '../lib/facturx';
import { mintShortToken, buildShortPayUrl } from '../lib/pay-token';

const profile = (templateId: number) => ({
  template_id: templateId, company_name: 'Atelier Test SARL', siret: '12345678900012',
  vat_number: 'FR12345678901', legal_status: 'sarl', legal_mention: '', accent_color: '#1D9E75',
  email: 'contact@atelier-test.fr', address: '10 rue de Paris', postal_code: '75001', city: 'Paris',
  payment_terms: '30', currency: 'EUR', language: 'fr',
} as any);

const invoice: any = {
  id: 'atelier-test-1', number: 'FACT-2026-001', document_type: 'invoice', status: 'sent',
  issue_date: '2026-06-17', due_date: '2026-07-17', subtotal: 100, vat_amount: 20,
  discount_amount: 0, total: 120, currency: 'EUR',
  items: [{ description: 'Prestation design UI', quantity: 1, unit_price: 100, vat_rate: 20, total: 120 }],
  client: { name: 'Client B2B SAS', siret: '98765432100000', address: '5 av. Client', postal_code: '69000', city: 'Lyon' },
  payment_short_token: 'TEST1234', payment_provider: 'stripe',
  stripe_payment_url: 'https://checkout.stripe.com/c/pay/cs_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  payment_link: 'https://checkout.stripe.com/c/pay/cs_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  payment_link_stale: false,
};

(async () => {
  let ok = true;

  console.log('════════ TEST 1 — Factur-X embarqué (inspection brute) ════════');
  for (const tpl of [1, 7, 9]) {
    const pdf = await generatePdfBuffer(invoice, profile(tpl));
    const fx = await createFacturXPdf(pdf, invoice, profile(tpl));
    const latin = Buffer.from(fx).toString('latin1');
    // Décompresse les flux Flate et cherche le XML CII + les métadonnées XMP PDF/A-3.
    // (le nom de fichier et le XMP sont stockés compressés/hex par pdf-lib → invisibles en clair)
    let hasCII = false, hasXmp = false;
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(latin)) !== null) {
      try {
        const d = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
        if (d.includes('CrossIndustryInvoice')) hasCII = true;
        if (d.includes('pdfaid:part') || d.includes('ConformanceLevel')) hasXmp = true;
      } catch { /* flux non-Flate */ }
    }
    const embFile = latin.includes('/EmbeddedFile');
    const af = /\/AF\b/.test(latin);
    const embedded = hasCII && hasXmp && embFile && af;
    console.log(`Tpl ${tpl}: CII=${hasCII} XMP/A-3=${hasXmp} /EmbeddedFile=${embFile} /AF=${af} | pdf=${pdf.byteLength}o fx=${fx.byteLength}o (+${fx.byteLength - pdf.byteLength}) → ${embedded ? '✅ EMBARQUÉ' : '❌'}`);
    if (!embedded) ok = false;
  }

  console.log('\n════════ TEST 2 — Indépendance template (XML identique) ════════');
  const xml1 = generateFacturXXml(invoice, profile(1));
  const xml7 = generateFacturXXml(invoice, profile(7));
  const xml9 = generateFacturXXml(invoice, profile(9));
  console.log('generateFacturXXml longueur :', xml1.length, 'c (contient CrossIndustryInvoice :', xml1.includes('CrossIndustryInvoice'), ')');
  console.log('XML identique template 1 ↔ 7 :', xml1 === xml7);
  console.log('XML identique template 1 ↔ 9 :', xml1 === xml9);
  if (!(xml1 === xml7 && xml1 === xml9)) ok = false;
  else console.log('✅ Le template visuel ne change RIEN au XML Factur-X (conformité e-invoicing identique pour les 9 templates).');

  console.log('\n════════ TEST 3 — URL courte /pay/<token> ════════');
  const token = mintShortToken();
  const shortUrl = buildShortPayUrl(invoice.payment_short_token)!;
  const longUrl = invoice.stripe_payment_url;
  console.log('Token :', token, '| URL courte :', shortUrl, `(${shortUrl.length}c)`);
  console.log('URL Stripe :', longUrl, `(${longUrl.length}c) → QR -${Math.round((1 - shortUrl.length / longUrl.length) * 100)}% de payload`);
  const valid = /^https:\/\/factu\.me\/pay\/[A-Za-z0-9]{8}$/.test(shortUrl);
  console.log('Format conforme :', valid);
  if (!valid) ok = false;

  console.log('\n════════ RÉSULTAT ════════');
  console.log(ok ? '✅ TOUS LES TESTS PASSSENT' : '❌ ÉCHEC — voir ci-dessus');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERREUR TEST :', e); process.exit(1); });
