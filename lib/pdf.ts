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
 * Generate a real PDF buffer using @react-pdf/renderer.
 * Same component used for email attachments → identical rendering.
 */
export async function generatePdfBuffer(invoice: Invoice, profile?: Profile | null): Promise<Uint8Array> {
  // Pre-generate QR code data URL for payment links
  const paymentUrl = (invoice as any).payment_link || (invoice as any).stripe_payment_url;
  if (paymentUrl) {
    try {
      const { generateQrDataUrl } = await import('./qr-generate');
      (invoice as any).qr_data_url = await generateQrDataUrl(paymentUrl);
    } catch (qrErr) {
      // QR generation failed, continue without it
      console.warn('[pdf] QR pre-generation failed, continuing without QR:', (qrErr as Error).message);
    }
  }

  try {
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { PdfDocument } = await import('@/components/pdf-document');
    const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
    return await renderToBuffer(element as any);
  } catch (reactPdfErr) {
    console.error('[pdf] @react-pdf/renderer failed, falling back to pdf-lib:', (reactPdfErr as Error).message);

    // Fallback: use pdf-lib based generation
    try {
      const { generateInvoicePdfBuffer } = await import('./pdf-server');
      const buffer = await generateInvoicePdfBuffer(invoice, profile);
      return new Uint8Array(buffer);
    } catch (fallbackErr) {
      console.error('[pdf] pdf-lib fallback also failed:', (fallbackErr as Error).message);
      throw reactPdfErr;
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
    const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
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
