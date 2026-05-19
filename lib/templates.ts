import { Invoice, Profile } from '@/types';
import { getDocLabel } from './pdf';

// ─────────────────────────────────────────────
// LOCALISATION & TRADUCTIONS
// ─────────────────────────────────────────────

const TRANSLATIONS = {
  'fr-FR': {
    invoice: {
      issued: 'Émise le',
      due: 'Échéance',
      billedTo: 'Facturé à',
      totalLabel: 'Total TTC',
      penalty: 'Pénalités de retard : 3× le taux légal — Indemnité forfaitaire de frais de recouvrement : 40€ (art. L.441-10 c. com.)',
      legalReference: 'Art. L.441-9 du Code de commerce',
      disputeJurisdiction: 'En cas de litige, Tribunal de Commerce du siège social du prestataire',
      paymentUponReceipt: 'Paiement à réception de facture',
      paymentWithin: (days: number) => days === 0 ? 'Paiement à réception de facture' : `Paiement sous ${days} jours`,
      bankDetails: 'Coordonnées bancaires',
      paymentTerms: 'Conditions de paiement',
      legalMentions: 'Mentions légales',
      notes: 'Notes',
    },
    quote: {
      issued: 'Établi le',
      validUntil: 'Valable jusqu\'au',
      validDays: 'Valable 30 jours',
      billedTo: 'Adressé à',
      totalLabel: 'Montant de l\'offre TTC',
      showSignature: true,
      acceptance: 'Bon pour accord',
      validMention: 'Ce devis est valable 30 jours à compter de sa date d\'émission',
    },
    credit_note: {
      issued: 'Émis le',
      billedTo: 'Crédité à',
      totalLabel: 'Montant du crédit TTC',
      showSignature: false,
      reference: 'Avoir relatif à',
    },
    deposit: {
      issued: 'Émise le',
      due: 'Échéance',
      billedTo: 'Facturé à',
      totalLabel: 'Acompte TTC',
      showSignature: false,
      depositMention: 'Facture d\'acompte émise en application de l\'article L.441-9 du Code de commerce',
    },
    purchase_order: {
      issued: 'Émis le',
      validUntil: 'Valable jusqu\'au',
      billedTo: 'Commandé par',
      totalLabel: 'Montant total TTC',
      showSignature: true,
      conditions: 'Conditions de vente',
      confirmation: 'Commande confirmée le',
      validMention: 'Ce bon de commande est valable jusqu\'à la date d\'échéance indiquée',
    },
    delivery_note: {
      issued: 'Émis le',
      billedTo: 'Destinataire',
      totalLabel: 'Total des articles livrés',
      showSignature: true,
      deliveredBy: 'Livré par',
      receivedBy: 'Reçu par',
      deliveryDate: 'Date de livraison',
      status: 'État de la livraison',
      mention: 'Bon de livraison établi conformément aux usages commerciaux',
    },
    common: {
      company: 'Entreprise',
      client: 'Client',
      description: 'Description',
      quantity: 'Qté',
      unitPrice: 'P.U. HT',
      vat: 'TVA',
      totalHT: 'Total HT',
      subtotal: 'Sous-total HT',
      vatAmount: 'TVA',
      discount: 'Remise',
      generatedBy: 'générée par Facturme',
      conformToLaw: 'conformément à la réglementation en vigueur',
    },
    legal: {
      insurance: 'Assurance professionnelle',
      insuranceText: 'Le prestataire déclare être couvert par une assurance Responsabilité Civile Professionnelle pour les prestations effectuées dans le cadre de ce document.',
      intellectualProperty: 'Propriété intellectuelle',
      intellectualPropertyText: 'Tous les documents, logiciels, méthodes, procédés et savoir-faire demeurent la propriété exclusive du prestataire. Toute reproduction, diffusion ou utilisation non autorisée constitue une contrefaçon passible des sanctions prévues aux articles L.335-2 et suivants du Code de la propriété intellectuelle.',
      confidentiality: 'Confidentialité',
      confidentialityText: 'Le destinataire s\'engage à conserver la plus stricte confidentialité concernant toutes les informations transmises dans le cadre de ce document.',
    },
  },
  'en-GB': {
    invoice: {
      issued: 'Issued on',
      due: 'Due date',
      billedTo: 'Billed to',
      totalLabel: 'Total VAT incl.',
      penalty: 'Late payment penalties: 3× statutory rate — Fixed indemnity: £40 (Late Payment of Commercial Debts Regulations)',
      legalReference: 'Late Payment of Commercial Debts Regulations 2013',
      disputeJurisdiction: 'In case of dispute, competent court: UK courts',
      paymentUponReceipt: 'Payment upon receipt',
      paymentWithin: (days: number) => days === 0 ? 'Payment upon receipt' : `Payment within ${days} days`,
      bankDetails: 'Bank details',
      paymentTerms: 'Payment terms',
      legalMentions: 'Legal mentions',
      notes: 'Notes',
    },
    quote: {
      issued: 'Established on',
      validUntil: 'Valid until',
      validDays: 'Valid for 30 days',
      billedTo: 'Addressed to',
      totalLabel: 'Total offer VAT incl.',
      showSignature: true,
      acceptance: 'Accepted',
      validMention: 'This quote is valid for 30 days from its date of issue',
    },
    credit_note: {
      issued: 'Issued on',
      billedTo: 'Credited to',
      totalLabel: 'Credit amount VAT incl.',
      showSignature: false,
      reference: 'Credit note regarding',
    },
    deposit: {
      issued: 'Issued on',
      due: 'Due date',
      billedTo: 'Billed to',
      totalLabel: 'Deposit VAT incl.',
      showSignature: false,
      depositMention: 'Deposit invoice issued in accordance with applicable commercial regulations',
    },
    purchase_order: {
      issued: 'Issued on',
      validUntil: 'Valid until',
      billedTo: 'Ordered by',
      totalLabel: 'Total amount VAT incl.',
      showSignature: true,
      conditions: 'Terms of sale',
      confirmation: 'Order confirmed on',
      validMention: 'This purchase order is valid until the indicated due date',
    },
    delivery_note: {
      issued: 'Issued on',
      billedTo: 'Recipient',
      totalLabel: 'Total delivered items',
      showSignature: true,
      deliveredBy: 'Delivered by',
      receivedBy: 'Received by',
      deliveryDate: 'Delivery date',
      status: 'Delivery status',
      mention: 'Delivery note established in accordance with commercial practices',
    },
    common: {
      company: 'Company',
      client: 'Client',
      description: 'Description',
      quantity: 'Qty',
      unitPrice: 'Unit Price excl. VAT',
      vat: 'VAT',
      totalHT: 'Total excl. VAT',
      subtotal: 'Subtotal excl. VAT',
      vatAmount: 'VAT',
      discount: 'Discount',
      generatedBy: 'generated by Facturme',
      conformToLaw: 'in accordance with applicable regulations',
    },
    legal: {
      insurance: 'Professional insurance',
      insuranceText: 'The service provider declares to be covered by Professional Civil Liability insurance for the services performed under this document.',
      intellectualProperty: 'Intellectual property',
      intellectualPropertyText: 'All documents, software, methods, processes and know-how remain the exclusive property of the service provider. Any unauthorized reproduction, distribution or use constitutes infringement punishable under the provisions of Articles L.335-2 et seq. of the Intellectual Property Code.',
      confidentiality: 'Confidentiality',
      confidentialityText: 'The recipient undertakes to maintain strict confidentiality regarding all information transmitted in the context of this document.',
    },
  },
};

