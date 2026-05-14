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

⚠️ RÈGLE LA PLUS IMPORTANTE - COMME DEXT:
- Regarde le contexte visuel complet de la page
- Détermine si cette page EST UN CONTINUATION d'une facture précédente ou une NOUVELLE facture
- Ne suppose pas "nouvelle facture" par défaut - analyse les marqueurs visuels

ANALYSE - DÉBUT de facture (is_invoice_start: true) :
MARQUEURS VISUELS DE DÉBUT (un ou plusieurs requis):
1. En-tête visible avec logo d'entreprise en haut de page
2. Nouveau nom de fournisseur différent de la page précédente
3. Nouveau numéro de facture visible
4. Mots-clés d'en-tête: "FACTURE", "DEVIS", "BON DE COMMANDE", "INVOICE", "REÇU"
5. Tableau de lignes de produits/services qui COMMENCE (avec en-têtes de colonnes)
6. Adresse du fournisseur / coordonnées en haut de page

IMPORTANT: is_invoice_start = true SEULEMENT si un ou plusieurs de ces marqueurs sont présents

ANALYSE - CONTINUATION (is_invoice_start: false) :
MARQUEURS VISUELS DE CONTINUATION (un ou plusieurs requis):
1. Tableau de produits qui continue SANS en-têtes de colonnes (lignes de données uniquement)
2. Texte qui semble coupé / continuation évidente du contenu précédent
3. Mentions explicites: "suite...", "page X/Y", "suite au verso", "continued"
4. AUCUN logo ou en-tête de fournisseur visible
5. Même numéro de facture que la page précédente (si visible)
6. Format de tableau identique à la page précédente

IMPORTANT: Si tu vois un tableau SANS en-têtes de colonnes et SANS logo/en-tête → c'est une CONTINUATION

ANALYSE - FIN de facture (is_invoice_end: true) :
MARQUEURS VISUELS DE FIN (un ou plusieurs requis):
1. Ligne "Total TTC", "Montant à payer", "Net à payer", "À payer", "Balance due"
2. Mentions de TVA en bas: "TVA", "HT", "TTC", "VAT"
3. Informations de paiement: IBAN, SWIFT, RIB, "Virement à", "Payment to"
4. Pied de page avec conditions de paiement, échéance
5. Mentions légales: "TVA FR", "SIRET", "Registration number"
6. Signature ou tampon en bas

IMPORTANT: is_invoice_end = true SEULEMENT si un ou plusieurs de ces marqueurs sont présents

CONTEXTE SPÉCIAL - Page unique avec contenu de facture:
- Si la page contient des infos de fournisseur ET un total → is_invoice_start: true, is_invoice_end: true
- Si la page contient un tableau SANS en-têtes et SANS total → is_invoice_start: false, is_invoice_end: false

