import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateStoragePath, buildOcrPrompt, ALLOWED_MIME_TYPES } from '@/lib/ocr-helpers';
import { processAndSaveExpense } from '@/lib/ocr-core';
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
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 }); // LOI 9
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

    // ZEUS (CIBLE 3) — OCR simple (pré-remplissage d'UNE note de frais) = Pro+.
    // La barrière Business ne s'applique qu'à l'OCR multi-factures type Dext.
    const tier = profile.subscription_tier;
    const isProPlus = tier === 'pro' || tier === 'business' || tier === 'solo'; // 'solo' legacy → pro
    const isTrial = profile.is_trial_active === true;

    if (!isProPlus && !isTrial) {
      return NextResponse.json(
        {
          error:
            "Le scan de justificatif est disponible avec le plan Pro. Passez à un plan supérieur pour débloquer les notes de frais.",
          feature: 'ocrSimple',
          requiredPlan: 'pro',
          upgradeUrl: '/paywall?plan=pro',
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

    // Sanitize, resolve accounts, generate journal entry, save to DB — all in one call
    const result = await processAndSaveExpense(parsed, user.id, supabase, {
      receiptUrl: receiptPublicUrl,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isPdf,
    });

    if (result.dbError) {
      return NextResponse.json(
        {
          warning: 'Extraction réussie mais erreur lors de la sauvegarde en base.',
          extracted: result.extracted,
          receipt_url: receiptPublicUrl,
          receipt_storage_path: storagePath,
          db_error: result.dbError,
        },
        { status: 207 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        expense: result.savedExpense,
        extracted: result.extracted,
        accounting: result.accounting,
        validation: result.validation,
        receipt_url: receiptPublicUrl,
        receipt_storage_path: storagePath,
        meta: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          is_pdf: isPdf,
          model: OCR_MODEL,
          ocr_confidence: result.extracted.confidence,
          needs_review: result.validation.needsReview,
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
