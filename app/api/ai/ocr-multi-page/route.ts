import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  extractPageRange,
  type DetectionResult,
  type InvoiceSegment,
  isPDF,
} from '@/lib/pdf-splitter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5; // Stricter limit for multi-page
const MAX_SEGMENTS = 20; // Max invoices per PDF

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OCRResult {
  success: boolean;
  segment?: InvoiceSegment;
  expense?: Record<string, unknown>;
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
// Helper: Call the existing OCR receipt endpoint
// ---------------------------------------------------------------------------

const INTERNAL_FETCH_TIMEOUT_MS = 60_000;

async function extractInvoiceFromPDF(
  pdfBuffer: Buffer,
  segment: InvoiceSegment,
  userCookie: string,
  req: Request,
): Promise<OCRResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INTERNAL_FETCH_TIMEOUT_MS);

  try {
    const endPage = segment.endPage ?? segment.startPage;
    console.log(`[OCR Multi-Page] 🔍 Extraction segment PDF ${segment.startPage}-${endPage}`);

    // Extraire le segment PDF (sans conversion en image)
    const { extractPageRange } = await import('@/lib/pdf-splitter');
    const segmentPdfBuffer = await extractPageRange(pdfBuffer, segment.startPage, endPage);

    console.log(`[OCR Multi-Page] 📦 Segment PDF extrait: ${segmentPdfBuffer.length} bytes`);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(segmentPdfBuffer)], { type: 'application/pdf' });
    formData.append('file', blob, `segment_${segment.startPage}-${endPage}.pdf`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`
      : 'http://localhost:3000';

    console.log(`[OCR Multi-Page] 📡 Appel OCR vers: ${baseUrl}/api/ai/ocr-receipt`);

    const response = await fetch(`${baseUrl}/api/ai/ocr-receipt`, {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: formData,
      signal: controller.signal,
    });

    console.log(`[OCR Multi-Page] 📥 Réponse OCR: status=${response.status}, ok=${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur OCR inconnue' }));
      console.error(`[OCR Multi-Page] ❌ Erreur OCR segment ${segment.startPage}-${endPage}:`, errorData);

      return {
        success: false,
        segment,
        error: errorData.error || `Erreur HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[OCR Multi-Page] ✅ Extraction réussie segment ${segment.startPage}-${endPage}`);

    return {
      success: true,
      segment,
      expense: data.expense ?? data.extracted,
    };
  } catch (error) {
    console.error(`[OCR Multi-Page] 💥 Exception segment ${segment.startPage}-${segment.endPage}:`, error);
    const message = error instanceof Error
      ? (error.name === 'AbortError' ? 'Délai dépassé (timeout 60s).' : error.message)
      : 'Erreur inconnue';
    return { success: false, segment, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Helper: Process segments with concurrency limit (queue-based, race-free)
// ---------------------------------------------------------------------------

async function processSegments(
  pdfBuffer: Buffer,
  segments: InvoiceSegment[],
  userCookie: string,
  req: Request,
  limit: number = 2,
): Promise<OCRResult[]> {
  const results = new Array<OCRResult>(segments.length);
  // queue holds [originalIndex, segment] — shift() is synchronous, no race
  const queue: Array<[number, InvoiceSegment]> = segments.map((s, i) => [i, s]);

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [idx, segment] = item;

      try {
        console.log(`[OCR Multi-Page] Worker ${idx}: Processing segment pages ${segment.startPage}-${segment.endPage ?? segment.startPage}`);

        // Utiliser extractInvoiceFromPDF au lieu de mergePagesToImage + extractInvoiceFromImage
        results[idx] = await extractInvoiceFromPDF(pdfBuffer, segment, userCookie, req);
      } catch (error) {
        console.error(`[OCR Multi-Page] Worker error for segment ${segment.startPage}-${segment.endPage ?? segment.startPage}:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results[idx] = {
          success: false,
          segment,
          error: errorMessage,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, segments.length) }, worker));
  return results;
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
            'L\'OCR multi-factures est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.',
          feature: 'ocr_multi_page',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 }
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
      // Auto-detect segments by calling detect-invoices endpoint
      const detectFormData = new FormData();
      detectFormData.append('file', file);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const detectUrl = `${baseUrl}/api/ai/detect-invoices`;
      const userCookieForDetect = req.headers.get('cookie') ?? '';

      const detectResponse = await fetch(detectUrl, {
        method: 'POST',
        headers: { Cookie: userCookieForDetect },
        body: detectFormData,
      });

      if (!detectResponse.ok) {
        return NextResponse.json(
          { error: 'Échec de la détection automatique des factures.' },
          { status: 500 }
        );
      }

      const detectData: DetectionResult = await detectResponse.json();
      segments = detectData.segments;
    }

    if (segments.length > MAX_SEGMENTS) {
      return NextResponse.json(
        { error: `Trop de factures détectées (${segments.length}). Maximum : ${MAX_SEGMENTS}.` },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 5. Process PDF and extract invoices
    // ------------------------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const userCookie = req.headers.get('cookie') ?? '';
    const results = await processSegments(pdfBuffer, segments, userCookie, req, 2);

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
