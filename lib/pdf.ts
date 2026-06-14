import { Invoice, Profile } from '@/types';
import { prepareTemplateData, templateMinimaliste, templateClassique, templateModerne, templateElegant, templateCorporate, templateNature, templatePurchaseOrder, templateDeliveryNote, applyCustomTemplate } from './templates';

export function getDocLabel(invoice: Invoice, language = 'fr'): string {
  const labels: Record<string, Record<string, string>> = {
    fr: { invoice: 'FACTURE', quote: 'DEVIS', credit_note: 'AVOIR', purchase_order: 'BON DE COMMANDE', delivery_note: 'BON DE LIVRAISON', deposit: 'FACTURE D\'ACOMPTE' },
    en: { invoice: 'INVOICE', quote: 'QUOTE', credit_note: 'CREDIT NOTE', purchase_order: 'PURCHASE ORDER', delivery_note: 'DELIVERY NOTE', deposit: 'DEPOSIT INVOICE' },
  };
  return (labels[language] || labels['fr'])[invoice.document_type] || 'FACTURE';
}

const WATERMARK_MAP: Record<string, { text: string; color: string }> = {
  overdue: { text: 'EN RETARD', color: 'rgba(220,38,38,0.07)' },
  refused: { text: 'ANNULÉ',    color: 'rgba(100,100,100,0.06)' },
  paid:    { text: 'PAYÉ',      color: 'rgba(16,185,129,0.07)' },
};

export function generateInvoiceHtml(invoice: Invoice, profile?: Profile | null): string {
  const p = profile || {} as Profile;

  const wm = WATERMARK_MAP[invoice.status];
  const watermarkHtml = wm ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:88px;font-weight:900;color:${wm.color};pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:10px;user-select:none">${wm.text}</div>` : '';

  const data = prepareTemplateData(invoice, profile, watermarkHtml);

  if (p.custom_template_html) {
    return applyCustomTemplate(p.custom_template_html, data);
  }

  // Templates spécifiques par type de document
  if (invoice.document_type === 'purchase_order') {
    return templatePurchaseOrder(data);
  }
  if (invoice.document_type === 'delivery_note') {
    return templateDeliveryNote(data);
  }

  // Templates standards selon le choix de l'utilisateur
  const templateId = p.template_id || 1;
  switch (templateId) {
    case 2: return templateClassique(data);
    case 3: return templateModerne(data);
    case 4: return templateElegant(data);
    case 5: return templateCorporate(data);
    case 6: return templateNature(data);
    default: return templateMinimaliste(data);
  }
}

/**
 * FIXER (BUG 1) — Résout l'URL de paiement depuis tous les champs possibles
 * (Stripe, SumUp, générique). Centralise une logique auparavant dupliquée et
 * incomplète côté client : le bouton ne lisait que `payment_link`, ignorant
 * `stripe_payment_url` / `sumup_checkout_id` → le lien apparaissait non persisté.
 */
export function getPaymentUrl(invoice: Invoice): string {
  const inv = invoice as any;
  return (
    inv.payment_link ||
    inv.stripe_payment_url ||
    inv.stripe_payment_link_url ||
    (inv.sumup_checkout_id ? `https://checkout.sumup.com/${inv.sumup_checkout_id}` : '')
  );
}

/** Un lien de paiement existe-t-il, quel que soit le fournisseur ? */
export function hasPaymentLink(invoice: Invoice): boolean {
  return !!getPaymentUrl(invoice);
}

/**
 * FIXER (BUG 1) — Enrichit une facture de son QR code (data URL) pour le rendu
 * @react-pdf/renderer côté client. Le moteur pdf-lib (serveur) régénère lui-même
 * le QR, mais le chemin client (downloadInvoicePdf + PdfPreviewModal) ne le faisait
 * JAMAIS — d'où l'absence systématique du QR sur le PDF téléchargé et l'aperçu.
 */
export async function withQrDataUrl(invoice: Invoice): Promise<Invoice> {
  const url = getPaymentUrl(invoice);
  if (!url || (invoice as any).qr_data_url) return invoice;
  try {
    const { generateQrDataUrl } = await import('./qr-generate');
    const qr = await generateQrDataUrl(url);
    if (qr) return { ...invoice, qr_data_url: qr } as Invoice;
  } catch {
    // QR échoué — on rend quand même le PDF (sans QR).
  }
  return invoice;
}

