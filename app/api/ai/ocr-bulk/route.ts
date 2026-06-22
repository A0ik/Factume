import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import {
  generateStoragePath,
  buildOcrPrompt,
  runWithConcurrency,
  ALLOWED_MIME_TYPES,
} from '@/lib/ocr-helpers';
import { processAndSaveExpense, processSegments, type MultiPageOCRResult } from '@/lib/ocr-core';
import { detectInvoiceSegments, isPDF as isPdfMime } from '@/lib/pdf-splitter';

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

    // Sanitize, resolve accounts, generate journal entry, save to DB — all via ocr-core
    const result = await processAndSaveExpense(parsed, userId, supabase, {
      receiptUrl,
      storagePath,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      isPdf,
    });

    if (result.dbError) {
      console.error(`[OCR Bulk] Insert failed for ${fileName}:`, result.dbError);
      return { success: false, file: fileName, error: `Erreur base de données : ${result.dbError}` };
    }

    return { success: true, file: fileName, expense: result.savedExpense ?? undefined };
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
    // 6. Multi-invoice detection (direct function calls, no HTTP)
    // ------------------------------------------------------------------
    if (detectMultiInvoice && files.length === 1 && files[0].type === 'application/pdf') {
      const pdfFile = files[0];

      // Validate MIME
      if (!isPdfMime(pdfFile.type)) {
        return NextResponse.json(
          { error: `Type de fichier non supporté (${pdfFile.type}). Seuls les fichiers PDF sont acceptés.` },
          { status: 400 },
        );
      }

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      const openrouterForDetect = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Detect invoice boundaries (direct call, no HTTP)
      let detectResult;
      try {
        detectResult = await detectInvoiceSegments(pdfBuffer, openrouterForDetect);
      } catch (detectError) {
        console.error('[OCR Bulk] Detection failed:', detectError);
        return NextResponse.json(
          { error: 'Erreur lors de la détection des factures' },
          { status: 500 },
        );
      }

      // Extract each detected invoice (direct call, no HTTP)
      let extractResults: MultiPageOCRResult[];
      try {
        extractResults = await processSegments(
          pdfBuffer,
          detectResult.segments,
          user.id,
          supabase,
          openrouterForDetect,
          2,
        );
      } catch (extractError) {
        console.error('[OCR Bulk] Extraction failed:', extractError);
        return NextResponse.json(
          { error: "Erreur lors de l'extraction des factures" },
          { status: 500 },
        );
      }

      const bulkResults = extractResults.map((r) => ({
        success: r.success,
        file: pdfFile.name,
        fileSegment: r.segment
          ? `p.${r.segment.startPage}-${r.segment.endPage}`
          : undefined,
        expense: r.expense,
        error: r.error,
      }));

      const successCount = extractResults.filter((r) => r.success).length;

      return NextResponse.json({
        results: bulkResults,
        summary: {
          totalSegments: detectResult.segments.length,
          succeeded: successCount,
          failed: detectResult.segments.length - successCount,
        },
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
