import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAccountCode, generateJournalEntry, getVatAccount } from '@/lib/plan-comptable';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// ---------------------------------------------------------------------------
// Allowed MIME types
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ---------------------------------------------------------------------------
// Valid categories for classification
// ---------------------------------------------------------------------------
const VALID_CATEGORIES = [
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

type ExpenseCategory = (typeof VALID_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidCategory(cat: unknown): cat is ExpenseCategory {
  return typeof cat === 'string' && (VALID_CATEGORIES as readonly string[]).includes(cat);
}

function sanitizeCategory(cat: unknown): ExpenseCategory {
  return isValidCategory(cat) ? cat : 'other';
}

function sanitizeNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

function sanitizeDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? `${y}-${m}-${d}` : null;
}

function sanitizeString(val: unknown): string | null {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

function sanitizePaymentMethod(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const normalized = val.toLowerCase().trim();
  if (['card', 'cash', 'transfer', 'check', 'cheque', 'virement', 'carte', 'especes'].includes(normalized)) {
    if (normalized === 'carte' || normalized === 'card') return 'card';
    if (normalized === 'especes' || normalized === 'cash') return 'cash';
    if (normalized === 'virement' || normalized === 'transfer') return 'transfer';
    if (normalized === 'cheque' || normalized === 'check') return 'check';
  }
  return null;
}

// ---------------------------------------------------------------------------
// OCR Prompt (French, extremely detailed for maximum extraction accuracy)
// ---------------------------------------------------------------------------

function buildOcrPrompt(): string {
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
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Authentication & subscription check
    // ------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json(
        {
          error:
            "L'analyse OCR est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.",
          feature: 'ocr',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 },
      );
    }

    // ------------------------------------------------------------------
    // 2. Rate limiting (Supabase-backed, works across serverless instances)
    // ------------------------------------------------------------------
    {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentCount } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart);

      if (recentCount !== null && recentCount >= RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json(
          { error: 'Trop de requêtes OCR. Réessayez dans une minute.' },
          { status: 429 },
        );
      }
    }

    // ------------------------------------------------------------------
    // 3. Validate environment
    // ------------------------------------------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration IA manquante (OPENROUTER_API_KEY)' },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // 4. Parse & validate the uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni. Envoyez un fichier via le champ "file".' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non supporté (${file.type}). Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 20 Mo.` },
        { status: 400 },
      );
    }

    const isPdf = file.type === 'application/pdf';
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const originalMimeType = file.type || 'image/jpeg';

    // Preprocess image for better OCR accuracy (skip PDFs)
    let ocrBuffer: Buffer = originalBuffer;
    let ocrMimeType = originalMimeType;
    if (!isPdf) {
      try {
        const { preprocessReceipt } = await import('@/lib/ocr-preprocess');
        const processed = await preprocessReceipt(originalBuffer, originalMimeType);
        ocrBuffer = Buffer.from(processed.buffer);
        ocrMimeType = processed.mimeType;
      } catch (preprocErr) {
        console.warn('[OCR Receipt] Preprocessing failed, using original:', preprocErr);
      }
    }

    const base64 = ocrBuffer.toString('base64');
    const mimeType = ocrMimeType;

    // ------------------------------------------------------------------
    // 5. Upload to Supabase Storage
    // ------------------------------------------------------------------
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, originalBuffer, {
        contentType: originalMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[OCR Receipt] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: "Impossible de sauvegarder le justificatif dans le stockage." },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptPublicUrl = urlData.publicUrl;

    // ------------------------------------------------------------------
    // 6. Call OpenRouter / Gemini 2.0 Flash for OCR
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Gemini handles PDF natively when sent as inline data
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildOcrPrompt(),
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for deterministic extraction
    });

    // ------------------------------------------------------------------
    // 7. Parse & sanitize the OCR response
    // ------------------------------------------------------------------
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "L'IA n'a retourné aucune réponse. Réessayez." },
        { status: 500 },
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('[OCR Receipt] JSON parse error. Raw content:', rawContent.slice(0, 500));
      return NextResponse.json(
        { error: "Impossible d'interpréter la réponse de l'IA. Réessayez." },
        { status: 500 },
      );
    }

    // Sanitize all extracted fields
    const category = sanitizeCategory(parsed.category);
    const supplierCategory = sanitizeString(parsed.supplier_category);

    const extracted = {
      vendor: sanitizeString(parsed.vendor),
      vendor_address: sanitizeString(parsed.vendor_address),
      vendor_siret: sanitizeString(parsed.vendor_siret),
      vendor_vat_number: sanitizeString(parsed.vendor_vat_number),
      amount: sanitizeNumeric(parsed.amount),
      ht_amount: sanitizeNumeric(parsed.ht_amount),
      vat_amount: sanitizeNumeric(parsed.vat_amount),
      vat_rate: sanitizeNumeric(parsed.vat_rate),
      vat_details: Array.isArray(parsed.vat_details)
        ? parsed.vat_details
            .filter((v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null)
            .map((v) => ({
              rate: sanitizeNumeric(v.rate),
              base: sanitizeNumeric(v.base),
              amount: sanitizeNumeric(v.amount),
            }))
        : [],
      date: sanitizeDate(parsed.date),
      due_date: sanitizeDate(parsed.due_date),
      invoice_number: sanitizeString(parsed.invoice_number),
      description: sanitizeString(parsed.description),
      category,
      currency: sanitizeString(parsed.currency) || 'EUR',
      line_items: Array.isArray(parsed.line_items)
        ? parsed.line_items
            .filter((v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null)
            .map((v) => ({
              description: sanitizeString(v.description) || 'Article',
              quantity: sanitizeNumeric(v.quantity) ?? 1,
              unit_price: sanitizeNumeric(v.unit_price),
              total: sanitizeNumeric(v.total),
              vat_rate: sanitizeNumeric(v.vat_rate),
              account_code: sanitizeString(v.account_code),
              account_label: sanitizeString(v.account_label),
            }))
        : [],
      confidence: ((sanitizeNumeric(parsed.confidence) ?? 0) / 100),
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      is_duplicate: typeof parsed.is_duplicate === 'boolean' ? parsed.is_duplicate : false,
      supplier_category: supplierCategory,
      // Accounting fields (PCG)
      account_code: sanitizeString(parsed.account_code),
      account_label: sanitizeString(parsed.account_label),
      document_type: sanitizeString(parsed.document_type),
      is_professional_expense: typeof parsed.is_professional_expense === 'boolean' ? parsed.is_professional_expense : true,
      cost_center: sanitizeString(parsed.cost_center),
    };

    // Determine account code: vendor_mappings → AI suggestion → fallback to plan-comptable mapping
    const accountMapping = getAccountCode(category, supplierCategory);
    let finalAccountCode = extracted.account_code ?? accountMapping.code;
    let finalAccountLabel = extracted.account_label ?? accountMapping.label;

    // Check vendor_mappings for user-learned account codes (highest priority)
    if (extracted.vendor) {
      const normalized = extracted.vendor.toLowerCase().trim();
      const { data: mapping } = await supabase
        .from('vendor_mappings')
        .select('account_code, account_name')
        .eq('user_id', user.id)
        .ilike('vendor_name_pattern', normalized)
        .maybeSingle();
      if (mapping?.account_code) {
        finalAccountCode = mapping.account_code;
        finalAccountLabel = mapping.account_name || finalAccountLabel;
      }
    }

    // Generate journal entry (écriture comptable)
    const journalEntry = generateJournalEntry({
      category,
      supplierCategory,
      amountTtc: extracted.amount ?? 0,
      amountHt: extracted.ht_amount,
      vatAmount: extracted.vat_amount,
      vatRate: extracted.vat_rate,
      paymentMethod: extracted.payment_method,
    });

    // ------------------------------------------------------------------
    // 8. Save to expenses table
    // ------------------------------------------------------------------
    const expenseRecord: Record<string, unknown> = {
      user_id: user.id,
      vendor: extracted.vendor,
      amount: extracted.amount,
      vat_amount: extracted.vat_amount,
      category: extracted.category,
      date: extracted.date,
      description: extracted.description,
      receipt_url: receiptPublicUrl,
      receipt_storage_path: storagePath,
      payment_method: extracted.payment_method,
      status: 'pending',
      ocr_raw_response: parsed,
      ocr_confidence: extracted.confidence,
      ocr_line_items: extracted.line_items,
      ocr_supplier_siret: extracted.vendor_siret,
      ocr_invoice_number: extracted.invoice_number,
      ocr_currency: extracted.currency,
      ocr_payment_due_date: extracted.due_date,
      // Accounting (PCG) fields
      account_code: finalAccountCode,
      account_label: finalAccountLabel,
      journal_type: journalEntry.journalType,
      journal_entry: {
        debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
        credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
        vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
      },
      vat_account: journalEntry.vatAccount || null,
      document_type: extracted.document_type,
      is_professional_expense: extracted.is_professional_expense,
      supplier_category: extracted.supplier_category,
    };

    // Remove null keys so Supabase uses column defaults
    Object.keys(expenseRecord).forEach((key) => {
      if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
        delete expenseRecord[key];
      }
    });

    const { data: savedExpense, error: dbError } = await supabase
      .from('expenses')
      .insert(expenseRecord)
      .select()
      .single();

    if (dbError) {
      console.error('[OCR Receipt] DB insert error:', dbError);
      // Still return extraction results even if DB save fails
      return NextResponse.json(
        {
          warning: 'Extraction réussie mais erreur lors de la sauvegarde en base.',
          extracted,
          receipt_url: receiptPublicUrl,
          receipt_storage_path: storagePath,
          db_error: dbError.message,
        },
        { status: 207 }, // 207 Multi-Status: partial success
      );
    }

    // ------------------------------------------------------------------
    // 9. Return comprehensive response
    // ------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        expense: savedExpense,
        extracted,
        accounting: {
          account_code: finalAccountCode,
          account_label: finalAccountLabel,
          journal_type: journalEntry.journalType,
          journal_entry: {
            debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
            credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
            vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
          },
          vat_deductible: accountMapping.vatDeductible,
          default_vat_rate: accountMapping.defaultVatRate,
        },
        receipt_url: receiptPublicUrl,
        receipt_storage_path: storagePath,
        meta: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          is_pdf: isPdf,
          model: 'google/gemini-2.5-flash',
          ocr_confidence: extracted.confidence,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    // ------------------------------------------------------------------
    // Centralized error handling
    // ------------------------------------------------------------------
    console.error('[OCR Receipt] Unhandled error:', error);

    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' },
        { status: 500 },
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' },
        { status: 429 },
      );
    }

    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: "Le délai d'analyse a été dépassé. Réessayez avec un fichier plus léger." },
        { status: 504 },
      );
    }

    if (err.message?.includes('fetch') || err.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'Service temporairement indisponible. Réessayez dans quelques instants.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors de l'analyse OCR." },
      { status: 500 },
    );
  }
}