/**
 * Generate a real PDF buffer for preview and download.
 *
 * Strategy: pdf-lib first (reliable in serverless), @react-pdf/renderer as fallback.
 * pdf-lib works everywhere (Vercel, Node, etc.) without CSP or WASM issues.
 */
export async function generatePdfBuffer(invoice: Invoice, profile?: Profile | null): Promise<Uint8Array> {
  const paymentUrl = getPaymentUrl(invoice);

  // Pre-generate QR code data URL for payment links (used by @react-pdf/renderer fallback)
  if (paymentUrl) {
    try {
      const { generateQrDataUrl } = await import('./qr-generate');
      const qrDataUrl = await generateQrDataUrl(paymentUrl);
      if (qrDataUrl) (invoice as any).qr_data_url = qrDataUrl;
    } catch {
      // QR pre-generation failed, pdf-server.ts will try again
    }
  }

  // PRIMARY: pdf-lib — rock solid in serverless environments
  try {
    const { generateInvoicePdfBuffer } = await import('./pdf-server');
    const buffer = await generateInvoicePdfBuffer(invoice, profile);
    return new Uint8Array(buffer);
  } catch (pdfLibErr) {
    console.warn('[pdf] pdf-lib failed, trying @react-pdf/renderer:', (pdfLibErr as Error).message);

    // FALLBACK: @react-pdf/renderer
    try {
      const { renderToBuffer } = await import('@react-pdf/renderer');
      const { PdfDocument } = await import('@/components/pdf-document');
      const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
      return await renderToBuffer(element as any);
    } catch (reactPdfErr) {
      console.error('[pdf] Both PDF engines failed. pdf-lib:', (pdfLibErr as Error).message, '| react-pdf:', (reactPdfErr as Error).message);
      throw pdfLibErr;
    }
  }
}

import React from 'react';

/**
 * Download PDF — generates a real PDF via @react-pdf/renderer and triggers download.
 * Falls back to HTML+print if React-PDF fails (e.g. custom template).
 */
export async function downloadInvoicePdf(invoice: Invoice, profile?: Profile | null): Promise<void> {
  if (profile?.custom_template_html) {
    downloadHtmlPdf(invoice, profile);
    return;
  }

  const filename = `${invoice.number.replace(/\//g, '-')}.pdf`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const cleanupDelay = isIOS ? 5000 : 150;

  try {
    const { pdf } = await import('@react-pdf/renderer');
    const { PdfDocument } = await import('@/components/pdf-document');
    // FIXER (BUG 1) : génère le QR côté client AVANT le rendu @react-pdf/renderer,
    // sinon PdfDocument affiche le fallback texte au lieu de l'image QR code.
    const invoiceWithQr = await withQrDataUrl(invoice);
    const element = React.createElement(PdfDocument, { invoice: invoiceWithQr, profile: profile || {} as Profile });
    const blob = await pdf(element as any).toBlob();

    // Try native share on iOS first
    if (isIOS && navigator.share && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (shareErr: any) {
        // User cancelled share or share failed — fall through to download
        if (shareErr?.name === 'AbortError') return;
      }
    }

    // Standard Blob download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, cleanupDelay);
  } catch {
    // Fallback: download via server-side endpoint
    try {
      const res = await fetch(`/api/download/pdf/${invoice.id}`);
      if (res.ok) {
        const serverBlob = await res.blob();
        const serverUrl = URL.createObjectURL(serverBlob);
        const a = document.createElement('a');
        a.href = serverUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(serverUrl);
        }, cleanupDelay);
      } else {
        throw new Error('Server PDF generation failed');
      }
    } catch {
      // Last resort for non-iOS: open in new tab
      if (!isIOS) {
        window.open(`/api/download/pdf/${invoice.id}`, '_blank');
      }
    }
  }
}

function downloadHtmlPdf(invoice: Invoice, profile?: Profile | null): void {
  const html = generateInvoiceHtml(invoice, profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.onload = () => { setTimeout(() => win.print(), 500); };
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
