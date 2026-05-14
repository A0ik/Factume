import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import '@/lib/pdfjs-polyfill'; // Import polyfill first
import {
  splitPdfBySegments,
  mergePagesToImage,
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

async function extractInvoiceFromImage(
  imageBuffer: Buffer,
  segment: InvoiceSegment,
  userCookie: string,
): Promise<OCRResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INTERNAL_FETCH_TIMEOUT_MS);

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('file', blob, `segment_${segment.startPage}-${segment.endPage}.png`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/ai/ocr-receipt`, {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur OCR inconnue' }));
      return {
        success: false,
        segment,
        error: errorData.error || "Erreur lors de l'extraction OCR",
      };
    }

    const data = await response.json();
    return {
      success: true,
      segment,
      expense: data.expense ?? data.extracted,
    };
  } catch (error) {
    console.error(`[OCR Multi-Page] Error processing segment ${segment.startPage}-${segment.endPage}:`, error);
    const message = error instanceof Error
      ? (error.name === 'AbortError' ? 'Délai dépassé pour ce segment.' : error.message)
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
        // ✅ Validation de sécurité: endPage ne doit pas être null
        const endPage = segment.endPage ?? segment.startPage;

        console.log(`[OCR Multi-Page] Processing segment: pages ${segment.startPage}-${endPage}`);

        const imageBuffer = await mergePagesToImage(pdfBuffer, segment.startPage, endPage);
        results[idx] = await extractInvoiceFromImage(imageBuffer, segment, userCookie);
      } catch (error) {
        console.error(`[OCR Multi-Page] Worker error for segment ${segment.startPage}-${segment.endPage}:`, error);

        // ✅ Gestion améliorée des erreurs avec messages plus clairs
        let errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

        // Détecter les erreurs spécifiques pour donner des conseils
        if (errorMessage.includes('IMAGE_TAILLE_TROP_GRANDE')) {
          const match = errorMessage.match(/IMAGE_TAILLE_TROP_GRANDE:(\d+)×(\d+)\|(.+)/);
          if (match) {
            errorMessage = `Segment trop volumineux (${match[1]}×${match[2]}px). ${match[3]}`;
          }
        } else if (errorMessage.includes('canvas') || errorMessage.includes('Canvas')) {
          errorMessage = 'Erreur de rendu PDF. Le fichier peut être corrompu ou utiliser un format non supporté.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          errorMessage = 'Délai d\'analyse dépassé. Le segment contient peut-être trop de pages ou des images complexes.';
        }

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
    const results = await processSegments(pdfBuffer, segments, userCookie, 2);

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
