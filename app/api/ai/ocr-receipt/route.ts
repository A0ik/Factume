import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAccountCode, generateJournalEntry } from '@/lib/plan-comptable';
import {
  sanitizeCategory,
  sanitizeString,
  sanitizeNumeric,
  sanitizeDate,
  sanitizePaymentMethod,
  sanitizeLineItems,
  sanitizeVatDetails,
  normalizeConfidence,
  validatePCGCode,
  generateStoragePath,
  buildOcrPrompt,
  ALLOWED_MIME_TYPES,
} from '@/lib/ocr-helpers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_MODEL = 'google/gemini-2.5-flash';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Rate limiting (IP-based) - Première ligne de défense
    // ------------------------------------------------------------------
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) }
        }
      );
    }

    // ------------------------------------------------------------------
    // 2. Authentication & subscription check
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
    // 3. Rate limiting (Supabase-backed, works across serverless instances)
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
    // 4. Validate environment
    // ------------------------------------------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration IA manquante (OPENROUTER_API_KEY)' },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // 5. Parse & validate the uploaded file
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
    // 6. Upload to Supabase Storage
    // ------------------------------------------------------------------
    const storagePath = generateStoragePath(user.id, file.name);

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
    // 7. Call OpenRouter / Gemini 2.0 Flash for OCR
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Gemini handles PDF natively when sent as inline data
    const completion = await openrouter.chat.completions.create({
      model: OCR_MODEL,
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
    // 8. Parse & sanitize the OCR response
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

    // Sanitize all extracted fields using shared helpers
    const category = sanitizeCategory(parsed.category);
    const supplierCategory = sanitizeString(parsed.supplier_category);

    const extractedAccountCode = sanitizeString(parsed.account_code);
    const extractedAccountLabel = sanitizeString(parsed.account_label);

    const extracted = {
      vendor: sanitizeString(parsed.vendor),
      vendor_address: sanitizeString(parsed.vendor_address),
      vendor_siret: sanitizeString(parsed.vendor_siret),
      vendor_vat_number: sanitizeString(parsed.vendor_vat_number),
      amount: sanitizeNumeric(parsed.amount),
      ht_amount: sanitizeNumeric(parsed.ht_amount),
      vat_amount: sanitizeNumeric(parsed.vat_amount),
      vat_rate: sanitizeNumeric(parsed.vat_rate),
      vat_details: sanitizeVatDetails(parsed.vat_details),
      date: sanitizeDate(parsed.date),
      due_date: sanitizeDate(parsed.due_date),
      invoice_number: sanitizeString(parsed.invoice_number),
      description: sanitizeString(parsed.description),
      category,
      currency: sanitizeString(parsed.currency) ?? 'EUR',
      line_items: sanitizeLineItems(parsed.line_items),
      confidence: normalizeConfidence(parsed.confidence),
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      is_duplicate: typeof parsed.is_duplicate === 'boolean' ? parsed.is_duplicate : false,
      supplier_category: supplierCategory,
      account_code: extractedAccountCode,
      account_label: extractedAccountLabel,
      document_type: sanitizeString(parsed.document_type),
      is_professional_expense: typeof parsed.is_professional_expense === 'boolean' ? parsed.is_professional_expense : true,
      cost_center: sanitizeString(parsed.cost_center),
    };

    // Determine account code: vendor_mappings → AI suggestion (PCG-validated) → plan-comptable fallback
    const accountMapping = getAccountCode(category, supplierCategory);
    let finalAccountCode = (validatePCGCode(extractedAccountCode) ? extractedAccountCode : null) ?? accountMapping.code;
    let finalAccountLabel = extractedAccountLabel ?? accountMapping.label;

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

    // Build journal entry JSON once — reused in both DB record and API response
    const journalEntryJson = {
      debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
      credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
      vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
    };

    // ------------------------------------------------------------------
    // 9. Save to expenses table
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
      account_code: finalAccountCode,
      account_label: finalAccountLabel,
      journal_type: journalEntry.journalType,
      journal_entry: journalEntryJson,
      vat_account: journalEntry.vatAccount || null,
      document_type: extracted.document_type,
      is_professional_expense: extracted.is_professional_expense,
      supplier_category: extracted.supplier_category,
    };

    // Remove null keys so Supabase uses column defaults
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
    // 10. Return comprehensive response
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
          journal_entry: journalEntryJson,
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
          model: OCR_MODEL,
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
