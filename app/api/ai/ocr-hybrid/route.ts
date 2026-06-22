// ---------------------------------------------------------------------------
// OCR Hybrid API Route - Tesseract (free) + OpenRouter (fallback)
// Cost-optimized OCR: free Tesseract first, paid OpenRouter if low confidence
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature, consumeOcrQuota } from '@/lib/subscription-guard';
import { extractWithTesseract, isTesseractResultReliable } from '@/lib/ocr-tesseract';
import { convertPdfToImages } from '@/lib/pdf-to-image';
import OpenAI from 'openai';
import { buildOcrPrompt, generateStoragePath, ALLOWED_MIME_TYPES } from '@/lib/ocr-helpers';
import { processAndSaveExpense } from '@/lib/ocr-core';
import { getAccountCode, generateJournalEntry } from '@/lib/plan-comptable';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TESSERACT_CONFIDENCE_THRESHOLD = 0.8;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60; // MERCURE : assoupli (était 10) — le cap mensuel 500 borne le total.

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

    // Subscription gate (ZEUS CIBLE 3): OCR multi-factures = plan Business
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'ocrMultiInvoice');
    } catch (err: any) {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    // MERCURE (juin 2026) — OCR multi-factures : 500 factures/mois (Business). Quota atomique.
    const ocrQuota = await consumeOcrQuota(user.id, 1);
    if (!ocrQuota.allowed) {
      return NextResponse.json({
        error: ocrQuota.code === 'PLAN_REQUIRED'
          ? "L'OCR multi-factures nécessite le plan Business."
          : `Vous avez atteint votre quota de ${ocrQuota.limit} factures OCR ce mois-ci.`,
        code: ocrQuota.code || 'OCR_QUOTA_REACHED',
        limit: ocrQuota.limit,
        remaining: ocrQuota.remaining,
        upgradeUrl: '/paywall?plan=business',
      }, { status: ocrQuota.code === 'PLAN_REQUIRED' ? 402 : 429 });
    }

    // ------------------------------------------------------------------
    // 2. Rate limiting (Supabase-backed)
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
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Parse & validate file
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
        { error: `Type de fichier non supporté (${file.type}). Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.` },
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
    // 5. Upload to Supabase Storage
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
    // 6. Hybrid OCR Process
    // ------------------------------------------------------------------
    const startTime = Date.now();
    const fileMeta = {
      receiptUrl: receiptPublicUrl,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isPdf,
    };

    // For PDFs, convert to images first for Tesseract
    let ocrBuffer: Buffer = originalBuffer;
    let ocrMimeType = file.type;

    if (isPdf) {
      console.log('[OCR Hybrid] PDF detected, converting to images for Tesseract...');
      const conversionResult = await convertPdfToImages(originalBuffer, { maxPages: 1 });

      if (conversionResult.success && conversionResult.pages.length > 0) {
        ocrBuffer = conversionResult.pages[0].imageBuffer as Buffer;
        ocrMimeType = 'image/png';
        console.log('[OCR Hybrid] PDF first page converted, trying Tesseract...');
      } else {
        console.log('[OCR Hybrid] PDF conversion failed, using OpenRouter directly');
        const openrouterResult = await processWithOpenRouter(
          originalBuffer, file.type, user.id, supabase, fileMeta, startTime
        );
        return NextResponse.json(openrouterResult);
      }
    }

    // Step 1: Try Tesseract (FREE)
    console.log('[OCR Hybrid] Step 1: Trying Tesseract OCR...');
    const tesseractResult = await extractWithTesseract(ocrBuffer, ocrMimeType);

    const tesseractMeta = {
      confidence: tesseractResult.confidence,
      basicData: tesseractResult.basicData,
    };

    // Step 2: Check if Tesseract is reliable enough
    if (isTesseractResultReliable(tesseractResult)) {
      console.log(`[OCR Hybrid] Tesseract confidence ${tesseractResult.confidence} >= ${TESSERACT_CONFIDENCE_THRESHOLD}, using it`);

      // Build accounting data for Tesseract result (fixes 1B: Tesseract now has accounting)
      const category = 'other';
      const accountMapping = getAccountCode(category, null);
      const journalEntry = generateJournalEntry({
        category,
        supplierCategory: null,
        amountTtc: tesseractResult.basicData.amount ?? 0,
        amountHt: null,
        vatAmount: null,
        vatRate: null,
        paymentMethod: null,
      });

      const extracted = {
        vendor: tesseractResult.basicData.vendor,
        amount: tesseractResult.basicData.amount,
        date: tesseractResult.basicData.date,
        description: null,
        category,
        confidence: tesseractResult.confidence,
        currency: 'EUR',
        payment_method: null,
        document_type: 'receipt',
        supplier_category: null,
        account_code: accountMapping.code,
        account_label: accountMapping.label,
      };

      // Check vendor_mappings
      let finalAccountCode = accountMapping.code;
      let finalAccountLabel = accountMapping.label;
      if (extracted.vendor) {
        const normalized = extracted.vendor.toLowerCase().trim();
        const { data: mapping } = await supabase
          .from('vendor_mappings')
          .select('account_code, account_name, corrected_category')
          .eq('user_id', user.id)
          .ilike('vendor_name_pattern', normalized)
          .maybeSingle();
        if (mapping?.account_code) {
          finalAccountCode = mapping.account_code;
          finalAccountLabel = mapping.account_name || finalAccountLabel;
        }
        if (mapping?.corrected_category) {
          (extracted as Record<string, unknown>).category = mapping.corrected_category;
        }
      }

      const journalEntryJson = {
        debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
        credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
        vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
      };

      const expenseRecord: Record<string, unknown> = {
        user_id: user.id,
        vendor: extracted.vendor,
        amount: extracted.amount,
        category: extracted.category,
        date: extracted.date,
        description: extracted.description,
        receipt_url: receiptPublicUrl,
        receipt_storage_path: storagePath,
        status: 'pending',
        ocr_method: 'tesseract',
        ocr_confidence: extracted.confidence,
        ocr_currency: 'EUR',
        account_code: finalAccountCode,
        account_label: finalAccountLabel,
        journal_type: journalEntry.journalType,
        journal_entry: journalEntryJson,
        vat_account: journalEntry.vatAccount || null,
        document_type: 'receipt',
        supplier_category: null,
      };

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
        console.error('[OCR Hybrid] DB insert error:', dbError);
        return NextResponse.json(
          { warning: 'Extraction réussie mais erreur lors de la sauvegarde.', extracted, db_error: dbError.message },
          { status: 207 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'tesseract',
        confidence: extracted.confidence,
        processingTimeMs: Date.now() - startTime,
        costUsd: 0,
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
        tesseract_data: tesseractMeta,
      });

    } else {
      console.log(`[OCR Hybrid] Tesseract confidence ${tesseractResult.confidence} < ${TESSERACT_CONFIDENCE_THRESHOLD}, falling back to OpenRouter`);

      const openrouterResult = await processWithOpenRouter(
        originalBuffer, file.type, user.id, supabase, fileMeta, startTime
      );

      // Merge Tesseract data as reference
      if (openrouterResult.extracted) {
        (openrouterResult.extracted as Record<string, unknown>).ocr_raw_response = {
          openrouter: (openrouterResult.extracted as Record<string, unknown>).ocr_raw_response,
          tesseract: {
            text: tesseractResult.text,
            confidence: tesseractResult.confidence,
            basicData: tesseractResult.basicData,
          },
        };
      }

      return NextResponse.json({
        ...openrouterResult,
        method: 'hybrid',
        tesseract_data: tesseractMeta,
      });
    }

  } catch (error) {
    console.error('[OCR Hybrid] Unhandled error:', error);
    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }

    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors de l'analyse OCR hybride." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Process with OpenRouter (paid) — uses ocr-core for consistency
