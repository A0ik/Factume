import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Rate limiting: 10 requests per minute per user.
// In production, replace this in-memory map with Redis (Upstash) or a
// Supabase-backed counter so it works across serverless instances.
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count += 1;
  return true;
}

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
  return `Tu es un expert-comptable français spécialisé dans la lecture et l'analyse de justificatifs de dépenses professionnelles (tickets de caisse, factures, reçus, notes de frais). Tu dois analyser cette image ou ce document avec une précision maximale.

CONSIGNES CRITIQUES :
1. Analyse CHAQUE ligne du document avec attention.
2. Ne devine JAMAIS une information qui n'est pas visible — si une donnée est illisible, absente ou ambiguë, mets STRICTEMENT null.
3. Distingue bien le montant HT (hors taxes) du montant TTC (toutes taxes comprises).
4. Si plusieurs taux de TVA sont présents, détaille-les tous dans vat_details.
5. Pour les tickets de caisse, extrais chaque ligne d'achat dans line_items avec sa quantité et son prix unitaire quand c'est visible.
6. La catégorie doit être la plus précise possible parmi la liste autorisée.
7. Le champ supplier_category indique le TYPE d'établissement (restaurant, station-service, hôtel, supermarché, etc.).
8. Le champ confidence est ta confiance GLOBALE dans l'extraction (0-100), en tenant compte de la qualité de l'image, de la lisibilité, et de la cohérence des montants.
9. is_duplicate doit être true UNIQUEMENT si le document semble être un doublon (même vendeur, même montant, même date — typiquement un ticket imprimé en double).
10. Le champ payment_method déduit le mode de paiement si visible (CB, espèces, virement, chèque).
11. Les montants doivent être des NOMBRES (pas des chaînes), sans symbole monétaire.
12. Les dates doivent être au format YYYY-MM-DD (ISO 8601).

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
    { "description": "Description de l'article", "quantity": 1, "unit_price": 0.00, "total": 0.00, "vat_rate": 20.0 }
  ],
  "confidence": 85,
  "payment_method": "card|cash|transfer|check|null",
  "is_duplicate": false,
  "supplier_category": "restaurant|gas_station|hotel|supermarket|pharmacy|bookstore|clothing|electronics|telecom_provider|insurance_company|software_provider|transport_company|other"
}

Analyse maintenant ce document avec la plus grande rigueur professionnelle.`;
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
    // 2. Rate limiting
    // ------------------------------------------------------------------
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Trop de requêtes OCR. Réessayez dans une minute.' },
        { status: 429 },
      );
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
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // ------------------------------------------------------------------
    // 5. Upload to Supabase Storage
    // ------------------------------------------------------------------
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: mimeType,
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
      model: 'google/gemini-2.0-flash-exp',
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
      category: sanitizeCategory(parsed.category),
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
            }))
        : [],
      confidence: sanitizeNumeric(parsed.confidence) ?? 0,
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      is_duplicate: typeof parsed.is_duplicate === 'boolean' ? parsed.is_duplicate : false,
      supplier_category: sanitizeString(parsed.supplier_category),
    };

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
        receipt_url: receiptPublicUrl,
        receipt_storage_path: storagePath,
        meta: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          is_pdf: isPdf,
          model: 'google/gemini-2.0-flash-exp',
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