type Locale = keyof typeof TRANSLATIONS;

const fmt = (n: number, currency = 'EUR', locale = 'fr-FR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
const fmtDate = (s: string, locale = 'fr-FR') =>
  new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

function getTranslation(locale: Locale) {
  return TRANSLATIONS[locale] || TRANSLATIONS['fr-FR'];
}

function getLabels(invoice: Invoice, locale: Locale = 'fr-FR') {
  const t = getTranslation(locale);
  const docType = invoice.document_type;

  const baseLabels = {
    issuedLabel: t.common.description,
    dueDateSection: '',
    billedToLabel: t.common.client,
    totalLabel: t.common.totalHT,
    showSignature: false,
  };

  switch (docType) {
    case 'quote':
      return {
        ...baseLabels,
        issuedLabel: t.quote.issued,
        dueDateSection: invoice.due_date ? `${t.quote.validUntil} ${fmtDate(invoice.due_date, locale)}` : t.quote.validDays,
        billedToLabel: t.quote.billedTo,
        totalLabel: t.quote.totalLabel,
        showSignature: true,
      };
    case 'credit_note':
      return {
        ...baseLabels,
        issuedLabel: t.credit_note.issued,
        billedToLabel: t.credit_note.billedTo,
        totalLabel: t.credit_note.totalLabel,
        showSignature: false,
      };
    case 'deposit':
      return {
        ...baseLabels,
        issuedLabel: t.deposit.issued,
        dueDateSection: invoice.due_date ? `${t.deposit.due} : ${fmtDate(invoice.due_date, locale)}` : '',
        billedToLabel: t.deposit.billedTo,
        totalLabel: t.deposit.totalLabel,
        showSignature: false,
      };
    case 'purchase_order':
      return {
        ...baseLabels,
        issuedLabel: t.purchase_order.issued,
        dueDateSection: invoice.due_date ? `${t.purchase_order.validUntil} ${fmtDate(invoice.due_date, locale)}` : '',
        billedToLabel: t.purchase_order.billedTo,
        totalLabel: t.purchase_order.totalLabel,
        showSignature: true,
      };
    case 'delivery_note':
      return {
        ...baseLabels,
        issuedLabel: t.delivery_note.issued,
        dueDateSection: '',
        billedToLabel: t.delivery_note.billedTo,
        totalLabel: t.delivery_note.totalLabel,
        showSignature: true,
      };
    default:
      return {
        ...baseLabels,
        issuedLabel: t.invoice.issued,
        dueDateSection: invoice.due_date ? `${t.invoice.due} : ${fmtDate(invoice.due_date, locale)}` : '',
        billedToLabel: t.invoice.billedTo,
        totalLabel: t.invoice.totalLabel,
        showSignature: false,
      };
  }
}

// ─────────────────────────────────────────────
// MENTIONS LÉGALES PAR TYPE DE DOCUMENT
// ─────────────────────────────────────────────

function buildLegalMentions(profile: Profile, docType: string, locale: Locale = 'fr-FR'): string[] {
  const parts: string[] = [];
  const isFr = locale === 'fr-FR';

  // Mentions d'identité (obligatoires pour tous les documents)
  if (profile.siret) parts.push(isFr ? `SIRET : ${profile.siret}` : `Company registration: ${profile.siret}`);
  if (profile.vat_number) parts.push(isFr ? `N° TVA intracommunautaire : ${profile.vat_number}` : `VAT number: ${profile.vat_number}`);

  // New legal mentions for French compliance
  if (profile.rcs_number) parts.push(isFr ? `RCS : ${profile.rcs_number}` : `Company reg.: ${profile.rcs_number}`);
  if (profile.rm_number) parts.push(isFr ? `RM : ${profile.rm_number}` : `Trade reg.: ${profile.rm_number}`);
  if (profile.capital_social) parts.push(isFr ? `Capital social : ${profile.capital_social} EUR` : `Share capital: ${profile.capital_social} EUR`);
  if (profile.naf_code) parts.push(isFr ? `NAF/APE : ${profile.naf_code}` : `NAF/APE: ${profile.naf_code}`);

  // TVA mentions based on regime fiscal
  if (profile.regime_fiscal === 'micro' || (profile.legal_status === 'auto-entrepreneur' && !profile.regime_fiscal)) {
    // Auto-entrepreneur or micro-entreprise
    if (profile.legal_status === 'auto-entrepreneur') {
      if (isFr) {
        parts.push("Dispensé d'immatriculation au RCS et au Répertoire des Métiers");
        parts.push('TVA non applicable, art. 293 B du CGI');
      } else {
        parts.push('Exempt from trade register registration');
        parts.push('VAT not applicable, art. 293 B of the French General Tax Code');
      }
    } else {
      // Micro but not auto-entrepreneur (micro BIC/BNC)
      if (isFr) {
        parts.push('Dispense de TVA en application de l\'art. 293 B du CGI');
      }
    }
  } else if (profile.regime_fiscal === 'autoliquidation') {
    // Autoliquidation (BTP, sub-contracting)
    if (isFr) {
      parts.push('Autoliquidation de la TVA conformément à l\'art. 283, 2 nonies du CGI');
      if (profile.sector?.toLowerCase().includes('btp') || profile.sector?.toLowerCase().includes('construction')) {
        parts.push('Montant soumis à autoliquidation de la TVA sur le HT');
      }
    }
  } else if (profile.legal_status && profile.legal_status !== 'autre') {
    // For 'reel' regime: TVA is shown on line items, no special mention needed
    if (isFr) {
      parts.push(`Forme juridique : ${profile.legal_status.replace('-', ' ').toUpperCase()}`);
    }
  }

  // Mentions spécifiques par type de document
  if (docType === 'invoice' || docType === 'deposit') {
    const t = getTranslation(locale);
    parts.push(t.invoice.penalty);
    if (isFr) {
      parts.push('En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 € sera appliquée, conformément à l\'article L.441-6 du Code de commerce.');
      parts.push('Les pénalités de retard sont calculées sur la base de trois fois le taux d\'intérêt légal en vigueur.');
    }
  }

  if (docType === 'quote') {
    const t = getTranslation(locale);
    parts.push(t.quote.validMention);
  }

  if (docType === 'purchase_order') {
    const t = getTranslation(locale);
    parts.push(t.purchase_order.validMention);
  }

  if (docType === 'delivery_note') {
    const t = getTranslation(locale);
    parts.push(t.delivery_note.mention);
  }

  return parts;
}

function getLegalMentionText(profile: Profile, docType: string, locale: Locale = 'fr-FR'): string {
  const mentions = buildLegalMentions(profile, docType, locale);
  return mentions.join(' • ');
}

// ─────────────────────────────────────────────
// MENTION ASSURANCE PROFESSIONNELLE
// ─────────────────────────────────────────────

function getInsuranceMention(profile: Profile, locale: Locale = 'fr-FR'): string {
  const t = getTranslation(locale);
  const needsInsurance = ['auto-entrepreneur', 'autre', 'eirl', 'eurl'].includes(profile.legal_status);

  if (!needsInsurance) return '';

  return `<div style="margin-bottom:16px;padding:12px 16px;background:#fffbeb;border-radius:8px;border-left:3px solid #f59e0b">
    <div style="font-size:10px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${t.legal.insurance}</div>
    <div style="font-size:12px;color:#374151;line-height:1.6">${t.legal.insuranceText}</div>
  </div>`;
}

// ─────────────────────────────────────────────
// MENTION PROPRIÉTÉ INTELLECTUELLE
// ─────────────────────────────────────────────

function getIntellectualPropertyMention(locale: Locale = 'fr-FR'): string {
  const t = getTranslation(locale);
  return `<div style="margin-bottom:16px;padding:12px 16px;background:#f0f9ff;border-radius:8px;border-left:3px solid #0284c7">
    <div style="font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${t.legal.intellectualProperty}</div>
    <div style="font-size:12px;color:#374151;line-height:1.6">${t.legal.intellectualPropertyText}</div>
  </div>`;
}

// ─────────────────────────────────────────────
// MENTIONS OBLIGATOIRES PAR TYPE DE DOCUMENT
// ─────────────────────────────────────────────

function getMandatoryMentions(invoice: Invoice, profile: Profile, locale: Locale = 'fr-FR'): string {
  const t = getTranslation(locale);
  const mentions: string[] = [];
  const isFr = locale === 'fr-FR';

  // Numéro de document (obligatoire pour tous)
  mentions.push(`${isFr ? 'Numéro' : 'Number'} : ${invoice.number}`);

  // Date d'émission (obligatoire pour tous)
  mentions.push(`${isFr ? 'Date d\'émission' : 'Issue date'} : ${fmtDate(invoice.issue_date, locale)}`);

  // Date d'échéance (obligatoire pour factures et devis)
  if (invoice.due_date && ['invoice', 'quote', 'purchase_order', 'deposit'].includes(invoice.document_type)) {
    mentions.push(`${isFr ? 'Date d\'échéance' : 'Due date'} : ${fmtDate(invoice.due_date, locale)}`);
  }

  // Montant à régler (obligatoire pour factures et acomptes)
  if (['invoice', 'deposit'].includes(invoice.document_type)) {
    mentions.push(`${isFr ? 'Montant à régler' : 'Amount due'} : ${fmt(invoice.total, profile.currency || 'EUR', locale)}`);
  }

  // Référence à la facture originale (pour avoirs)
  if (invoice.document_type === 'credit_note' && invoice.linked_invoice_id) {
    mentions.push(`${isFr ? 'Avoir relatif à la facture' : 'Credit note regarding invoice'} : ${invoice.linked_invoice_id}`);
  }

  // Conditions de paiement
  if (['invoice', 'deposit'].includes(invoice.document_type)) {
    const paymentTerms = formatPaymentTerms(profile, locale);
    if (paymentTerms) {
      mentions.push(`${isFr ? 'Conditions de paiement' : 'Payment terms'} : ${paymentTerms}`);
    }
  }

  // Validité (pour devis et bons de commande)
  if (['quote', 'purchase_order'].includes(invoice.document_type) && invoice.due_date) {
    const validity = isFr ? `Valable jusqu'au ${fmtDate(invoice.due_date, locale)}` : `Valid until ${fmtDate(invoice.due_date, locale)}`;
    mentions.push(validity);
  }

  return mentions.join(' • ');
}

function formatPaymentTerms(profile: Profile, locale: Locale = 'fr-FR'): string {
  const t = getTranslation(locale);
  const terms = profile.payment_terms || profile.custom_payment_terms;

  if (!terms) return locale === 'fr-FR' ? 'Paiement à réception de facture' : 'Payment upon receipt';

  // Si c'est un nombre de jours
  const numMatch = terms.match(/^\d+$/);
  if (numMatch) {
    const days = parseInt(terms, 10);
    if (days === 0) return t.invoice.paymentUponReceipt;
    if (days === 30) return locale === 'fr-FR' ? 'Paiement sous 30 jours' : 'Payment within 30 days';
    if (days === 45) return locale === 'fr-FR' ? 'Paiement sous 45 jours' : 'Payment within 45 days';
    if (days === 60) return locale === 'fr-FR' ? 'Paiement sous 60 jours' : 'Payment within 60 days';
    return t.invoice.paymentWithin(days);
  }

  // Sinon, retourner le texte personnalisé
  return terms;
}

// ─────────────────────────────────────────────
// CONSTRUCTION DU BLOCK DE MENTIONS OBLIGATOIRES
// ─────────────────────────────────────────────

function getMandatoryMentionsBlock(invoice: Invoice, profile: Profile, accentColor: string, locale: Locale = 'fr-FR'): string {
  const mentions = getMandatoryMentions(invoice, profile, locale);
  const t = getTranslation(locale);
  const alphaColor = hexToRgba(accentColor, 0.08);
  const borderColor = hexToRgba(accentColor, 0.25);

  return `<div style="margin-bottom:20px;padding:14px 18px;background:${alphaColor};border-radius:8px;border-left:3px solid ${accentColor}">
    <div style="font-size:10px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">${isFR(locale) ? 'Mentions obligatoires' : 'Mandatory mentions'}</div>
    <div style="font-size:12px;color:#374151;line-height:1.7">${mentions}</div>
  </div>`;
}

function isFR(locale: Locale): boolean {
  return locale === 'fr-FR';
}

export interface TemplateData {
  accent: string;
  currency: string;
  locale: string;
  localeTyped: Locale;
  f: (n: number) => string;
  fd: (s: string) => string;
  clientName: string;
  clientAddr: string;
  labels: ReturnType<typeof getLabels>;
  logoHtml: string;
  clientLogoHtml: string;
  legal: string;
  bankBlock: string;
  watermarkHtml: string;
  qrBlock: string;
  rows: string;
  discountRow: string;
  signatureBlock: string;
  paymentSection: string;
  sigBlock: string;
  paymentTermsBlock: string;
  legalMentionBlock: string;
  cgvBlock: string;
  mandatoryMentionsBlock: string;
  insuranceMention: string;
  intellectualPropertyMention: string;
  lang: string;
  invoice: Invoice;
  profile: Profile;
  docLabel: string;
  translations: typeof TRANSLATIONS[Locale];
}

export function prepareTemplateData(invoice: Invoice, profile?: Profile | null, watermarkHtml = ''): TemplateData {
  const p = profile || {} as Profile;
  const accent = p.accent_color || '#1D9E75';
  const currency = p.currency || 'EUR';
  const localeTyped: Locale = p.language === 'en' ? 'en-GB' : 'fr-FR';
  const locale = localeTyped;
  const f = (n: number) => fmt(n, currency, locale);
  const fd = (s: string) => fmtDate(s, locale);
  const t = getTranslation(localeTyped);
  const clientName = invoice.client?.name || invoice.client_name_override || t.common.client;
  const clientAddr = invoice.client ? [invoice.client.address, `${invoice.client.postal_code || ''} ${invoice.client.city || ''}`.trim(), invoice.client.country !== 'France' ? invoice.client.country : ''].filter(Boolean).join('<br/>') : '';
  const labels = getLabels(invoice, localeTyped);
  const logoHtml = p.logo_url
    ? `<div style="display:flex;align-items:flex-start;justify-content:flex-start;margin-bottom:16px;padding:12px;background:#fafafa;border-radius:12px;border-left:4px solid var(--accent-color)"><img src="${p.logo_url}" style="height:120px;max-width:300px;object-fit:contain;display:block;margin:0;padding:0" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/></div>`
    : '';
  const clientLogoHtml = invoice.client?.logo_url
    ? `<div style="display:inline-block;margin-right:16px;vertical-align:top"><img src="${invoice.client.logo_url}" style="height:70px;max-width:200px;object-fit:contain;display:block" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/></div>`
    : '';
  const legal = getLegalMentionText(p as Profile, invoice.document_type, localeTyped);

  const bankBlock = ((invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (p.iban || p.bank_name))
    ? `<div style="margin-bottom:20px;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:3px solid var(--accent-color)"><div style="font-size:9px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${t.invoice.bankDetails}</div><div style="font-size:12px;color:#374151;line-height:1.9">${p.bank_name ? `<div><strong>${isFR(locale) ? 'Banque' : 'Bank'} :</strong> ${p.bank_name}</div>` : ''}${p.iban ? `<div><strong>IBAN :</strong> ${p.iban}</div>` : ''}${p.bic ? `<div><strong>BIC :</strong> ${p.bic}</div>` : ''}</div></div>`
    : '';

  const paymentUrl = invoice.stripe_payment_link_url || invoice.stripe_payment_url || invoice.payment_link || '';
  const paymentMethod = invoice.stripe_payment_link_url || invoice.stripe_payment_url ? 'Stripe' : (invoice.payment_link ? 'SumUp' : '');

  const qrBlock = paymentUrl
    ? `<div style="display:inline-block;margin-left:16px;vertical-align:middle;text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(paymentUrl)}" width="72" height="72" style="display:block;border-radius:6px;border:1px solid #e5e7eb"/><div style="font-size:10px;color:#374151;margin-top:4px;font-weight:500">${isFR(locale) ? 'Scanner pour payer' : 'Scan to pay'}</div></div>`
    : '';

  const rows = invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td style="padding:14px 18px;font-size:14px;border-bottom:1px solid #f0f0f0">
        <div style="font-weight:600;color:#111827">${item.description}</div>
        ${(item as any).detail ? `<div style="font-size:12px;color:#4b5563;margin-top:2px">${(item as any).detail}</div>` : ''}
      </td>
      <td style="padding:14px 18px;text-align:center;font-size:14px;color:#374151;border-bottom:1px solid #f0f0f0;font-weight:500;white-space:nowrap">${item.quantity}</td>
      <td style="padding:14px 18px;text-align:right;font-size:14px;color:#374151;border-bottom:1px solid #f0f0f0;white-space:nowrap">${f(item.unit_price)}</td>
      <td style="padding:14px 18px;text-align:center;border-bottom:1px solid #f0f0f0;white-space:nowrap">
        <span style="background:${hexToRgba(accent, 0.1)};color:${accent};font-size:12px;font-weight:700;padding:4px 12px;border-radius:12px;display:inline-block;min-width:50px;text-align:center">${item.vat_rate}%</span>
      </td>
      <td style="padding:14px 18px;text-align:right;font-weight:700;font-size:15px;border-bottom:1px solid #f0f0f0;color:${adjustBrightness(accent, -20)};white-space:nowrap">${f(item.total)}</td>
    </tr>`
  ).join('');

  const discountRow = (invoice.discount_amount ?? 0) > 0
    ? `<span style="font-weight:500">${isFR(locale) ? 'Remise' : 'Discount'} (${invoice.discount_percent}%)</span><span style="white-space:nowrap;flex-shrink:0;font-weight:600">- ${f(invoice.discount_amount ?? 0)}</span>`
    : '';

  const signatureBlock = labels.showSignature
    ? `<div style="margin-top:28px;border:1.5px dashed var(--accent-color-alpha);border-radius:10px;padding:20px 24px;background:#fafafa"><div style="font-size:10px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">✎ ${invoice.document_type === 'purchase_order' ? (isFR(locale) ? 'Bon pour commande' : 'Order accepted') : t.quote.acceptance}</div><div style="display:flex;gap:24px"><div style="flex:1"><div style="font-size:11px;color:#374151;margin-bottom:22px">${isFR(locale) ? 'Date' : 'Date'} :</div><div style="height:1px;background:#d1d5db"></div></div><div style="flex:2"><div style="font-size:11px;color:#374151;margin-bottom:8px">${isFR(locale) ? 'Signature' : 'Signature'} :</div><div style="height:56px;border:1px dashed #d1d5db;border-radius:6px;background:#fff"></div></div></div></div>`
    : '';

  const paymentSection = paymentUrl
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0;padding:22px;background:linear-gradient(135deg,var(--accent-color-alpha),var(--accent-color-beta));border-radius:12px;border:1px solid var(--accent-color-border)"><div style="text-align:center"><div style="font-size:10px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${isFR(locale) ? 'Paiement sécurisé' : 'Secure payment'} ${paymentMethod ? `via ${paymentMethod}` : isFR(locale) ? 'en ligne' : 'online'}</div><a href="${paymentUrl}" style="display:inline-block;background:var(--accent-color);color:#fff;font-weight:700;font-size:15px;padding:15px 40px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px var(--accent-color-shadow)">${isFR(locale) ? 'Payer' : 'Pay'} ${f(invoice.total)} ${isFR(locale) ? 'en ligne' : 'online'}</a></div>${qrBlock}</div>`
    : '';

  const sigBlock = p.signature_url && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    ? `<div style="margin-top:24px;display:flex;justify-content:flex-end"><div style="text-align:center"><div style="font-size:11px;color:#374151;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;font-weight:600">${isFR(locale) ? 'Signature' : 'Signature'}</div><img src="${p.signature_url}" style="height:48px;max-width:180px;object-fit:contain" crossorigin="anonymous"/></div></div>`
    : '';

  const paymentTermsText = formatPaymentTerms(p, localeTyped);
  const disputeText = isFR(locale)
    ? `Tout litige relatif au présent document sera soumis à la compétence exclusive du Tribunal de Commerce du siège social du prestataire. ${t.invoice.disputeJurisdiction}.`
    : `Any dispute relating to this document shall be subject to the exclusive jurisdiction of the Commercial Court of the service provider's registered office. ${t.invoice.disputeJurisdiction}.`;

  const fullPaymentTerms = `${paymentTermsText} ${disputeText} ${isFR(locale) ? "L'acceptation du présent document vaut accord sur les conditions générales de vente." : 'Acceptance of this document constitutes agreement to the terms and conditions of sale.'}`;

  const paymentTermsBlock = `<div style="margin-bottom:20px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid var(--accent-color-alpha)"><div style="font-size:9px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${t.invoice.paymentTerms}</div><div style="font-size:12px;color:#374151;line-height:1.7">${fullPaymentTerms}</div></div>`;

  const defaultLegalMention = [
    p.siret ? `${isFR(locale) ? 'SIRET' : 'Company reg.'} : ${p.siret}` : '',
    p.legal_status === 'auto-entrepreneur' ? (isFR(locale) ? "Dispensé d'immatriculation au RCS et au Répertoire des Métiers" : 'Exempt from trade register registration') : '',
    p.legal_status === 'auto-entrepreneur' ? (isFR(locale) ? 'TVA non applicable, art. 293 B du CGI' : 'VAT not applicable, art. 293 B French Tax Code') : '',
    p.vat_number ? `${isFR(locale) ? 'N° TVA intracommunautaire' : 'VAT number'} : ${p.vat_number}` : '',
    (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') ? t.invoice.penalty : '',
    isFR(locale) ? `Conformément à l'article L.441-9 du Code de commerce, le document est établi en double exemplaire.` : `In accordance with applicable commercial regulations, this document is issued in duplicate.`,
    invoice.document_type === 'quote' ? t.quote.validMention : '',
    invoice.document_type === 'purchase_order' ? t.purchase_order.validMention : '',
    invoice.document_type === 'delivery_note' ? t.delivery_note.mention : '',
  ].filter(Boolean).join(' • ');

  const legalMentionBlock = `<div style="margin-bottom:20px;padding:14px 18px;background:#f9f9f9;border-radius:8px"><div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">${t.invoice.legalMentions}</div><div style="font-size:12px;color:#374151;line-height:1.7">${p.legal_mention || defaultLegalMention}</div></div>`;

  // CGV block
  const cgvBlock = (p as Profile).cgv_text
    ? `<div style="margin-top:16px;padding:12px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Conditions Générales de Vente</div><div style="font-size:11px;color:#374151;line-height:1.5;white-space:pre-wrap">${(p as Profile).cgv_text}</div></div>`
    : '';

  const mandatoryMentionsBlock = getMandatoryMentionsBlock(invoice, p as Profile, accent, localeTyped);
  const insuranceMention = getInsuranceMention(p as Profile, localeTyped);
  const intellectualPropertyMention = getIntellectualPropertyMention(localeTyped);

  // Calculer les couleurs dynamiques pour les lignes
  const accentDark = adjustBrightness(accent, -20);
  const accentColor = accent;

  return {
    accent, currency, locale, localeTyped, f, fd, clientName, clientAddr, labels,
    logoHtml, clientLogoHtml, legal, bankBlock, watermarkHtml, qrBlock, rows, discountRow,
    signatureBlock, paymentSection, sigBlock,
    paymentTermsBlock, legalMentionBlock, cgvBlock, mandatoryMentionsBlock, insuranceMention, intellectualPropertyMention,
    lang: p.language || 'fr',
    invoice, profile: p,
    docLabel: getDocLabel(invoice, p.language || 'fr'),
    translations: t,
  };
}

// ─────────────────────────────────────────────
// FONCTIONS HELPER POUR LES COULEURS
// ─────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function adjustBrightness(hex: string, amount: number): string {
  let color = hex.slice(1);
  let num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  const clamp = (val: number) => Math.max(0, Math.min(255, val));
  return '#' + (clamp(r) << 16 | clamp(g) << 8 | clamp(b)).toString(16).padStart(6, '0');
}

/**
 * Elegant unified template with premium typography and sophisticated design
 * Uses Inter for body text and Crimson Pro for headings
 * Features warm accent color palette with elegant gradients and modern card-based layout
 */
function magnificentTemplate(d: TemplateData, accentColor: string, templateId: number = 1): string {
  // Elegant warm accent palette (inspired by the provided design)
  const accent = accentColor;
  const accentDark = adjustBrightness(accentColor, -20);
  const accentLight = adjustBrightness(accentColor, 40);
  const accentAlpha = hexToRgba(accentColor, 0.08);
  const accentBeta = hexToRgba(accentColor, 0.15);
  const accentGlow = hexToRgba(accentColor, 0.12);
  const accentBorder = hexToRgba(accentColor, 0.25);
  const accentShadow = hexToRgba(accentColor, 0.35);

  // Template-specific styling overrides
  let templateVars = '';
  let templateHeaderStyle = '';
  let templateHeaderFontFamily = "'Crimson Pro', Georgia, 'Times New Roman', serif";
  let templateBodyFontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  let templateAccentBarStyle = '';
  let templateFooterBarStyle = '';

  switch (templateId) {
    case 2: // Classique - serif, dark navy, elegant borders
      templateVars = `
        --bg: #f0f0f2;
        --paper: #ffffff;
        --border: #d4d4d8;
        --border-strong: #a1a1aa;
        --row-alt: #f4f4f5;
        --text: #18181b;
        --text-secondary: #52525b;
        --text-muted: #a1a1aa;
      `;
      templateHeaderStyle = `border-bottom: 3px double ${accentColor}; padding-bottom: 24px; margin-bottom: 32px;`;
      templateAccentBarStyle = `height:6px; background:repeating-linear-gradient(90deg, ${accentColor} 0px, ${accentColor} 12px, transparent 12px, transparent 18px);`;
      templateFooterBarStyle = `background:${accentColor}; border-top:2px solid ${adjustBrightness(accentColor, -30)};`;
      break;
    case 3: // Moderne - accent-driven, rounded cards, vibrant
      templateVars = `
        --bg: #f8fafc;
        --paper: #ffffff;
        --border: #e2e8f0;
        --border-strong: #cbd5e1;
        --row-alt: #f1f5f9;
        --text: #0f172a;
        --text-secondary: #475569;
        --text-muted: #94a3b8;
      `;
      templateHeaderStyle = `border-left: 4px solid ${accentColor}; padding-left: 20px; margin-bottom: 32px;`;
      templateAccentBarStyle = `height:4px; background:linear-gradient(90deg, ${accentColor}, ${adjustBrightness(accentColor, 40)}, ${accentColor}); border-radius:0 0 4px 4px;`;
      templateFooterBarStyle = `background:linear-gradient(135deg, ${accentColor}, ${adjustBrightness(accentColor, -20)}); border-top:2px solid ${adjustBrightness(accentColor, -30)};`;
      break;
    case 4: // Elegant - warm tones, serif headings, soft
      templateVars = `
        --bg: #faf8f5;
        --paper: #fffdf9;
        --border: #e8ddd0;
        --border-strong: #d4c4b0;
        --row-alt: #fdf8f3;
        --text: #1a1007;
        --text-secondary: #6b5c4a;
        --text-muted: #a89880;
      `;
      templateHeaderStyle = `text-align: center; margin-bottom: 40px;`;
      templateAccentBarStyle = `height:3px; background:linear-gradient(90deg, transparent, ${accentColor}, #e0b896, ${accentColor}, transparent);`;
      templateFooterBarStyle = `background:linear-gradient(135deg, ${adjustBrightness(accentColor, -10)}, #e0b896); border-top:2px solid ${adjustBrightness(accentColor, -30)};`;
      break;
    case 5: // Corporate - navy blue, professional, structured
      templateVars = `
        --bg: #f0f4f8;
        --paper: #ffffff;
        --border: #cbd5e1;
        --border-strong: #94a3b8;
        --row-alt: #f0f4f8;
        --text: #0f172a;
        --text-secondary: #334155;
        --text-muted: #64748b;
      `;
      templateHeaderStyle = `background: #1e3a5f; margin: -48px -56px 32px; padding: 32px 56px; color: white; border-radius: 0;`;
      templateAccentBarStyle = `height:5px; background:linear-gradient(90deg, #1e3a5f, ${accentColor}, #1e3a5f);`;
      templateFooterBarStyle = `background:#1e3a5f; border-top:3px solid ${accentColor};`;
      break;
    case 6: // Nature - green, organic, fresh
      templateVars = `
        --bg: #f0fdf4;
        --paper: #ffffff;
        --border: #bbf7d0;
        --border-strong: #86efac;
        --row-alt: #f0fdf4;
        --text: #14532d;
        --text-secondary: #166534;
        --text-muted: #4ade80;
      `;
      templateHeaderStyle = `border-top: 4px solid #166534; padding-top: 24px; margin-bottom: 32px;`;
      templateAccentBarStyle = `height:4px; background:linear-gradient(90deg, #166534, #4ade80, #166534);`;
      templateFooterBarStyle = `background:linear-gradient(135deg, #166534, #14532d); border-top:3px solid #4ade80;`;
      break;
    default: // Minimaliste - clean, minimal (original style)
      templateVars = '';
      templateHeaderStyle = '';
      templateAccentBarStyle = '';
      templateFooterBarStyle = '';
      break;
  }

  // CSS variables for dynamic theming
  const cssVars = `
    --bg: #f5f0eb;
    --paper: #ffffff;
    --accent: ${accent};
    --accent-dark: ${accentDark};
    --accent-light: ${accentLight};
    --accent-alpha: ${accentAlpha};
    --accent-beta: ${accentBeta};
    --accent-glow: ${accentGlow};
    --accent-border: ${accentBorder};
    --accent-shadow: ${accentShadow};
    --text: #1a1a1a;
    --text-secondary: #5a5a5a;
    --text-muted: #999999;
    --border: #e8e2db;
    --border-strong: #d4ccc3;
    --row-alt: #faf8f6;
    --success: #4a9e7d;
    --danger: #c75c5c;
    ${templateVars}
  `;

  // Client info block
  const clientInfo = `
    <div style="font-weight:700;font-size:16px;margin-bottom:6px;color:#1a1a1a">${d.clientName}</div>
    <div style="font-size:13px;color:#5a5a5a;line-height:1.7">
      ${d.clientAddr}
      ${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}
      ${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}
      ${d.invoice.client?.siret?`<br/><span style="font-size:11px;color:#6b7280;font-weight:500">SIRET ${d.invoice.client.siret}</span>`:''}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="${d.lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${d.invoice.number} - ${d.docLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Pro:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: var(--text);
      background: var(--bg);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    @page {
      margin: 0;
      size: A4;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .accent-text { color: var(--accent); }
    .accent-bg { background-color: var(--accent); }
    .accent-border { border-color: var(--accent); }
    .accent-bg-light { background-color: var(--accent-alpha); }
    .crimson { font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif; }

    /* Responsive pour mobile */
    @media screen and (max-width: 768px) {
      body { font-size: 11px; }
      .invoice-paper { margin: 0 !important; border-radius: 0 !important; }

      /* Ajuster le total pour mobile */
      .totals-section { flex-direction: column !important; }
      .totals-section > div { width: 100% !important; }

      /* Agrandir le total sur mobile */
      .total-amount { font-size: 32px !important; }

      /* Footer responsive */
      .footer-bar { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
      .footer-total { width: 100% !important; justify-content: center !important; }
    }

    /* Amélioration de l'impression */
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
      .invoice-paper { box-shadow: none !important; margin: 0 !important; }

      /* S'assurer que le total est bien visible à l'impression */
      .total-highlight {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    /* Animation subtile pour attirer l'attention sur le total */
    @keyframes totalGlow {
      0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      50% { box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
    }
    .total-highlight { animation: totalGlow 3s ease-in-out infinite; }
  </style>
</head>
<body style="${cssVars}">
  ${d.watermarkHtml}

  <!-- Invoice Paper -->
  <div style="max-width:900px;margin:40px auto;background:var(--paper);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 32px rgba(0,0,0,0.08),0 24px 60px rgba(0,0,0,0.06);overflow:hidden;position:relative">

    <!-- Accent gradient bar -->
    <div style="${templateAccentBarStyle || 'height:4px;background:linear-gradient(90deg,var(--accent-dark),var(--accent),#e0b896,var(--accent-dark));background-size:300% 100%'}"></div>

    <!-- Main content -->
    <div style="padding:48px 56px;position:relative;z-index:1">

      <!-- Header section -->
      <div style="${templateHeaderStyle}">
      <div style="display:grid;grid-template-columns:1fr auto;gap:40px;margin-bottom:44px;align-items:start${templateId === 5 ? ';color:white' : ''}">

        <!-- Left: Brand -->
        <div style="display:flex;align-items:center;gap:18px">
          ${d.profile.logo_url ? `
          <div style="width:62px;height:62px;flex-shrink:0">
            <img src="${d.profile.logo_url}" style="width:100%;height:100%;object-fit:contain;border-radius:8px" onerror="this.style.display='none'" crossorigin="anonymous"/>
          </div>` : `
          <div style="width:62px;height:62px;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent-dark));border-radius:14px;display:flex;align-items:center;justify-content:center">
            <svg width="32" height="32" viewBox="0 0 62 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="62" height="62" rx="14" fill="white" opacity="0.2"/>
              <path d="M18 20L31 14L44 20V34C44 42 31 48 31 48C31 48 18 42 18 34V20Z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M26 30L29.5 33.5L37 26" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>`}
          <div>
            <h1 style="font-family:'Crimson Pro',serif;font-size:26px;font-weight:800;color:var(--text);line-height:1.15;letter-spacing:-0.02em;margin-bottom:3px">${d.profile.company_name||''}</h1>
            <p style="font-size:12px;color:var(--text-muted);margin:0;font-weight:500;letter-spacing:0.08em;text-transform:uppercase">${d.profile.legal_status ? d.profile.legal_status.replace('-',' ') : ''}</p>
          </div>
        </div>

        <!-- Right: Document meta -->
        <div style="text-align:right">
          <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);background:var(--accent-alpha);padding:5px 14px;border-radius:20px;border:1px solid var(--accent-border);margin-bottom:12px">
            ${d.docLabel}
          </div>
          <div style="font-family:'Crimson Pro',serif;font-size:32px;font-weight:700;color:var(--text);line-height:1.1;margin-bottom:14px">${d.invoice.number}</div>
          <div style="display:flex;gap:24px;justify-content:flex-end">
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">${d.labels.issuedLabel}</div>
              <div style="font-size:14px;color:var(--text);font-weight:500">${d.fd(d.invoice.issue_date)}</div>
            </div>
            ${d.labels.dueDateSection ? `
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">Échéance</div>
              <div style="font-size:14px;color:var(--accent-dark);font-weight:600">${d.labels.dueDateSection.replace('Échéance : ','')}</div>
            </div>` : ''}
          </div>
        </div>
      </div>
      </div>${templateHeaderStyle ? '' : ''}

      <!-- Divider -->
      <div style="height:1px;background:var(--border);margin-bottom:36px;position:relative">
        <div style="position:absolute;left:0;top:0;width:80px;height:1px;background:var(--accent)"></div>
      </div>

      <!-- Parties section -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px">
        <!-- From -->
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-building" style="color:var(--accent);font-size:11px"></i> Émetteur
          </div>
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">${d.profile.company_name||''}</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
            ${d.profile.address||''}${d.profile.address?'<br/>':''}
            ${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.country&&d.profile.country!=='France'?`<br/>${d.profile.country}`:''}
          </div>
        </div>

        <!-- To -->
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-user" style="color:var(--accent);font-size:11px"></i> ${d.labels.billedToLabel}
          </div>
          ${d.clientLogoHtml}
          ${clientInfo}
        </div>
      </div>

      <!-- Items table -->
      <div style="margin-bottom:36px;border-radius:12px;border:1px solid var(--border);overflow:hidden">
        <table>
          <thead>
            <tr style="background:var(--row-alt)">
              <th style="padding:14px 18px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:left;border-bottom:2px solid var(--border-strong);width:40%">Description</th>
              <th style="padding:14px 18px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:center;border-bottom:2px solid var(--border-strong);width:10%">Qté</th>
              <th style="padding:14px 18px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:right;border-bottom:2px solid var(--border-strong);width:15%">P.U. HT</th>
              <th style="padding:14px 18px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:center;border-bottom:2px solid var(--border-strong);width:10%">TVA</th>
              <th style="padding:14px 18px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:right;border-bottom:2px solid var(--border-strong);width:15%;color:var(--accent)">Total HT</th>
            </tr>
          </thead>
          <tbody>${d.rows}</tbody>
        </table>
      </div>

      <!-- Totals section -->
      <div class="totals-section" style="display:flex;justify-content:flex-end;margin-bottom:40px">
        <div style="width:420px;max-width:100%">
          <!-- Ligne sous-total -->
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;font-size:14px;color:var(--text-secondary);background:#fafafa;border-radius:8px;margin-bottom:8px">
            <span style="font-weight:500">Sous-total HT</span>
            <span style="font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0">${d.f(d.invoice.subtotal)}</span>
          </div>

          <!-- TVA détaillée par taux -->
          ${(() => {
            const discountPct = d.invoice.discount_percent ?? 0;
            const vatGroups = new Map<number, { base: number; vat: number }>();
            for (const item of d.invoice.items) {
              const ht = (item.total ?? item.quantity * item.unit_price) * (1 - discountPct / 100);
              const rate = item.vat_rate || 0;
              const existing = vatGroups.get(rate) || { base: 0, vat: 0 };
              existing.base += ht;
              existing.vat += ht * (rate / 100);
              vatGroups.set(rate, existing);
            }
            return Array.from(vatGroups.entries()).sort(([a], [b]) => a - b).map(([rate, { base, vat }]) =>
              `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:8px 16px;font-size:12px;color:var(--text-secondary);background:#fafafa;border-radius:8px;margin-bottom:4px"><span style="font-weight:500">TVA ${rate}% <span style="color:var(--text-muted);font-size:11px">(base ${d.f(base)})</span></span><span style="font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0">${d.f(vat)}</span></div>`
            ).join('');
          })()}

          <!-- Ligne remise (si applicable) -->
          ${d.discountRow ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 16px;font-size:14px;color:#dc2626;background:#fef2f2;border-radius:8px;margin-bottom:8px;border:1px solid #fecaca">${d.discountRow}</div>` : ''}

          <!-- Séparateur -->
          <div style="height:2px;background:linear-gradient(90deg,transparent,var(--border),transparent);margin:12px 0"></div>

          <!-- TOTAL TTC - Mis en valeur -->
          <div class="total-highlight" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;background:linear-gradient(135deg,${hexToRgba(d.accent, 0.08)},${hexToRgba(d.accent, 0.15)});border-radius:12px;border:2px solid ${hexToRgba(d.accent, 0.2)};box-shadow:0 4px 12px ${hexToRgba(d.accent, 0.15)}">
            <div style="min-width:0">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:4px">${d.lang === 'fr' ? 'Montant total' : 'Total amount'}</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);word-break:break-word">${d.labels.totalLabel}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div class="total-amount" style="font-family:'Crimson Pro',serif;font-size:34px;font-weight:800;color:${d.accent};font-variant-numeric:tabular-nums;line-height:1;white-space:nowrap">${d.f(d.invoice.total)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-weight:500">TTC ${d.currency === 'EUR' ? '€' : d.currency}</div>
            </div>
          </div>

          <!-- Indicateur visuel -->
          <div style="display:flex;align-items:center;justify-content:flex-end;margin-top:12px;gap:6px">
            <div style="width:8px;height:8px;background:${d.accent};border-radius:50%;animation:pulse 2s ease-in-out infinite"></div>
            <span style="font-size:11px;color:var(--text-muted);font-weight:500">${d.lang === 'fr' ? 'Montant à régler' : 'Amount due'}</span>
          </div>
        </div>
      </div>

      <!-- Animation CSS pour l'indicateur -->
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      </style>

      <!-- Notes section -->
      ${d.invoice.notes ? `<div style="margin-bottom:28px;padding:18px 22px;background:var(--accent-alpha);border-radius:12px;border-left:4px solid var(--accent)"><div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-sticky-note" style="font-size:11px"></i> Notes</div><div style="font-size:13px;color:var(--text-secondary);line-height:1.7">${d.invoice.notes}</div></div>` : ''}

      <!-- Mentions obligatoires -->
      ${d.mandatoryMentionsBlock}

      <!-- Assurance professionnelle (si applicable) -->
      ${d.insuranceMention}

      <!-- Payment terms & Bank details -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:40px;margin-bottom:36px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-file-contract" style="color:var(--accent);font-size:11px"></i> ${d.translations.invoice.paymentTerms}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.75">
            ${d.profile.custom_payment_terms ? d.profile.custom_payment_terms : (d.profile.payment_terms && d.profile.payment_terms.match(/^\d+$/) ? `${d.translations.invoice.paymentWithin(parseInt(d.profile.payment_terms, 10))}` : d.translations.invoice.paymentUponReceipt)}
            <br/>${d.invoice.document_type === 'invoice' || d.invoice.document_type === 'deposit' ? `${d.translations.invoice.disputeJurisdiction}.` : ''}
          </div>
        </div>
        ${(d.invoice.document_type === 'invoice' || d.invoice.document_type === 'deposit') && (d.profile.iban || d.profile.bank_name) ? `
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-university" style="color:var(--accent);font-size:11px"></i> ${d.translations.invoice.bankDetails}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2">
            ${d.profile.bank_name ? `<div><strong style="color:var(--text)">${d.lang === 'fr' ? 'Banque' : 'Bank'} :</strong> ${d.profile.bank_name}</div>` : ''}
            ${d.profile.iban ? `<div><strong style="color:var(--text)">IBAN :</strong> ${d.profile.iban}</div>` : ''}
            ${d.profile.bic ? `<div><strong style="color:var(--text)">BIC :</strong> ${d.profile.bic}</div>` : ''}
          </div>
        </div>` : ''}
      </div>

      <!-- Propriété intellectuelle -->
      ${d.intellectualPropertyMention}

      <!-- Payment section -->
      ${d.paymentSection}

      <!-- CGV -->
      ${d.cgvBlock}

      <!-- Legal mentions -->
      ${d.legalMentionBlock}

      <!-- Signature -->
      ${d.sigBlock}

      <!-- Signature block for quotes -->
      ${d.signatureBlock}

      <!-- Footer -->
      <div style="margin-top:48px;padding-top:24px;border-top:2px solid var(--accent-border);text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:24px;font-weight:800;color:var(--text);letter-spacing:-1px;margin-bottom:8px">${d.invoice.number}</div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.8">
          ${d.profile.company_name||''}
          ${d.profile.siret ? `${d.lang === 'fr' ? ' · SIRET' : ' · Company reg.'} ${d.profile.siret}` : ''}
          ${d.profile.vat_number ? `${d.lang === 'fr' ? ' · N° TVA' : ' · VAT'} ${d.profile.vat_number}` : ''}
          ${d.profile.email ? ` · ${d.profile.email}` : ''}
        </div>
        <div style="font-size:9px;color:var(--border-strong);margin-top:6px">
          ${d.docLabel} ${d.translations.common.generatedBy} · ${d.translations.common.conformToLaw}
          ${d.invoice.document_type === 'invoice' || d.invoice.document_type === 'deposit' ? ` · ${d.translations.invoice.legalReference}` : ''}
        </div>
      </div>

    </div>

    <!-- Footer bar avec total en évidence -->
    <div class="footer-bar" style="${templateFooterBarStyle || 'background:linear-gradient(135deg,var(--accent-dark),var(--accent));border-top:3px solid var(--accent-dark)'};padding:16px 56px;display:flex;justify-content:space-between;align-items:center;gap:24px">
      <div style="display:flex;align-items:center;gap:24px;min-width:0;overflow:hidden">
        <div style="font-size:11px;color:rgba(255,255,255,0.9);display:flex;align-items:center;gap:6px;font-weight:500;white-space:nowrap">
          <i class="fas fa-file-invoice" style="color:rgba(255,255,255,0.7);font-size:10px"></i> ${d.docLabel} ${d.translations.common.generatedBy}
        </div>
        <div style="display:flex;gap:18px;overflow:hidden">
          ${d.profile.email ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);display:flex;align-items:center;gap:5px;white-space:nowrap"><i class="fas fa-envelope" style="color:rgba(255,255,255,0.6);font-size:10px"></i> ${d.profile.email}</div>` : ''}
          ${d.profile.phone ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);display:flex;align-items:center;gap:5px;white-space:nowrap"><i class="fas fa-phone" style="color:rgba(255,255,255,0.6);font-size:10px"></i> ${d.profile.phone}</div>` : ''}
          ${d.profile.website ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);display:flex;align-items:center;gap:5px;white-space:nowrap"><i class="fas fa-globe" style="color:rgba(255,255,255,0.6);font-size:10px"></i> ${d.profile.website}</div>` : ''}
        </div>
      </div>

      <!-- Total en gros dans le footer pour visibilité maximale -->
      <div class="footer-total" style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.15);padding:10px 20px;border-radius:8px;backdrop-filter:blur(10px);flex-shrink:0">
        <div style="text-align:right">
          <div style="font-size:9px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;white-space:nowrap">${d.labels.totalLabel}</div>
          <div style="font-size:24px;font-weight:800;color:#fff;font-family:'Crimson Pro',serif;letter-spacing:-0.5px;white-space:nowrap">${d.f(d.invoice.total)}</div>
        </div>
        <div style="width:1px;height:24px;background:rgba(255,255,255,0.3)"></div>
        <i class="fas fa-check-circle" style="color:rgba(255,255,255,0.9);font-size:20px"></i>
      </div>
    </div>

    <!-- Bottom accent bar -->
    <div style="${templateAccentBarStyle || 'height:4px;background:linear-gradient(90deg,var(--accent-dark),var(--accent),#e0b896,var(--accent-dark));background-size:300% 100%'}"></div>

  </div>
</body>
</html>`;
}

// ── Template 1: Minimaliste ──
export function templateMinimaliste(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 1);
}

// ── Template 2: Classique ──
export function templateClassique(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 2);
}

// ── Template 3: Moderne ──
export function templateModerne(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 3);
}

// ── Template 4: Élégant ──
export function templateElegant(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 4);
}

// ── Template 5: Corporate ──
export function templateCorporate(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 5);
}

// ── Template 6: Nature ──
export function templateNature(d: TemplateData): string {
  return magnificentTemplate(d, d.accent, 6);
}

// ── Template spécial : Bon de commande ──
export function templatePurchaseOrder(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template spécial : Bon de livraison ──
export function templateDeliveryNote(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Apply a custom HTML template with variable interpolation ──
export function applyCustomTemplate(html: string, d: TemplateData): string {
  const discountAmount = d.invoice.discount_amount ?? 0;
  const replacements: Record<string, string> = {
    // Accent / style
    '{{accent_color}}': d.accent,
    '{{currency}}': d.currency,
    '{{language}}': d.lang,
    // Company
    '{{company_name}}': d.profile.company_name || '',
    '{{company_address}}': [d.profile.address, d.profile.postal_code && d.profile.city ? `${d.profile.postal_code} ${d.profile.city}` : '', d.profile.country || ''].filter(Boolean).join(', '),
    '{{company_logo}}': d.logoHtml,
    '{{company_phone}}': d.profile.phone || '',
    '{{company_email}}': d.profile.email || '',
    '{{company_siret}}': d.profile.siret || '',
    '{{company_vat_number}}': d.profile.vat_number || '',
    '{{company_legal_status}}': d.profile.legal_status || '',
    // Document meta
    '{{doc_label}}': d.docLabel,
    '{{invoice_number}}': d.invoice.number,
    '{{issue_date}}': d.fd(d.invoice.issue_date),
    '{{due_date}}': d.labels.dueDateSection || '',
    '{{issued_label}}': d.labels.issuedLabel,
    '{{billed_to_label}}': d.labels.billedToLabel,
    // Client
    '{{client_name}}': d.clientName,
    '{{client_address}}': d.clientAddr,
    '{{client_email}}': d.invoice.client?.email || '',
    '{{client_phone}}': d.invoice.client?.phone || '',
    '{{client_siret}}': d.invoice.client?.siret || '',
    '{{client_logo}}': d.clientLogoHtml,
    // Items & totals
    '{{items_table}}': d.rows,
    '{{subtotal}}': d.f(d.invoice.subtotal),
    '{{vat_amount}}': d.f(d.invoice.vat_amount),
    '{{discount_amount}}': discountAmount > 0 ? d.f(discountAmount) : '',
    '{{discount_percent}}': discountAmount > 0 ? `${d.invoice.discount_percent ?? 0}%` : '',
    '{{total}}': d.f(d.invoice.total),
    '{{total_label}}': d.labels.totalLabel,
    // Notes
    '{{notes}}': d.invoice.notes || '',
    '{{notes_block}}': d.invoice.notes ? `<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">${d.translations.invoice.notes}</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>` : '',
    // Blocks
    '{{bank_block}}': d.bankBlock,
    '{{payment_section}}': d.paymentSection,
    '{{payment_terms_block}}': d.paymentTermsBlock,
    '{{legal_mention}}': d.legal,
    '{{legal_mention_block}}': d.legalMentionBlock,
    '{{cgv_block}}': d.cgvBlock,
    '{{mandatory_mentions}}': d.mandatoryMentionsBlock,
    '{{insurance_mention}}': d.insuranceMention,
    '{{intellectual_property_mention}}': d.intellectualPropertyMention,
    // Signature / watermark / QR
    '{{signature_block}}': d.signatureBlock,
    '{{signature_image}}': d.sigBlock,
    '{{watermark}}': d.watermarkHtml,
    '{{qrcode_block}}': d.qrBlock,
  };

  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  // Clean up any unreplaced placeholders to avoid raw {{placeholder}} in output
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  // Sanitize: remove script tags and event handlers (security)
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  result = result.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  return result;
}