// ---------------------------------------------------------------------------

async function processWithOpenRouter(
  buffer: Buffer,
  mimeType: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fileMeta: { receiptUrl: string; storagePath: string; fileName?: string; fileSize?: number; fileType?: string; isPdf?: boolean },
  startTime: number
): Promise<{
  success: boolean;
  method: 'openrouter';
  confidence: number;
  processingTimeMs: number;
  costUsd: number;
  extracted?: Record<string, unknown>;
  accounting?: Record<string, unknown>;
  receipt_url?: string;
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

  // Use ocr-core for sanitize + accounts + journal + DB save
  const result = await processAndSaveExpense(parsed, userId, supabase, fileMeta);

  if (result.dbError) {
    console.error('[OCR Hybrid] DB insert error:', result.dbError);
    throw new Error('Erreur base de données: ' + result.dbError);
  }

  // Estimate cost
  const inputTokens = base64.length / 4;
  const outputTokens = JSON.stringify(parsed).length / 4;
  const costUsd = (inputTokens / 1_000_000) * 0.30 + (outputTokens / 1_000_000) * 2.50;

  return {
    success: true,
    method: 'openrouter',
    confidence: result.extracted.confidence as number,
    processingTimeMs: Date.now() - startTime,
    costUsd,
    extracted: result.savedExpense ?? result.extracted,
    accounting: result.accounting as Record<string, unknown>,
    receipt_url: fileMeta.receiptUrl,
  };
}
