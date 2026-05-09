// ---------------------------------------------------------------------------
// Shared OCR utilities — single source of truth for all OCR endpoints
// Ensures consistent sanitization, normalization, and validation across
// ocr-receipt, ocr-bulk, ocr-receipt-multicurrency, and ocr-multi-page.
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const VALID_CATEGORIES = [
  'transport',
  'meals',
  'accommodation',
  'equipment',
  'office',
  'shopping',
  'mileage',
  'telecom',
  'insurance',
  'software',
  'other',
] as const;

export type ExpenseCategory = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(cat: unknown): cat is ExpenseCategory {
  return typeof cat === 'string' && (VALID_CATEGORIES as readonly string[]).includes(cat);
}

export function sanitizeCategory(cat: unknown): ExpenseCategory {
  return isValidCategory(cat) ? cat : 'other';
}

// ---------------------------------------------------------------------------
// Value sanitizers
// ---------------------------------------------------------------------------

export function sanitizeNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

export function sanitizeDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? `${y}-${m}-${d}` : null;
}

export function sanitizeString(val: unknown): string | null {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

export function sanitizePaymentMethod(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const n = val.toLowerCase().trim();
  if (n === 'carte' || n === 'card') return 'card';
  if (n === 'especes' || n === 'espèces' || n === 'cash') return 'cash';
  if (n === 'virement' || n === 'transfer') return 'transfer';
  if (n === 'cheque' || n === 'chèque' || n === 'check') return 'check';
  return null;
}

// AI returns confidence as 0-100 per prompt instructions — normalize to 0-1
export function normalizeConfidence(val: unknown): number {
  const n = sanitizeNumeric(val) ?? 0;
  return Math.min(Math.max(n / 100, 0), 1);
}

// ---------------------------------------------------------------------------
// Storage path — UUID-based to prevent timestamp collisions under concurrency
// ---------------------------------------------------------------------------

export function generateStoragePath(userId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${randomUUID()}_${sanitized}`;
}

// ---------------------------------------------------------------------------
// PCG (Plan Comptable Général) account code validation
// ---------------------------------------------------------------------------

const VALID_PCG_CODES = new Set([
  '601000', '602000', '604000', '606100', '606150', '606400', '606800',
  '611000', '612000', '613000', '614000', '615000', '616000',
  '618100', '618300', '618400', '618500',
  '621000', '622000', '625100', '625600', '626000', '627000',
  '631000', '635000', '641000', '645000', '648000',
]);

export function validatePCGCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^\d{6}$/.test(code) && VALID_PCG_CODES.has(code);
}

// ---------------------------------------------------------------------------
// Line item sanitizer with bounds validation
// ---------------------------------------------------------------------------

export interface SanitizedLineItem {
  description: string;
  quantity: number;
  unit_price: number | null;
  total: number | null;
  vat_rate: number | null;
  account_code: string | null;
  account_label: string | null;
}

export function sanitizeLineItems(raw: unknown): SanitizedLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => {
      const quantity = sanitizeNumeric(v.quantity) ?? 1;
      const unit_price = sanitizeNumeric(v.unit_price);
      const total = sanitizeNumeric(v.total);
      const vatRaw = sanitizeNumeric(v.vat_rate);
      const vat_rate = vatRaw !== null && vatRaw >= 0 && vatRaw <= 100 ? vatRaw : null;
      const account_code = sanitizeString(v.account_code);

      return {
        description: sanitizeString(v.description) ?? 'Article',
        quantity,
        unit_price,
        total,
        vat_rate,
        account_code: validatePCGCode(account_code) ? account_code : null,
        account_label: sanitizeString(v.account_label),
      };
    });
}

// ---------------------------------------------------------------------------
// VAT details sanitizer
// ---------------------------------------------------------------------------

export interface SanitizedVatDetail {
  rate: number | null;
  base: number | null;
  amount: number | null;
}

export function sanitizeVatDetails(raw: unknown): SanitizedVatDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      rate: sanitizeNumeric(v.rate),
      base: sanitizeNumeric(v.base),
      amount: sanitizeNumeric(v.amount),
    }));
}

// ---------------------------------------------------------------------------
// Full OCR prompt — used by both ocr-receipt and ocr-bulk for consistency
// ---------------------------------------------------------------------------

export function buildOcrPrompt(): string {
  return `Tu es un expert-comptable français diplômé, spécialisé dans la saisie de pièces comptables et le Plan Comptable Général (PCG). Tu analyses des justificatifs de dépenses pour produire une écriture comptable complète prête à être saisie dans un logiciel de comptabilité.

CONSIGNES CRITIQUES :
1. Analyse CHAQUE ligne du document avec attention.
2. Ne devine JAMAIS une information qui n'est pas visible — si une donnée est illisible, absente ou ambiguë, mets STRICTEMENT null.
3. Distingue bien le montant HT (hors taxes) du montant TTC (toutes taxes comprises).
4. Si plusieurs taux de TVA sont présents, détaille-les tous dans vat_details.
5. Pour les tickets de caisse, extrais chaque ligne d'achat dans line_items avec sa quantité et son prix unitaire quand c'est visible.
6. La catégorie doit être la plus précise possible parmi la liste autorisée.
7. Le champ supplier_category indique le TYPE d'établissement.
8. Le champ confidence est ta confiance GLOBALE dans l'extraction (0-100).
9. is_duplicate doit être true UNIQUEMENT si le document semble être un doublon.
10. Le champ payment_method déduit le mode de paiement si visible.
11. Les montants doivent être des NOMBRES, sans symbole monétaire.
12. Les dates doivent être au format YYYY-MM-DD (ISO 8601).

COMPTABILISATION — PLAN COMPTABLE GÉNÉRAL (PCG) :
Pour CHAQUE dépense, attribue le numéro de compte PCG le plus précis parmi :
- 601000 : Achats stockés – Matières premières
- 602000 : Achats stockés – Autres approvisionnements
- 604000 : Achats d'études et prestations de services
- 606100 : Achats non stockés – Énergie (électricité, gaz)
- 606150 : Achats non stockés – Carburants
- 606400 : Achats non stockés – Fournitures de bureau
- 606800 : Achats non stockés – Autres approvisionnements
- 611000 : Sous-traitance générale
- 612000 : Redevances de crédit-bail
- 613000 : Locations (immobilier, matériel)
- 614000 : Charges locatives
- 615000 : Entretien et réparations
- 616000 : Primes d'assurance
- 618100 : Services extérieurs – Documentation générale
- 618300 : Services extérieurs – Logiciels et abonnements SaaS
- 618400 : Services extérieurs – Documentation technique
- 618500 : Services extérieurs – Frais de formation
- 621000 : Personnel extérieur
- 622000 : Rémunérations d'intermédiaires
- 625100 : Indemnités kilométriques
- 625600 : Missions, réceptions, déplacements
- 626000 : Frais de télécommunications
- 627000 : Services bancaires
- 631000 : Impôts et taxes – Charges sociales
- 635000 : Autres impôts et taxes
- 641000 : Rémunérations du personnel
- 645000 : Charges de sécurité sociale
- 648000 : Autres charges de gestion courante

Le champ "account_code" doit contenir le numéro de compte PCG (6 chiffres).
Le champ "account_label" doit contenir le libellé exact du compte PCG.

CATÉGORIES AUTORISÉES pour "category" :
- transport (train, avion, taxi, Uber, péage, parking, location voiture, carburant)
- meals (restaurant, cantine, livraison repas, épicerie pour repas)
- accommodation (hôtel, Airbnb, location courte durée)
- equipment (matériel informatique, outils, machines)
- office (fournitures de bureau, papeterie, impression)
- shopping (achats divers, vêtements professionnels)
- mileage (indemnité kilométrique, frais de déplacement personnel)
- telecom (téléphone, internet, mobile)
- insurance (assurance, mutuelle, garantie)
- software (abonnement SaaS, licence, abonnement digital)
- other (tout ce qui ne rentre pas dans les catégories ci-dessus)

Retourne UNIQUEMENT du JSON valide, sans texte autour, sans markdown, sans commentaires :

{
  "vendor": "Nom exact du fournisseur / magasin / établissement",
  "vendor_address": "Adresse complète du vendeur si visible, sinon null",
  "vendor_siret": "Numéro SIRET du vendeur si visible (14 chiffres), sinon null",
  "vendor_vat_number": "Numéro de TVA intracommunautaire du vendeur si visible (FR + 11 chiffres), sinon null",
  "amount": 0.00,
  "ht_amount": 0.00,
  "vat_amount": 0.00,
  "vat_rate": 20.0,
  "vat_details": [
    { "rate": 20.0, "base": 0.00, "amount": 0.00 }
  ],
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD ou null",
  "invoice_number": "Numéro de facture ou de ticket, sinon null",
  "description": "Description courte et précise de l'ensemble des achats",
  "category": "transport|meals|accommodation|equipment|office|shopping|mileage|telecom|insurance|software|other",
  "currency": "EUR",
  "line_items": [
    { "description": "Description de l'article", "quantity": 1, "unit_price": 0.00, "total": 0.00, "vat_rate": 20.0, "account_code": "606400", "account_label": "Fournitures de bureau" }
  ],
  "confidence": 85,
  "payment_method": "card|cash|transfer|check|null",
  "is_duplicate": false,
  "supplier_category": "restaurant|gas_station|hotel|supermarket|pharmacy|bookstore|clothing|electronics|telecom_provider|insurance_company|software_provider|transport_company|other",
  "account_code": "625600",
  "account_label": "Missions, réceptions, déplacements",
  "document_type": "invoice|receipt|expense_report|rent_receipt|credit_note|purchase_order|delivery_note|quote|other",
  "is_professional_expense": true,
  "cost_center": "string ou null"
}

Analyse maintenant ce document et produis l'écriture comptable avec la plus grande rigueur professionnelle.`;
}

// ---------------------------------------------------------------------------
// Multi-page PDF OCR prompt — extract ALL invoices from a multi-page PDF
// ---------------------------------------------------------------------------

export function buildMultiPagePDFPrompt(totalPages: number): string {
  return `Tu es un expert-comptable français spécialisé dans l'extraction de MULTIPLES factures depuis des PDFs multipages.

CONTEXTE : Le document PDF que tu vas analyser contient ${totalPages} pages. Il peut y avoir :
- UNE SEULE facture répartie sur plusieurs pages
- PLUSIEURS factures différentes sur des pages différentes
- Un mélange de factures et d'autres documents

CONSIGNES CRITIQUES :
1. Analyse TOUTES les pages du PDF systématiquement
2. Identifie TOUTES les factures présentes (peut être 1, 2, 3, ou plus)
3. Pour CHAQUE facture détectée, crée un objet d'extraction complet
4. Si UNE facture est répartie sur plusieurs pages, regroupe les informations
5. Ne devine JAMAIS une information non visible — mets null si absent
6. Les montants doivent être des NOMBRES, sans symbole monétaire
7. Les dates doivent être au format YYYY-MM-DD (ISO 8601)

FORMAT DE SORTIE OBLIGATOIRE :
Retourne UNIQUEMENT du JSON valide avec cette structure exacte :

{
  "invoices": [
    {
      "vendor": "Nom du fournisseur",
      "vendor_siret": "SIRET si visible",
      "vendor_vat_number": "TVA si visible",
      "invoice_number": "Numéro de facture",
      "date": "YYYY-MM-DD",
      "due_date": "YYYY-MM-DD ou null",
      "amount": 120.00,
      "ht_amount": 100.00,
      "vat_amount": 20.00,
      "vat_rate": 20.0,
      "vat_details": [{"rate": 20.0, "base": 100.00, "amount": 20.00}],
      "description": "Description des achats",
      "category": "transport|meals|accommodation|equipment|office|shopping|mileage|telecom|insurance|software|other",
      "currency": "EUR",
      "line_items": [{"description": "Article", "quantity": 1, "unit_price": 100.00, "total": 100.00, "vat_rate": 20.0}],
      "confidence": 85,
      "payment_method": "card|cash|transfer|check|null",
      "supplier_category": "restaurant|gas_station|hotel|supermarket|other",
      "account_code": "606400",
      "account_label": "Fournitures de bureau",
      "document_type": "invoice|receipt|other",
      "is_professional_expense": true,
      "vat_details": [{"rate": 20.0, "base": 100.00, "amount": 20.00}],
      "page_number": 1
    }
  ],
  "total_invoices": 1,
  "pages_analyzed": ${totalPages}
}

IMPORTANT :
- Le tableau "invoices" doit contenir TOUTES les factures extraites
- Si 0 facture n'est trouvée, retourne un tableau vide
- "total_invoices" doit indiquer le nombre total de factures trouvées
- "pages_analyzed" doit indiquer le nombre de pages analysées (${totalPages})

Analyse maintenant ce PDF multipage et extrait TOUTES les factures présentes.`;
}

// ---------------------------------------------------------------------------
// Concurrency helper — queue-based, race-condition-free
// ---------------------------------------------------------------------------

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results = new Array<PromiseSettledResult<T>>(tasks.length);
  // queue holds [originalIndex, taskFn] — shift() is synchronous so no race
  const queue: Array<[number, () => Promise<T>]> = tasks.map((t, i) => [i, t]);

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [idx, task] = item;
      results[idx] = await task()
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch((reason) => ({ status: 'rejected' as const, reason }));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Allowed MIME types (shared across endpoints)
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

// ---------------------------------------------------------------------------
// Rate limiting constants (shared defaults — endpoints may override)
// ---------------------------------------------------------------------------

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 10;
