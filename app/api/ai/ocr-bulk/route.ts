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
  runWithConcurrency,
  ALLOWED_MIME_TYPES,
} from '@/lib/ocr-helpers';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_FILES = 20;
const MAX_CONCURRENT_OCR = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const OCR_MODEL = 'google/gemini-2.5-flash';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OcrResult {
  success: boolean;
  file: string;
  expense?: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// processFile — extracts a single receipt and saves it
// ---------------------------------------------------------------------------

async function processFile(
  file: File,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  openrouter: OpenAI,
): Promise<OcrResult> {
  const fileName = file.name;

  try {
    // Validate MIME type and size per file
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return { success: false, file: fileName, error: `Type non supporté : ${file.type}` };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        file: fileName,
        error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 20 Mo)`,
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const originalMimeType = file.type || 'image/jpeg';
    const isPdf = originalMimeType === 'application/pdf';

    // Preprocess images (skip PDFs — Gemini handles them natively)
    let ocrBuffer: Buffer = originalBuffer;
    let ocrMimeType = originalMimeType;
    if (!isPdf) {
      try {
        const { preprocessReceipt } = await import('@/lib/ocr-preprocess');
        const processed = await preprocessReceipt(originalBuffer, originalMimeType);
        ocrBuffer = Buffer.from(processed.buffer);
        ocrMimeType = processed.mimeType;
      } catch (preprocErr) {
        console.warn(`[OCR Bulk] Preprocessing failed for ${fileName}, using original:`, preprocErr);
      }
    }

    const base64 = ocrBuffer.toString('base64');

    // Upload original to Supabase storage (UUID path prevents collisions)
    const storagePath = generateStoragePath(userId, fileName);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, originalBuffer, {
        contentType: originalMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[OCR Bulk] Upload failed for ${fileName}:`, uploadError);
      return { success: false, file: fileName, error: `Upload échoué : ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptUrl = urlData.publicUrl;

    // OCR via OpenRouter Gemini
    const completion = await openrouter.chat.completions.create({
      model: OCR_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            {
              type: 'image_url',
              image_url: { url: `data:${ocrMimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    // Safe optional chaining — choices array may be empty
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return { success: false, file: fileName, error: "L'IA n'a retourné aucune réponse." };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error(`[OCR Bulk] JSON parse error for ${fileName}. Raw content:`, rawContent.slice(0, 500));
      return { success: false, file: fileName, error: 'Réponse IA invalide (JSON malformé).' };
    }

    // Sanitize all fields with shared helpers (consistent with ocr-receipt)
    const category = sanitizeCategory(parsed.category);
    const supplierCategory = sanitizeString(parsed.supplier_category);

    const extractedAccountCode = sanitizeString(parsed.account_code);
    const extractedAccountLabel = sanitizeString(parsed.account_label);

    const accountMapping = getAccountCode(category, supplierCategory);
    const finalAccountCode = (validatePCGCode(extractedAccountCode) ? extractedAccountCode : null) ?? accountMapping.code;
    const finalAccountLabel = extractedAccountLabel ?? accountMapping.label;

    const journalEntry = generateJournalEntry({
      category,
      supplierCategory,
      amountTtc: sanitizeNumeric(parsed.amount) ?? 0,
      amountHt: sanitizeNumeric(parsed.ht_amount),
      vatAmount: sanitizeNumeric(parsed.vat_amount),
      vatRate: sanitizeNumeric(parsed.vat_rate),
      paymentMethod: sanitizePaymentMethod(parsed.payment_method),
    });

    const expenseRecord: Record<string, unknown> = {
      user_id: userId,
      vendor: sanitizeString(parsed.vendor),
      amount: sanitizeNumeric(parsed.amount),
      vat_amount: sanitizeNumeric(parsed.vat_amount),
      category,
      date: sanitizeDate(parsed.date),
      due_date: sanitizeDate(parsed.due_date),
      description: sanitizeString(parsed.description),
      receipt_url: receiptUrl,
      receipt_storage_path: storagePath,
      payment_method: sanitizePaymentMethod(parsed.payment_method),
      status: 'pending',
      // OCR metadata
      ocr_raw_response: parsed,
      ocr_confidence: normalizeConfidence(parsed.confidence),
      ocr_line_items: sanitizeLineItems(parsed.line_items),
      ocr_supplier_siret: sanitizeString(parsed.vendor_siret),
      ocr_invoice_number: sanitizeString(parsed.invoice_number),
      ocr_currency: sanitizeString(parsed.currency) ?? 'EUR',
      ocr_payment_due_date: sanitizeDate(parsed.due_date),
      // Accounting (PCG)
      account_code: finalAccountCode,
      account_label: finalAccountLabel,
      journal_type: journalEntry.journalType,
      journal_entry: {
        debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
        credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
        vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
      },
      vat_account: journalEntry.vatAccount || null,
      document_type: sanitizeString(parsed.document_type),
      supplier_category: supplierCategory,
      is_professional_expense: typeof parsed.is_professional_expense === 'boolean' ? parsed.is_professional_expense : true,
      vat_details: sanitizeVatDetails(parsed.vat_details),
    };

    // Remove null/undefined keys so Supabase uses column defaults
    for (const key of Object.keys(expenseRecord)) {
      if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
        delete expenseRecord[key];
      }
    }

    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert(expenseRecord)
      .select()
      .single();

    if (insertError) {
      console.error(`[OCR Bulk] Insert failed for ${fileName}:`, insertError);
      return { success: false, file: fileName, error: `Erreur base de données : ${insertError.message}` };
    }

    return { success: true, file: fileName, expense: expense ?? undefined };
  } catch (error: unknown) {
    console.error(`[OCR Bulk] Error processing ${fileName}:`, error);
    const err = error as { message?: string; status?: number };
    if (err.status === 429) {
      return { success: false, file: fileName, error: 'Trop de requêtes IA. Réessayez dans quelques instants.' };
    }
    return { success: false, file: fileName, error: err.message ?? 'Erreur lors du traitement' };
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Authentication
    // ------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ------------------------------------------------------------------
    // 2. Subscription check
    // ------------------------------------------------------------------
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
          error: "L'analyse OCR en masse est disponible uniquement avec le plan Business.",
          feature: 'ocr',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 },
      );
    }

    // ------------------------------------------------------------------
    // 3. Rate limiting
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
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // 5. Parse form data — accept "files" (multi) or "file" (single)
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const filesEntries = formData.getAll('files');
    const fileEntries = formData.getAll('file');
    const detectMultiInvoice = formData.get('detectMultiInvoice') === 'true';
    const allEntries = filesEntries.length > 0 ? filesEntries : fileEntries;
    const files: File[] = allEntries.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier reçu. Utilisez la clé "files" ou "file".' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // 6. Multi-invoice detection (delegate to ocr-multi-page)
    // ------------------------------------------------------------------
    if (detectMultiInvoice && files.length === 1 && files[0].type === 'application/pdf') {
      const pdfFile = files[0];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const userCookie = req.headers.get('cookie') ?? '';

      // Detect invoice boundaries
      const detectFormData = new FormData();
      detectFormData.append('file', pdfFile);

      const detectResponse = await fetch(`${baseUrl}/api/ai/detect-invoices`, {
        method: 'POST',
        headers: { Cookie: userCookie },
        body: detectFormData,
      });

      if (!detectResponse.ok) {
        const err = await detectResponse.json().catch(() => ({ error: 'Détection échouée' }));
        return NextResponse.json(
          { error: err.error || 'Erreur lors de la détection des factures' },
          { status: detectResponse.status },
        );
      }

      const detectResult = await detectResponse.json();

      // Extract each detected invoice
      const extractFormData = new FormData();
      extractFormData.append('file', pdfFile);
      extractFormData.append('segments', JSON.stringify(detectResult.segments));

      const extractResponse = await fetch(`${baseUrl}/api/ai/ocr-multi-page`, {
        method: 'POST',
        headers: { Cookie: userCookie },
        body: extractFormData,
      });

      if (!extractResponse.ok) {
        const err = await extractResponse.json().catch(() => ({ error: 'Extraction échouée' }));
        return NextResponse.json(
          { error: err.error || "Erreur lors de l'extraction des factures" },
          { status: extractResponse.status },
        );
      }

      const extractResult = await extractResponse.json();

      const bulkResults = extractResult.results.map((r: Record<string, unknown>) => ({
        success: r.success,
        file: pdfFile.name,
        fileSegment: r.segment
          ? `p.${(r.segment as Record<string, number>).startPage}-${(r.segment as Record<string, number>).endPage}`
          : undefined,
        expense: r.expense,
        error: r.error,
      }));

      return NextResponse.json({
        results: bulkResults,
        summary: extractResult.summary,
        multiInvoiceDetected: true,
        segments: detectResult.segments,
      });
    }

    // ------------------------------------------------------------------
    // 7. Validate file count
    // ------------------------------------------------------------------
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} fichiers par requête. Vous en avez envoyé ${files.length}.` },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // 8. Process files concurrently
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const tasks = files.map((file) => () => processFile(file, user.id, supabase, openrouter));
    const settled = await runWithConcurrency(tasks, MAX_CONCURRENT_OCR);

    const results: OcrResult[] = settled.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return { success: false, file: 'unknown', error: String(result.reason) };
    });

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
      },
    });
  } catch (error: unknown) {
    console.error('[OCR Bulk] Unhandled error:', error);
    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return NextResponse.json({ error: 'Délai dépassé. Réessayez avec moins de fichiers.' }, { status: 504 });
    }

    return NextResponse.json(
      { error: err.message || 'Erreur lors du traitement en masse' },
      { status: 500 },
    );
  }
}
