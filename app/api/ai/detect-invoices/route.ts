import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import '@/lib/pdfjs-polyfill'; // Import polyfill first
import {
  extractPageAsImage,
  getPDFPageCount,
  type PageAnalysis,
  type InvoiceSegment,
  type DetectionResult,
  isPDF,
} from '@/lib/pdf-splitter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_PAGES = 50; // Limit pages to prevent abuse

// ---------------------------------------------------------------------------
// Detection Prompts
// ---------------------------------------------------------------------------

const DETECTION_PROMPT = `Tu es un expert en analyse de documents comptables. Ta mission est d'identifier si cette page contient le DÉBUT ou la FIN d'une facture.

ANALYSE :
1. DÉBUT de facture si :
   - Nouveau nom de fournisseur visible
   - Nouveau numéro de facture visible
   - En-tête avec "FACTURE", "DEVIS", "BON DE COMMANDE", etc.
   - Logo d'entreprise en haut
   - Tableau de lignes qui commence

2. FIN de facture si :
   - Ligne "Total TTC", "Montant à payer", "Net à payer", "À payer"
   - Mention de TVA, HT, TTC en bas
   - Informations de paiement (IBAN, SWIFT, RIB)
   - Pied de page avec conditions de paiement
   - Mention "TVA FR", "SIRET" en bas

3. CONTINUATION si :
   - Ligne de détails qui se poursuit sur la page
   - Tableau de produits/pages suivantes ("suite...", "page X/Y")
   - Pas de marqueur de début ou fin explicite
   - Détails de lignes de produits/services

Retourne UNIQUEMENT du JSON valide (pas de markdown) :
{
  "is_invoice_start": true/false,
  "is_invoice_end": true/false,
  "vendor": "nom du fournisseur ou null",
  "invoice_number": "numéro de facture ou null",
  "invoice_date": "YYYY-MM-DD ou null",
  "total_amount": nombre (montant total vu) ou null,
  "has_payment_info": true/false,
  "page_type": "header|detail|footer|mixed",
  "confidence": 0-100
}`;

// ---------------------------------------------------------------------------
// Helper: Analyze a single page
// ---------------------------------------------------------------------------

