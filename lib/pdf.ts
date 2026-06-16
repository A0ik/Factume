import { Invoice, Profile } from '@/types';
import { prepareTemplateData, templateMinimaliste, templateClassique, templateModerne, templateElegant, templateCorporate, templateNature, templatePurchaseOrder, templateDeliveryNote, applyCustomTemplate } from './templates';
import { resolvePaymentLink } from './payment-link';

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
 * INSPECTOR (BUG 2 + BUG 3) — Résout l'URL de paiement via la source de vérité
 * unique (lib/payment-link.ts). Délègue entièrement : url vide si lien stale,
 * provider lu depuis payment_provider, repli legacy. Centralise une logique
 * auparavant dupliquée et divergente entre 4 fichiers.
 */
export function getPaymentUrl(invoice: Invoice): string {
  return resolvePaymentLink(invoice).url;
}

/** Un lien de paiement ACTIF existe-t-il (pas stale, URL résolue) ? */
export function hasPaymentLink(invoice: Invoice): boolean {
  return !!resolvePaymentLink(invoice).url;
}

/**
 * FIXER (BUG 1) — Enrichit une facture de son QR code (data URL) pour le rendu
 * @react-pdf/renderer côté client. Le moteur pdf-lib (serveur) régénère lui-même
 * le QR, mais le chemin client (downloadInvoicePdf + PdfPreviewModal) ne le faisait
 * JAMAIS — d'où l'absence systématique du QR sur le PDF téléchargé et l'aperçu.
 */
export async function withQrDataUrl(invoice: Invoice): Promise<Invoice> {
  const url = getPaymentUrl(invoice);
  if (!url) return invoice;
  if ((invoice as any).qr_data_url) return invoice;
  try {
    const { generateQrDataUrl } = await import('./qr-generate');
    const qr = await generateQrDataUrl(url);
    if (qr) return { ...invoice, qr_data_url: qr } as Invoice;
    // ALCHEMIST — fin de l'échec silencieux : on rend le PDF, mais on trace
    // pour que le bug soit enfin visible (au lieu de rendre un pavé « Payer »).
    console.warn('[pdf] withQrDataUrl: QR vide pour', url.slice(0, 60));
  } catch (err) {
    console.warn('[pdf] withQrDataUrl: échec génération QR —', (err as Error).message);
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
  // PRIMARY: pdf-lib — rock solid in serverless environments. Génère lui-même le
  // QR côté Node via QRCode.toBuffer (fiable, indépendant du navigateur). On ne
  // mute JAMAIS l'invoice en entrée : l'ancien code faisait `invoice.qr_data_url =
  // ...` ce qui laissait un QR obsolète survivre aux régénérations (CIBLE 2).
  try {
    const { generateInvoicePdfBuffer } = await import('./pdf-server');
    const buffer = await generateInvoicePdfBuffer(invoice, profile);
    return new Uint8Array(buffer);
  } catch (pdfLibErr) {
    console.warn('[pdf] pdf-lib failed, trying @react-pdf/renderer:', (pdfLibErr as Error).message);

    // FALLBACK: @react-pdf/renderer — on injecte le QR de façon IMMUABLE (copie).
    try {
      const { renderToBuffer } = await import('@react-pdf/renderer');
      const { PdfDocument } = await import('@/components/pdf-document');
      const invoiceWithQr = await withQrDataUrl(invoice);
      const element = React.createElement(PdfDocument, { invoice: invoiceWithQr, profile: profile || {} as Profile });
      return await renderToBuffer(element as any);
    } catch (reactPdfErr) {
      console.error('[pdf] Both PDF engines failed. pdf-lib:', (pdfLibErr as Error).message, '| react-pdf:', (reactPdfErr as Error).message);
      throw pdfLibErr;
    }
  }
}

import React from 'react';

/**
 * Download PDF — ALCHEMIST (BUG : QR manquant).
 *
 * SERVEUR D'ABORD : on récupère le PDF via /api/download/pdf/[id] (moteur pdf-lib)
 * qui génère le QR côté Node via QRCode.toBuffer — fiable et indépendant du
 * navigateur. Le chemin client @react-pdf/renderer n'est qu'un REPLI : il dépend
 * de QRCode.toDataURL (canvas/CSP/iOS WebKit) qui échoue en SILENCE puis rend un
 * pavé « Payer » sans QR — sans jamais throw, donc le repli serveur n'était
 * JAMAIS atteint. C'est la cause racine de l'absence du QR.
 *
 * Falls back to HTML+print if a custom template is set (non-PDF path).
 */
export async function downloadInvoicePdf(invoice: Invoice, profile?: Profile | null): Promise<void> {
  if (profile?.custom_template_html) {
    downloadHtmlPdf(invoice, profile);
    return;
  }

  const filename = `${invoice.number.replace(/\//g, '-')}.pdf`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const cleanupDelay = isIOS ? 5000 : 150;
  const serverUrl = `/api/download/pdf/${invoice.id}`;

  // Déclenche le téléchargement/partage d'un blob, en tentant le partage natif iOS.
  const triggerDownload = (blob: Blob) => {
    if (isIOS && navigator.share && typeof navigator.share === 'function') {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        navigator
          .share({ files: [file] })
          .catch((shareErr: any) => {
            // Annulation par l'utilisateur → on ne fait rien ; autre erreur → téléchargement.
            if (shareErr?.name === 'AbortError') return;
            standardDownload(blob);
          });
        return;
      }
    }
    standardDownload(blob);
  };

  const standardDownload = (blob: Blob) => {
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
  };

  // 1) PRIMARY — moteur serveur pdf-lib (QR garanti côté Node).
  try {
    const res = await fetch(serverUrl);
    if (res.ok) {
      triggerDownload(await res.blob());
      return;
    }
    console.warn('[pdf] server PDF renvoyé', res.status, '— repli client');
  } catch (serverErr) {
    console.warn('[pdf] server PDF injoignable, repli client :', (serverErr as Error).message);
  }

  // 2) FALLBACK — rendu client @react-pdf/renderer (QR injecté immuablement).
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const { PdfDocument } = await import('@/components/pdf-document');
    const invoiceWithQr = await withQrDataUrl(invoice);
    const element = React.createElement(PdfDocument, { invoice: invoiceWithQr, profile: profile || {} as Profile });
    triggerDownload(await pdf(element as any).toBlob());
    return;
  } catch (clientErr) {
    console.warn('[pdf] rendu client aussi échoué :', (clientErr as Error).message);
  }

  // 3) LAST RESORT — ouverture du PDF serveur dans un nouvel onglet.
  if (isIOS) {
    window.location.href = serverUrl;
  } else {
    window.open(serverUrl, '_blank');
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
