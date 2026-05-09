import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  sanitizeString,
  sanitizeNumeric,
  sanitizeDate,
  sanitizePaymentMethod,
  sanitizeLineItems,
  normalizeConfidence,
  generateStoragePath,
  ALLOWED_MIME_TYPES,
} from '@/lib/ocr-helpers';
import { getVatRatesForCountry, getExchangeRate } from '@/lib/currency-detection';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_MODEL = 'google/gemini-2.5-flash';

// ---------------------------------------------------------------------------
// Multi-Currency OCR Prompt
// ---------------------------------------------------------------------------

function buildMultiCurrencyPrompt(): string {
  return `Tu es un expert-comptable international spécialisé dans l'extraction de données de factures multi-devises. Ta mission est d'extraire toutes les informations d'une facture en détectant automatiquement la devise.

CONSIGNES CRITIQUES :
1. Détecte automatiquement la devise utilisée dans le document.
2. Extrais le montant dans la devise d'origine.
3. Indique le code ISO de la devise (EUR, USD, GBP, CHF, CAD, AUD, JPY, CNY, SEK, NOK, DKK, PLN).
4. Les montants doivent utiliser le séparateur décimal CORRECT pour la devise détectée.
5. Si plusieurs devises sont présentes, indique la devise principale.
6. Le taux de TVA doit correspondre au pays de la devise (ex: 20% pour FR, 19% pour DE, 20% pour GB).
7. Ne devine JAMAIS une information non visible — mets null si absente ou ambiguë.
8. Les dates doivent être au format YYYY-MM-DD (ISO 8601).
9. Les montants doivent être des NOMBRES, sans symbole monétaire.
10. Le champ confidence est ta confiance GLOBALE dans l'extraction (0-100).

DEVISES SUPPORTÉES :
- EUR (€) : TVA FR 20%/10%/5.5%/2.1%, décimale = virgule (12,50 €)
- USD ($) : TVA US variable, décimale = point (12.50)
- GBP (£) : TVA UK 20%/5%/0%, décimale = point (£12.50)
- CHF : TVA CH 8.1%/3.8%/2.5%
- CAD (C$) : TVA CA 5%/13%
- AUD (A$) : TVA AU 10%
- JPY (¥) : TVA JP 10%
- CNY (¥) : TVA CN 13%/9%/6%
- SEK/NOK/DKK : TVA 25%/12%/6%
- PLN (zł) : TVA PL 23%/8%/5%

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de texte autour) :
{
  "vendor": "nom du fournisseur ou null",
  "vendor_siret": "SIRET ou null",
  "vendor_vat_number": "numéro TVA ou null",
  "invoice_number": "numéro de facture ou null",
  "invoice_date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "currency": "EUR|USD|GBP|CHF|CAD|AUD|JPY|CNY|SEK|NOK|DKK|PLN",
  "amount": 120.00,
  "ht_amount": 100.00,
  "vat_amount": 20.00,
  "vat_rate": 20.0,
  "line_items": [
    {
      "description": "description",
      "quantity": 1,
      "unit_price": 100.00,
      "vat_rate": 20.0,
      "vat_amount": 20.00,
      "total": 120.00
    }
  ],
  "country_code": "FR|GB|US|CH|CA|AU|JP|CN|SE|NO|DK|PL",
  "payment_method": "card|cash|transfer|check|null",
  "description": "description de l'achat",
  "confidence": 85
}`;
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
    const { data: { user } } = await supabase.auth.getUser();

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

    if (profile.subscription_tier !== 'business' && profile.is_trial_active !== true) {
      return NextResponse.json(
        {
          error: "L'OCR multi-devise est disponible uniquement avec le plan Business.",
          feature: 'ocr_multicurrency',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 },
      );
    }

    // ------------------------------------------------------------------
    // 2. Rate limiting
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
    // 4. Parse & validate uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté (${file.type}). Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 20 Mo.` },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // 5. Convert file to base64 (preprocess images, skip PDFs)
    // ------------------------------------------------------------------
    const isPdf = file.type === 'application/pdf';
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    let ocrBuffer: Buffer = originalBuffer;
    let ocrMimeType: string = file.type;

    if (!isPdf) {
      try {
        const { preprocessReceipt } = await import('@/lib/ocr-preprocess');
        const processed = await preprocessReceipt(originalBuffer, file.type);
        ocrBuffer = Buffer.from(processed.buffer);
        ocrMimeType = processed.mimeType;
      } catch (preprocErr) {
        console.warn('[OCR Multi-Currency] Preprocessing failed, using original:', preprocErr);
      }
    }

    const base64 = ocrBuffer.toString('base64');

    // ------------------------------------------------------------------
    // 6. Call OpenRouter / Gemini for OCR
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: OCR_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildMultiCurrencyPrompt() },
            { type: 'image_url', image_url: { url: `data:${ocrMimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    // ------------------------------------------------------------------
    // 7. Parse response
    // ------------------------------------------------------------------
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: "L'IA n'a retourné aucune réponse." }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('[OCR Multi-Currency] JSON parse error. Raw content:', rawContent.slice(0, 500));
      return NextResponse.json({ error: 'Réponse IA invalide (JSON malformé).' }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // 8. Currency conversion
    // ------------------------------------------------------------------
    const currency = sanitizeString(parsed.currency) ?? 'EUR';
    const amount = sanitizeNumeric(parsed.amount) ?? 0;
    const countryCode = sanitizeString(parsed.country_code);

    let exchangeRate = 1.0;
    let amountInEur = amount;
    let conversionWarning: string | null = null;

    if (currency !== 'EUR') {
      const rate = getExchangeRate(currency, 'EUR');
      if (rate === null) {
        // No rate available — store original amount with a warning, don't silently assume 1:1
        conversionWarning = `Taux de change introuvable pour ${currency}. Le montant est stocké dans la devise d'origine.`;
        console.warn(`[OCR Multi-Currency] ${conversionWarning}`);
        amountInEur = amount;
      } else {
        exchangeRate = rate;
        amountInEur = amount * rate;
      }
    }

    // ------------------------------------------------------------------
    // 9. Build sanitized result
    // ------------------------------------------------------------------
    const result = {
      vendor: sanitizeString(parsed.vendor),
      vendor_siret: sanitizeString(parsed.vendor_siret),
      vendor_vat_number: sanitizeString(parsed.vendor_vat_number),
      invoice_number: sanitizeString(parsed.invoice_number),
      invoice_date: sanitizeDate(parsed.invoice_date),
      due_date: sanitizeDate(parsed.due_date),
      currency,
      original_amount: amount,
      amount: amountInEur,
      ht_amount: sanitizeNumeric(parsed.ht_amount),
      vat_amount: sanitizeNumeric(parsed.vat_amount),
      vat_rate: sanitizeNumeric(parsed.vat_rate),
      line_items: sanitizeLineItems(parsed.line_items),
      country_code: countryCode,
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      description: sanitizeString(parsed.description),
      confidence: normalizeConfidence(parsed.confidence),
      original_currency: currency !== 'EUR' ? currency : null,
      exchange_rate: currency !== 'EUR' ? exchangeRate : null,
      exchange_date: currency !== 'EUR' ? new Date().toISOString().split('T')[0] : null,
      vat_rates_for_country: countryCode ? getVatRatesForCountry(countryCode) : null,
    };

    // ------------------------------------------------------------------
    // 10. Upload to Supabase Storage
    // ------------------------------------------------------------------
    const storagePath = generateStoragePath(user.id, file.name);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, originalBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[OCR Multi-Currency] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Impossible de sauvegarder le fichier.' },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptUrl = urlData.publicUrl;

    // ------------------------------------------------------------------
    // 11. Save to database
    // ------------------------------------------------------------------
    const expenseRecord: Record<string, unknown> = {
      user_id: user.id,
      vendor: result.vendor,
      amount: result.amount,
      vat_amount: result.vat_amount,
      currency: 'EUR',
      date: result.invoice_date ?? new Date().toISOString().split('T')[0],
      description: result.description,
      receipt_url: receiptUrl,
      receipt_storage_path: storagePath,
      payment_method: result.payment_method,
      status: 'pending',
      original_currency: result.original_currency,
      original_amount: result.original_amount,
      exchange_rate: result.exchange_rate,
      exchange_date: result.exchange_date,
      ocr_raw_response: parsed,
      ocr_confidence: result.confidence,
      ocr_line_items: result.line_items,
      ocr_invoice_number: result.invoice_number,
      ocr_currency: result.currency,
      ocr_supplier_siret: result.vendor_siret,
      ocr_vendor_vat_number: result.vendor_vat_number,
    };

    // Remove null/undefined keys so Supabase uses column defaults
    for (const key of Object.keys(expenseRecord)) {
      if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
        delete expenseRecord[key];
      }
    }

    const { data: savedExpense, error: dbError } = await supabase
      .from('expenses')
      .insert(expenseRecord)
      .select()
      .single();

    if (dbError) {
      console.error('[OCR Multi-Currency] DB insert error:', dbError);
      return NextResponse.json(
        {
          warning: 'Extraction réussie mais erreur de sauvegarde.',
          extracted: result,
          receipt_url: receiptUrl,
          db_error: dbError.message,
        },
        { status: 207 },
      );
    }

    // ------------------------------------------------------------------
    // 12. Return result
    // ------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      expense: savedExpense,
      extracted: result,
      ...(conversionWarning ? { conversion_warning: conversionWarning } : {}),
      meta: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        detected_currency: currency,
        exchange_rate_used: exchangeRate,
        amount_in_eur: amountInEur,
        original_amount: amount,
        model: OCR_MODEL,
      },
    });
  } catch (error: unknown) {
    console.error('[OCR Multi-Currency] Unhandled error:', error);
    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return NextResponse.json({ error: "Le délai d'analyse a été dépassé. Réessayez avec un fichier plus léger." }, { status: 504 });
    }

    return NextResponse.json(
      { error: err.message || 'Erreur OCR multi-devise' },
      { status: 500 },
    );
  }
}
