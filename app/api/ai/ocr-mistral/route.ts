import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateStoragePath, buildOcrPrompt, ALLOWED_MIME_TYPES } from '@/lib/ocr-helpers';
import { processAndSaveExpense } from '@/lib/ocr-core';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ocrWithMistral } from '@/lib/mistral-ocr';

// ─────────────────────────────────────────────────────────────────────────────
// SAGE (CIBLE 3) — OCR hybride 2 stages « surpasser Dext.com » au meilleur coût.
//   Stage 1 : Mistral OCR (mistral-ocr-latest) — document → markdown (layout SOTA,
//             natif PDF multi-pages, ~$1/1000p, excellent en français).
//   Stage 2 : Gemini 2.5 Flash (OpenRouter, clé mutualisée) — markdown → JSON
//             comptable strict (PCG, TVA, lignes).
// Réponse drop-in identique à /api/ai/ocr-receipt (le scan page peut basculer
// sans rien changer d'autre). meta.engine = 'mistral', meta.ocr_markdown fourni
// pour une future surbrillance source (bounding boxes Dext-like).
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const STRUCTURE_MODEL = 'google/gemini-2.5-flash';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit IP
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) } },
      );
    }

    // 2. Auth + plan Business/essai
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    const isBusiness = profile.subscription_tier === 'business';
    // ZEUS (suivi #3) — OCR multi-factures = Business strict (l'essai = Pro n'y a pas accès).
    if (!isBusiness) {
      return NextResponse.json(
        { error: "L'analyse OCR multi-factures est disponible uniquement avec le plan Business.", feature: 'ocr', requiredPlan: 'business', upgradeUrl: '/paywall?plan=business' },
        { status: 402 },
      );
    }

    // 3. Rate limit Supabase (comptage expenses/min)
    {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentCount } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart);
      if (recentCount !== null && recentCount >= RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json({ error: 'Trop de requêtes OCR. Réessayez dans une minute.' }, { status: 429 });
      }
    }

    // 4. Clés API présentes
    if (!process.env.MISTRAL_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (MISTRAL_API_KEY).' }, { status: 500 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY).' }, { status: 500 });
    }

    // 5. Fichier
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Type non supporté (${file.type}). Formats : JPEG, PNG, WebP, HEIC, PDF.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Max 20 Mo.` }, { status: 400 });
    }

    const isPdf = file.type === 'application/pdf';
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const originalMimeType = file.type || 'image/jpeg';

    // 6. Upload du justificatif (receipts bucket) — REQUIS par le trigger expenses_enforce_receipt
    const storagePath = generateStoragePath(user.id, file.name);
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, originalBuffer, { contentType: originalMimeType, upsert: false });
    if (uploadError) {
      console.error('[OCR Mistral] Storage upload error:', uploadError);
      return NextResponse.json({ error: "Impossible de sauvegarder le justificatif." }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptPublicUrl = urlData.publicUrl;

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 1 — Mistral OCR : document → markdown
    // ═══════════════════════════════════════════════════════════════════════════
    let mistralMarkdown = '';
    let mistralPages = 0;
    try {
      const ocr = await ocrWithMistral(originalBuffer, originalMimeType);
      mistralMarkdown = ocr.markdown;
      mistralPages = ocr.pages.length;
    } catch (e: any) {
      console.error('[OCR Mistral] Stage 1 (Mistral OCR) failed:', e?.message);
      return NextResponse.json(
        { error: "Échec de l'OCR Mistral. Réessayez ou utilisez un autre format.", detail: e?.message },
        { status: 502 },
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2 — Gemini 2.5 Flash (OpenRouter) : markdown → JSON comptable strict
    // ═══════════════════════════════════════════════════════════════════════════
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const structurePrompt = `${buildOcrPrompt()}

══════════════════════════════════════════════════════════════════════════
TEXTE OCR EXTRAIT PAR MISTRAL (source de vérité — le document original) :
══════════════════════════════════════════════════════════════════════════
${mistralMarkdown}
══════════════════════════════════════════════════════════════════════════

Analyse le texte OCR ci-dessus (et non une image) et produis l'écriture comptable.`;

    let rawContent = '';
    try {
      const completion = await openrouter.chat.completions.create({
        model: STRUCTURE_MODEL,
        messages: [{ role: 'user', content: structurePrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      rawContent = completion.choices[0]?.message?.content || '';
    } catch (e: any) {
      console.error('[OCR Mistral] Stage 2 (Gemini) failed:', e?.message);
      return NextResponse.json(
        { error: "Échec de la structuration IA (Gemini). Réessayez.", detail: e?.message },
        { status: 502 },
      );
    }

    if (!rawContent) {
      return NextResponse.json({ error: "L'IA n'a retourné aucune réponse." }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('[OCR Mistral] JSON parse error:', rawContent.slice(0, 500));
      return NextResponse.json({ error: "Impossible d'interpréter la réponse de l'IA." }, { status: 500 });
    }

    // 8. Sanitisation + comptes PCG + écriture + sauvegarde (shared avec ocr-receipt)
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
          engine: 'mistral',
          ocr_model: 'mistral-ocr-latest',
          structure_model: STRUCTURE_MODEL,
          ocr_pages: mistralPages,
          ocr_confidence: result.extracted.confidence,
          needs_review: result.validation.needsReview,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[OCR Mistral] Unhandled error:', error);
    const err = error as { message?: string; status?: number; name?: string };
    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes vers le service IA. Réessayez.' }, { status: 429 });
    }
    if (err.message?.includes('timeout') || err.message?.includes('Timeout') || err.name === 'AbortError') {
      return NextResponse.json({ error: "Délai d'analyse dépassé. Réessayez avec un fichier plus léger." }, { status: 504 });
    }
    return NextResponse.json({ error: err.message || "Erreur inattendue lors de l'analyse OCR." }, { status: 500 });
  }
}
