import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature, consumeOcrQuota } from '@/lib/subscription-guard';
import {
  type DetectionResult,
  type InvoiceSegment,
  isPDF,
  detectInvoiceSegments,
} from '@/lib/pdf-splitter';
import { processSegments } from '@/lib/ocr-core';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60; // MERCURE : assoupli (était 5) — le cap mensuel 500 borne le total.
const MAX_SEGMENTS = 20; // Max invoices per PDF

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OCRResult {
  success: boolean;
  segment?: InvoiceSegment;
  expense?: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  receipt_url?: string;
  receipt_storage_path?: string;
  error?: string;
}

interface MultiPageOCRResponse {
  results: OCRResult[];
  summary: {
    totalSegments: number;
    succeeded: number;
    failed: number;
  };
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
          { status: 429 }
        );
      }
    }

    // ------------------------------------------------------------------
    // 3. Parse & validate the uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const segmentsJson = formData.get('segments') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni. Envoyez un fichier via le champ "file".' },
        { status: 400 }
      );
    }

    if (!isPDF(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté (${file.type}). Seuls les fichiers PDF sont acceptés.` },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 50 Mo.` },
        { status: 413 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Parse or detect segments
    // ------------------------------------------------------------------
    let segments: InvoiceSegment[];

    if (segmentsJson) {
      // Use provided segments
      try {
        const parsed = JSON.parse(segmentsJson);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Invalid segments format');
        }
        segments = parsed;
      } catch {
        return NextResponse.json(
          { error: 'Format des segments invalide.' },
          { status: 400 }
        );
      }
    } else {
      // Auto-detect segments via direct function call (no HTTP)
      const arrayBuffer = await file.arrayBuffer();
      const pdfBufferForDetect = Buffer.from(arrayBuffer);
      const openrouterForDetect = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY!,
      });

      try {
        const detectData = await detectInvoiceSegments(pdfBufferForDetect, openrouterForDetect);
        segments = detectData.segments;
      } catch {
        return NextResponse.json(
          { error: 'Échec de la détection automatique des factures.' },
          { status: 500 }
        );
      }
    }

    if (segments.length > MAX_SEGMENTS) {
      return NextResponse.json(
        { error: `Trop de factures détectées (${segments.length}). Maximum : ${MAX_SEGMENTS}.` },
        { status: 400 }
      );
    }

    // MERCURE (juin 2026) — OCR multi-factures : 500 factures/mois (Business). Quota atomique par lot.
    const ocrQuota = await consumeOcrQuota(user.id, segments.length);
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
    // 5. Process PDF and extract invoices
    // ------------------------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const results = await processSegments(pdfBuffer, segments, user.id, supabase,
      new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY! }), 2
    );

    // ------------------------------------------------------------------
    // 6. Return results
    // ------------------------------------------------------------------
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      results,
      summary: {
        totalSegments: segments.length,
        succeeded: successCount,
        failed: segments.length - successCount,
      },
    } satisfies MultiPageOCRResponse);
  } catch (error: unknown) {
    console.error('[OCR Multi-Page] Unhandled error:', error);

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

    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: 'Le délai d\'analyse a été dépassé. Réessayez avec un fichier plus léger.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors du traitement multi-factures." },
      { status: 500 }
    );
  }
}
