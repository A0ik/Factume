// ---------------------------------------------------------------------------
// OCR Hybrid API Route - Tesseract (free) + OpenRouter (fallback)
// This endpoint provides cost-optimized OCR by using free Tesseract first
// and only falling back to paid OpenRouter if confidence is low
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { extractWithTesseract, isTesseractResultReliable, tesseractResultToExpense } from '@/lib/ocr-tesseract';
import { convertPdfToImages, isPDFBuffer } from '@/lib/pdf-to-image';
import OpenAI from 'openai';
import { buildOcrPrompt } from '@/lib/ocr-helpers';
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
  ALLOWED_MIME_TYPES,
} from '@/lib/ocr-helpers';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TESSERACT_CONFIDENCE_THRESHOLD = 0.8; // 80% confidence to skip OpenRouter
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

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

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json(
        {
          error: "L'analyse OCR hybride est disponible uniquement avec le plan Business.",
          feature: 'ocr',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Validate environment
    // ------------------------------------------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration IA manquante (OPENROUTER_API_KEY)' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 3. Parse & validate file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni. Envoyez un fichier via le champ "file".' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non supporté (${file.type}). Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 20 Mo.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const isPdf = file.type === 'application/pdf';

    // ------------------------------------------------------------------
    // 4. Upload to Supabase Storage
    // ------------------------------------------------------------------
    const storagePath = generateStoragePath(user.id, file.name);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, originalBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[OCR Hybrid] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: "Impossible de sauvegarder le justificatif dans le stockage." },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptPublicUrl = urlData.publicUrl;

    // ------------------------------------------------------------------
    // 5. Hybrid OCR Process
    // ------------------------------------------------------------------
    const startTime = Date.now();
    let result: {
      success: boolean;
      method: 'tesseract' | 'openrouter' | 'hybrid';
      confidence: number;
      processingTimeMs: number;
      costUsd: number;
      extracted?: Record<string, unknown>;
      tesseractData?: {
        confidence: number;
        basicData: Record<string, unknown>;
      };
    };

    // For PDFs, convert to images first for Tesseract
    let ocrBuffer: Buffer = originalBuffer;
    let ocrMimeType = file.type;

    if (isPdf) {
      console.log('[OCR Hybrid] PDF detected, converting to images for Tesseract...');
      const conversionResult = await convertPdfToImages(originalBuffer, { maxPages: 1 });

      if (conversionResult.success && conversionResult.pages.length > 0) {
        // Use first page for Tesseract
        ocrBuffer = conversionResult.pages[0].imageBuffer as Buffer;
        ocrMimeType = 'image/png';
        console.log('[OCR Hybrid] PDF first page converted, trying Tesseract...');
      } else {
        console.log('[OCR Hybrid] PDF conversion failed, using OpenRouter directly');
        result = await processWithOpenRouter(
          originalBuffer,
          file.type,
          user.id,
          supabase,
          receiptPublicUrl,
          storagePath,
          startTime
        );

        return NextResponse.json(result);
      }
    }

    // Step 1: Try Tesseract (FREE)
    console.log('[OCR Hybrid] Step 1: Trying Tesseract OCR...');
    const tesseractResult = await extractWithTesseract(ocrBuffer, ocrMimeType);

    result = {
      success: true,
      method: 'tesseract',
      confidence: tesseractResult.confidence,
      processingTimeMs: Date.now() - startTime,
      costUsd: 0,
      tesseractData: {
        confidence: tesseractResult.confidence,
        basicData: tesseractResult.basicData,
      },
    };

    // Step 2: Check if Tesseract is reliable enough
    if (isTesseractResultReliable(tesseractResult)) {
      console.log(`[OCR Hybrid] Tesseract confidence ${tesseractResult.confidence} >= ${TESSERACT_CONFIDENCE_THRESHOLD}, using it`);

      result.extracted = tesseractResultToExpense(tesseractResult, {
        userId: user.id,
        receiptUrl: receiptPublicUrl,
        storagePath: storagePath,
        category: 'other',
      });

      // Add vendor mappings check
      if (result.extracted.vendor) {
        await applyVendorMappings(supabase, user.id, result.extracted);
      }

      // Save to database
      const { data: savedExpense, error: dbError } = await supabase
        .from('expenses')
        .insert({ ...result.extracted, ocr_method: 'tesseract' })
        .select()
        .single();

      if (dbError) {
        console.error('[OCR Hybrid] DB insert error:', dbError);
        return NextResponse.json(
          {
            warning: 'Extraction réussie mais erreur lors de la sauvegarde en base.',
            extracted: result.extracted,
            db_error: dbError.message,
          },
          { status: 207 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'tesseract',
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
        costUsd: 0,
        expense: savedExpense,
        extracted: result.extracted,
        receipt_url: receiptPublicUrl,
        tesseract_data: result.tesseractData,
      });

    } else {
      console.log(`[OCR Hybrid] Tesseract confidence ${tesseractResult.confidence} < ${TESSERACT_CONFIDENCE_THRESHOLD}, falling back to OpenRouter`);

      // Fallback to OpenRouter
      const openrouterResult = await processWithOpenRouter(
        originalBuffer,
        file.type,
        user.id,
        supabase,
        receiptPublicUrl,
        storagePath,
        startTime
      );

      result = {
        ...openrouterResult,
        method: 'hybrid',
        tesseractData: {
          confidence: tesseractResult.confidence,
          basicData: tesseractResult.basicData,
        },
      };

      // Merge Tesseract basic data as fallback
      if (result.extracted) {
        (result.extracted as Record<string, unknown>).ocr_raw_response = {
          openrouter: (result.extracted as Record<string, unknown>).ocr_raw_response,
          tesseract: {
            text: tesseractResult.text,
            confidence: tesseractResult.confidence,
            basicData: tesseractResult.basicData,
          },
        };
      }
    }

    // ------------------------------------------------------------------
    // 6. Return response
    // ------------------------------------------------------------------
    return NextResponse.json(result);

  } catch (error) {
    console.error('[OCR Hybrid] Unhandled error:', error);
    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors de l'analyse OCR hybride." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Process with OpenRouter (paid)
// ---------------------------------------------------------------------------

async function processWithOpenRouter(
  buffer: Buffer,
  mimeType: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  receiptUrl: string,
  storagePath: string,
  startTime: number
): Promise<{
  success: boolean;
  method: 'openrouter';
  confidence: number;
  processingTimeMs: number;
  costUsd: number;
  extracted?: Record<string, unknown>;
}> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const base64 = buffer.toString('base64');

  const completion = await openrouter.chat.completions.create({
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildOcrPrompt() },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("L'IA n'a retourné aucune réponse. Réessayez.");
  }

  const parsed = JSON.parse(rawContent);

  // Build expense record
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

  const extracted = {
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
    ocr_raw_response: parsed,
    ocr_confidence: normalizeConfidence(parsed.confidence),
    ocr_line_items: sanitizeLineItems(parsed.line_items),
    ocr_supplier_siret: sanitizeString(parsed.vendor_siret),
    ocr_invoice_number: sanitizeString(parsed.invoice_number),
    ocr_currency: sanitizeString(parsed.currency) ?? 'EUR',
    ocr_payment_due_date: sanitizeDate(parsed.due_date),
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
    ocr_method: 'openrouter',
  };

  // Apply vendor mappings
  if (extracted.vendor) {
    await applyVendorMappings(supabase, userId, extracted);
  }

  // Remove null keys
  for (const key of Object.keys(extracted)) {
    if ((extracted as Record<string, unknown>)[key] === null || (extracted as Record<string, unknown>)[key] === undefined) {
      delete (extracted as Record<string, unknown>)[key];
    }
  }

  // Save to database
  const { data: savedExpense, error: dbError } = await supabase
    .from('expenses')
    .insert(extracted)
    .select()
    .single();

  if (dbError) {
    console.error('[OCR Hybrid] DB insert error:', dbError);
    throw dbError;
  }

  // Estimate cost (rough calculation)
  const inputTokens = base64.length / 4;
  const outputTokens = JSON.stringify(parsed).length / 4;
  const costUsd = (inputTokens / 1_000_000) * 0.30 + (outputTokens / 1_000_000) * 2.50;

  return {
    success: true,
    method: 'openrouter',
    confidence: normalizeConfidence(parsed.confidence),
    processingTimeMs: Date.now() - startTime,
    costUsd,
    extracted: savedExpense,
  };
}

// ---------------------------------------------------------------------------
// Helper: Apply vendor mappings
// ---------------------------------------------------------------------------

async function applyVendorMappings(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  extracted: Record<string, unknown>
): Promise<void> {
  if (!extracted.vendor) return;

  const normalized = (extracted.vendor as string).toLowerCase().trim();
  const { data: mapping } = await supabase
    .from('vendor_mappings')
    .select('account_code, account_name, corrected_category')
    .eq('user_id', userId)
    .ilike('vendor_name_pattern', normalized)
    .maybeSingle();

  if (mapping?.account_code) {
    extracted.account_code = mapping.account_code;
    extracted.account_label = mapping.account_name || extracted.account_label;
  }

  if (mapping?.corrected_category) {
    extracted.category = mapping.corrected_category;
  }
}