DONNÉES À EXTRAIRE (sur toutes les pages):
- vendor: nom du fournisseur (visible en haut ou dans le pied de page)
- invoice_number: numéro de facture (ex: "FAC-2024-001", "INV-12345")
- invoice_date: date de facture en format YYYY-MM-DD
- total_amount: montant total TTC visible (nombre uniquement)
- has_payment_info: true si infos bancaires présentes
- page_type: "header" (en-tête), "detail" (tableau lignes), "footer" (pied avec total), "mixed" (plusieurs types)
- confidence: 0-100 basé sur la clarté des marqueurs

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

  console.log('[Detect Invoices] buildSegments - Analyses reçues:', analyses.length);

  const segments: InvoiceSegment[] = [];

  // LOGIQUE DEXT: Regrouper les pages qui appartiennent à la même facture
  // Une facture commence si is_invoice_start=true ou si c'est la 1ère page
  // Une facture continue tant qu'on n'a pas de marqueur de fin explicite
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    const pageNumber = analysis.pageNumber;

    console.log(`[Detect Invoices] Page ${pageNumber}: isInvoiceStart=${analysis.isInvoiceStart}, isInvoiceEnd=${analysis.isInvoiceEnd}, vendor=${analysis.vendor || 'N/A'}, invoiceNumber=${analysis.invoiceNumber || 'N/A'}`);

    // CAS 1: Début explicite d'une nouvelle facture (isInvoiceStart=true)
    if (analysis.isInvoiceStart) {
      // Fermer le segment précédent s'il est ouvert
      if (segments.length > 0 && segments[segments.length - 1].endPage === null) {
        segments[segments.length - 1].endPage = pageNumber - 1;
        console.log(`[Detect Invoices] Fermeture segment précédent à la page ${pageNumber - 1}`);
      }

      // Créer nouveau segment
      segments.push({
        startPage: pageNumber,
        endPage: analysis.isInvoiceEnd ? pageNumber : null,
        vendor: analysis.vendor || null,
        invoiceNumber: analysis.invoiceNumber || null,
        date: analysis.invoiceDate || null,
        confidence: analysis.confidence || 70,
      });

      console.log(`[Detect Invoices] Nouveau segment créé: page ${pageNumber}`);
    }
    // CAS 2: Continuation d'une facture existante (isInvoiceStart=false)
    else if (segments.length > 0 && segments[segments.length - 1].endPage === null) {
      // Un segment est ouvert → cette page appartient à la facture précédente
      const currentSegment = segments[segments.length - 1];

      // Fusionner les infos si l'IA détecte des données sur cette page
      if (analysis.vendor && !currentSegment.vendor) {
        currentSegment.vendor = analysis.vendor;
      }
      if (analysis.invoiceNumber && !currentSegment.invoiceNumber) {
        currentSegment.invoiceNumber = analysis.invoiceNumber;
      }
      if (analysis.invoiceDate && !currentSegment.date) {
        currentSegment.date = analysis.invoiceDate;
      }

      // Fermer si c'est la fin de la facture
      if (analysis.isInvoiceEnd) {
        currentSegment.endPage = pageNumber;
        console.log(`[Detect Invoices] Fin de facture détectée à la page ${pageNumber}`);
      }
      // Sinon, la facture continue (ne pas fermer endPage)
    }
    // CAS 3: Aucun segment ouvert et pas de début explicite → créer nouveau segment (cas de la 1ère page ou fallback)
    else {
      segments.push({
        startPage: pageNumber,
        endPage: analysis.isInvoiceEnd ? pageNumber : null,
        vendor: analysis.vendor || null,
        invoiceNumber: analysis.invoiceNumber || null,
        date: analysis.invoiceDate || null,
        confidence: analysis.confidence || 60,
      });

      console.log(`[Detect Invoices] Segment créé (pas de début explicite): page ${pageNumber}`);
    }
  }

  // Fermer tous les segments restants
  for (const segment of segments) {
    if (segment.endPage === null) {
      segment.endPage = analyses[analyses.length - 1].pageNumber;
      console.log(`[Detect Invoices] Fermeture finale du segment ${segment.startPage}-${segment.endPage}`);
    }
  }

  // Validation et nettoyage
  const validSegments = segments.filter(s => s.endPage !== null && s.startPage <= s.endPage);

  console.log(`[Detect Invoices] Segments créés: ${validSegments.length}`);
  validSegments.forEach((s, i) => {
    console.log(`[Detect Invoices] Segment ${i + 1}: pages ${s.startPage}-${s.endPage}, vendor: ${s.vendor || 'N/A'}`);
  });

  // Fallback: si aucun segment (ne devrait pas arriver), créer un segment par page
  if (validSegments.length === 0 && analyses.length > 0) {
    console.log('[Detect Invoices] ⚠️ Aucun segment créé, fallback: 1 segment par page');
    return analyses.map(a => ({
      startPage: a.pageNumber,
      endPage: a.pageNumber,
      vendor: a.vendor || null,
      invoiceNumber: a.invoiceNumber || null,
      date: a.invoiceDate || null,
      confidence: 50,
    }));
  }

  return validSegments;
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
