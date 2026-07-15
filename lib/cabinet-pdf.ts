/**
 * ASTRÉE (CIBLE 2b) — Normalisation d'une facture d'honoraires cabinet
 * (table `cabinet_invoices`) vers la forme attendue par le MOTEUR PDF UNIFIÉ
 * (lib/pdf-server.generatePdfBuffer), qui consomme un objet type `Invoice` + `Profile`.
 *
 * On réutilise ainsi le moteur pdf-lib (Inter, fontkit, templates, conditions
 * légales) SANS le dupliquer : une facture cabinet n'est rien d'autre qu'une
 * facture dont l'émetteur est le cabinet et le destinataire est le client cabinet.
 */
import type { Invoice, Profile } from '@/types';

export interface CabinetInvoiceRow {
  id: string;
  number: string;
  client_id: string | null;
  status: string;
  amount_ht: number | string | null;
  amount_tva: number | string | null;
  amount_ttc: number | string | null;
  issue_date: string;
  due_date: string | null;
  objet: string | null;
  description: string | null;
  items: any[] | null;
}

export interface CabinetClientRow {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  siret: string | null;
  address: string | null;
  zip_code: string | null;
  city: string | null;
  phone: string | null;
  vat_number?: string | null;
  client_type: string | null;
  client_user_id: string | null;
  profile?: {
    email?: string | null;
    company_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

export interface CabinetRow {
  id: string;
  name: string;
  siret?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  vat_number?: string | null;
  // DÉDALOS (CIBLE 3a/3c) — IBAN + template PDF stockés dans le jsonb settings.
  settings?: Record<string, unknown> | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Nom affichable du client cabinet (manuel ou lié). */
export function resolveCabinetClientName(client: CabinetClientRow | null | undefined): string {
  if (!client) return 'Client';
  return (
    client.company_name
    || client.contact_name
    || client.profile?.company_name
    || [client.profile?.first_name, client.profile?.last_name].filter(Boolean).join(' ').trim()
    || 'Client'
  );
}

/** Email destinataire : contact_email cabinet → email du profil lié. */
export function resolveCabinetClientEmail(client: CabinetClientRow | null | undefined): string | null {
  if (!client) return null;
  return client.contact_email || client.profile?.email || null;
}

/**
 * Transforme une facture cabinet + son client + le cabinet émetteur en entrées
 * du moteur PDF unifié. Aucune mutation des données sources.
 */
export function cabinetInvoiceToPdfInputs(
  ci: CabinetInvoiceRow,
  client: CabinetClientRow | null,
  cabinet: CabinetRow,
): { invoice: Invoice; profile: Profile } {
  const recipientName = resolveCabinetClientName(client);
  const recipientEmail = resolveCabinetClientEmail(client);

  const rawItems = Array.isArray(ci.items) ? ci.items : [];
  const items = rawItems.length > 0
    ? rawItems.map((it: any) => ({
        description: it.description || ci.objet || it.label || 'Honoraires',
        quantity: num(it.quantity ?? 1),
        unit_price: num(it.unit_price ?? it.price ?? 0),
        vat_rate: num(it.vat_rate ?? it.tva_rate ?? 0),
        total: num(it.total ?? num(it.quantity ?? 1) * num(it.unit_price ?? it.price ?? 0)),
      }))
    : [{
        description: ci.objet || ci.description || 'Honoraires',
        quantity: 1,
        unit_price: num(ci.amount_ht),
        vat_rate: 0,
        total: num(ci.amount_ht),
      }];

  const invoice = {
    id: ci.id,
    number: ci.number,
    document_type: 'invoice',
    status: ci.status,
    issue_date: ci.issue_date,
    due_date: ci.due_date,
    notes: ci.objet || ci.description || null,
    items,
    subtotal: num(ci.amount_ht),
    vat_amount: num(ci.amount_tva),
    discount_amount: 0,
    discount_percent: 0,
    total: num(ci.amount_ttc),
    client: { name: recipientName },
    client_name_override: recipientName,
    client_email: recipientEmail,
    client_address: client?.address || null,
    client_city: client?.city || null,
    client_postal_code: client?.zip_code || null,
    client_siret: client?.siret || null,
    client_vat_number: client?.vat_number || null,
    client_phone: client?.phone || null,
    // Pas de paiement en ligne sur les honoraires cabinet (récouvrement hors-ligne).
    payment_terms: null,
    payment_short_token: null,
  } as unknown as Invoice;

  // DÉDALOS (CIBLE 3a/3c) — template PDF + coordonnées bancaires issus du jsonb
  // cabinet.settings (renseignés depuis /cabinet/settings). Défaut : template 7 (PUR,
  // minimaliste épuré Stripe/Linear) — rendu professionnel pour une facture d'honoraires,
  // évite le « nom de société prisonnier d'un rectangle de couleur ».
  const s = (cabinet.settings ?? {}) as Record<string, any>;
  const pdfTemplate = Number(s.pdf_template);
  const templateId =
    Number.isFinite(pdfTemplate) && pdfTemplate >= 1 && pdfTemplate <= 9 ? pdfTemplate : 7;

  const profile = {
    company_name: cabinet.name,
    siret: cabinet.siret || null,
    address: cabinet.address || null,
    postal_code: cabinet.zip_code || null,
    city: cabinet.city || null,
    phone: cabinet.phone || null,
    email: cabinet.email || null,
    vat_number: cabinet.vat_number || null,
    logo_url: cabinet.logo_url || null,
    accent_color: cabinet.primary_color || '#10b981',
    template_id: templateId,
    currency: 'EUR',
    language: 'fr',
    iban: s.iban || null,
    bank_name: s.bank_name || null,
    bic: s.bic || null,
    legal_status: s.legal_status || null,
    legal_mention: s.legal_mention || null,
    payment_terms: null,
  } as unknown as Profile;

  return { invoice, profile };
}