async function analyzePage(
  imageBuffer: Buffer,
  pageNumber: number,
  openrouter: OpenAI
): Promise<PageAnalysis> {
  const base64 = imageBuffer.toString('base64');

  try {
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash', // ✅ Modèle Gemini 2.5 Flash existant
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DETECTION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(rawContent);

    return {
      pageNumber,
      isInvoiceStart: Boolean(parsed.is_invoice_start),
      isInvoiceEnd: Boolean(parsed.is_invoice_end),
      vendor: parsed.vendor || null,
      invoiceNumber: parsed.invoice_number || null,
      invoiceDate: parsed.invoice_date || null,
      totalAmount: typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
      hasPaymentInfo: Boolean(parsed.has_payment_info),
      pageType: ['header', 'detail', 'footer', 'mixed'].includes(parsed.page_type)
        ? parsed.page_type
        : 'mixed',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
    };
  } catch (error) {
    console.error(`[Detect Invoices] Error analyzing page ${pageNumber}:`, error);
    // Return conservative default on error
    return {
      pageNumber,
      isInvoiceStart: false,
      isInvoiceEnd: false,
      vendor: null,
      invoiceNumber: null,
      invoiceDate: null,
      totalAmount: null,
      hasPaymentInfo: false,
      pageType: 'mixed',
      confidence: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: Build segments from page analyses
// ---------------------------------------------------------------------------

function buildSegments(analyses: PageAnalysis[]): InvoiceSegment[] {
  if (analyses.length === 0) {
    return [];
  }

  const segments: InvoiceSegment[] = [];
  let currentSegment: Partial<InvoiceSegment> | null = null;

  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    const pageNumber = analysis.pageNumber;

    // Start of a new invoice
    if (analysis.isInvoiceStart) {
      // Close previous segment if open
      if (currentSegment && currentSegment.startPage) {
        currentSegment.endPage = pageNumber - 1;
        if (currentSegment.startPage <= currentSegment.endPage) {
          segments.push({
            startPage: currentSegment.startPage!,
            endPage: currentSegment.endPage,
            vendor: currentSegment.vendor || null,
            invoiceNumber: currentSegment.invoiceNumber || null,
            date: currentSegment.date || null,
            confidence: currentSegment.confidence || 50,
          });
        }
      }

      // Start new segment
      currentSegment = {
        startPage: pageNumber,
        vendor: analysis.vendor,
        invoiceNumber: analysis.invoiceNumber,
        date: analysis.invoiceDate,
        confidence: analysis.confidence,
      };
    }

    // End of an invoice
    if (analysis.isInvoiceEnd && currentSegment && currentSegment.startPage) {
      currentSegment.endPage = pageNumber;
      if (currentSegment.startPage <= currentSegment.endPage) {
        segments.push({
          startPage: currentSegment.startPage,
          endPage: currentSegment.endPage,
          vendor: currentSegment.vendor || null,
          invoiceNumber: currentSegment.invoiceNumber || null,
          date: currentSegment.date || null,
          confidence: currentSegment.confidence || 50,
        });
      }
      currentSegment = null;
    }
  }

  // Close any remaining segment
  if (currentSegment && currentSegment.startPage) {
    currentSegment.endPage = analyses.length;
    if (currentSegment.startPage <= currentSegment.endPage) {
      segments.push({
        startPage: currentSegment.startPage,
        endPage: currentSegment.endPage,
        vendor: currentSegment.vendor || null,
        invoiceNumber: currentSegment.invoiceNumber || null,
        date: currentSegment.date || null,
        confidence: currentSegment.confidence || 50,
      });
    }
  }

  // If no segments detected, treat entire PDF as one invoice
  if (segments.length === 0 && analyses.length > 0) {
    return [{
      startPage: 1,
      endPage: analyses.length,
      vendor: null,
      invoiceNumber: null,
      date: null,
      confidence: 30, // Low confidence since we're guessing
    }];
  }

  return segments;
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
            'La détection multi-factures est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.',
          feature: 'detect_invoices',
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
    // 3. Parse & validate the uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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
    // 4. Get page count
    // ------------------------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const pageCount = await getPDFPageCount(pdfBuffer);

    if (pageCount > MAX_PAGES) {
      return NextResponse.json(
        { error: `Trop de pages (${pageCount}). Maximum : ${MAX_PAGES} pages.` },
        { status: 400 }
      );
    }

    if (pageCount === 1) {
      // Single page - return single segment
      return NextResponse.json({
        totalPages: 1,
        segments: [{
          startPage: 1,
          endPage: 1,
          vendor: null,
          invoiceNumber: null,
          date: null,
          confidence: 100,
        }],
        needsManualReview: false,
        analyses: [],
      });
    }

    // ------------------------------------------------------------------
    // 5. Initialize OpenRouter client
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // ------------------------------------------------------------------
    // 6. Analyze each page (with concurrency control)
    // ------------------------------------------------------------------
    const analyses: PageAnalysis[] = [];
    const CONCURRENT_LIMIT = 3;

    for (let i = 0; i < pageCount; i += CONCURRENT_LIMIT) {
      const batchEnd = Math.min(i + CONCURRENT_LIMIT, pageCount);
      const batchPromises = [];

      for (let j = i; j < batchEnd; j++) {
        const pageNumber = j + 1;
        batchPromises.push(
          (async () => {
            try {
              const imageBuffer = await extractPageAsImage(pdfBuffer, pageNumber);
              return await analyzePage(imageBuffer, pageNumber, openrouter);
            } catch (error) {
              console.error(`[Detect Invoices] Failed to analyze page ${pageNumber}:`, error);
              return {
                pageNumber,
                isInvoiceStart: false,
                isInvoiceEnd: false,
                vendor: null,
                invoiceNumber: null,
                invoiceDate: null,
                totalAmount: null,
                hasPaymentInfo: false,
                pageType: 'mixed' as const,
                confidence: 0,
              };
            }
          })()
        );
      }

      const batchResults = await Promise.all(batchPromises);
      analyses.push(...batchResults);
    }

    // Sort by page number to ensure order
    analyses.sort((a, b) => a.pageNumber - b.pageNumber);

    // ------------------------------------------------------------------
    // 7. Build invoice segments from analyses
    // ------------------------------------------------------------------
    const segments = buildSegments(analyses);

    // Determine if manual review is needed (low confidence segments)
    const needsManualReview = segments.some((s) => s.confidence < 70);

    // ------------------------------------------------------------------
    // 8. Return detection result
    // ------------------------------------------------------------------
    const result: DetectionResult = {
      totalPages: pageCount,
      segments,
      needsManualReview,
      analyses,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Detect Invoices] Unhandled error:', error);

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
      { error: err.message || "Erreur inattendue lors de la détection des factures." },
      { status: 500 }
    );
  }
}
