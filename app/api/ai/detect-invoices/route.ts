import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  extractPageRange,
  getPDFPageCount,
  structuralAnalysis,
  type PageAnalysis,
  type InvoiceSegment,
  type DetectionResult,
  type StructuralPageInfo,
  isPDF,
} from '@/lib/pdf-splitter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_PAGES = 50;
const RATE_LIMIT_MAX_REQUESTS_DETECT = 10;

// ---------------------------------------------------------------------------
// Detection Prompt WITH cross-page context
// ---------------------------------------------------------------------------

function buildContextualPrompt(
  pageNumber: number,
  totalPages: number,
  previousAnalysis: PageAnalysis | null,
  structuralInfo: StructuralPageInfo | null
): string {
  let contextSection = '';

  if (previousAnalysis) {
    contextSection += `
CONTEXTE DE LA PAGE PRÉCÉDENTE (page ${previousAnalysis.pageNumber}):
- is_invoice_start: ${previousAnalysis.isInvoiceStart}
- is_invoice_end: ${previousAnalysis.isInvoiceEnd}
- vendor: "${previousAnalysis.vendor || 'N/A'}"
- invoice_number: "${previousAnalysis.invoiceNumber || 'N/A'}"
- page_type: ${previousAnalysis.pageType}
- had_payment_info: ${previousAnalysis.hasPaymentInfo}

⚠️ DÉDUCTION IMPORTANTE:
${previousAnalysis.isInvoiceEnd ? '- La page précédente SE TERMINAIT par une facture (total, IBAN, etc.) → Cette page est PROBABLEMENT une NOUVELLE facture.' : '- La page précédente NE se terminait PAS → Cette page est PROBABLEMENT une CONTINUATION de la même facture.'}
`;
  }

  if (structuralInfo) {
    contextSection += `
PRÉ-ANALYSE TEXTUELLE DE CETTE PAGE:
- Mots-clés facture détectés: ${structuralInfo.hasInvoiceKeywords ? 'OUI' : 'NON'}
- Mots-clés total détectés: ${structuralInfo.hasTotalKeywords ? 'OUI' : 'NON'}
- Infos paiement (IBAN, etc.): ${structuralInfo.hasPaymentInfo ? 'OUI' : 'NON'}
- En-têtes de tableau: ${structuralInfo.hasTableHeaders ? 'OUI' : 'NON'}

⚠️ DÉDUCTION:
${structuralInfo.hasInvoiceKeywords && previousAnalysis?.isInvoiceEnd ? '- Mots-clés "facture" + page précédente terminée → FORTE probabilité de NOUVELLE facture' : ''}
${structuralInfo.hasTotalKeywords ? '- Mots-clés "total/net à payer" détectés → Cette page contient probablement la FIN d\'une facture' : ''}
${!structuralInfo.hasInvoiceKeywords && !structuralInfo.hasTotalKeywords && structuralInfo.hasTableHeaders ? '- En-têtes de tableau sans "facture" ni "total" → Probablement une CONTINUATION de tableau' : ''}
`;
  }

  return `Tu es un expert en analyse de documents comptables. Ta mission est d'identifier si cette page contient le DÉBUT ou la FIN d'une facture.

TU ANALYSES LA PAGE ${pageNumber} SUR ${totalPages} d'un PDF multi-factures.

${contextSection}

⚠️ RÈGLE LA PLUS IMPORTANTE:
- Utilise le CONTEXTE ci-dessus pour prendre ta décision
- Si la page précédente avait un total/IBAN (is_invoice_end=true), cette page est probablement une NOUVELLE facture
- Si la page précédente n'avait PAS de fin, cette page est probablement une CONTINUATION

ANALYSE - DÉBUT de facture (is_invoice_start: true) :
MARQUEURS DE DÉBUT:
1. En-tête avec logo d'entreprise
2. Nouveau nom de fournisseur
3. Nouveau numéro de facture
4. Mots-clés: "FACTURE", "INVOICE", "DEVIS", "BON DE COMMANDE"
5. Tableau qui COMMENCE (avec en-têtes de colonnes)
6. Adresse fournisseur en haut

ANALYSE - CONTINUATION (is_invoice_start: false) :
1. Tableau SANS en-têtes de colonnes (lignes de données uniquement)
2. Texte coupé / continuation évidente
3. "suite...", "page X/Y", "continued"
4. AUCUN logo ni en-tête fournisseur
5. Même numéro de facture que la page précédente

ANALYSE - FIN de facture (is_invoice_end: true) :
1. "Total TTC", "Net à payer", "Balance due"
2. Détails TVA en bas
3. IBAN, SWIFT, RIB, infos bancaires
4. Conditions de paiement, échéance
5. Mentions légales, SIRET en pied de page

CAS SPÉCIAL:
- Page unique avec fournisseur ET total → is_invoice_start: true, is_invoice_end: true

Retourne UNIQUEMENT du JSON valide (pas de markdown):
{
  "is_invoice_start": true/false,
  "is_invoice_end": true/false,
  "vendor": "nom du fournisseur ou null",
  "invoice_number": "numéro de facture ou null",
  "invoice_date": "YYYY-MM-DD ou null",
  "total_amount": nombre ou null,
  "has_payment_info": true/false,
  "page_type": "header|detail|footer|mixed",
  "confidence": 0-100
}`;
}

// ---------------------------------------------------------------------------
// Helper: Analyze page WITH context
// ---------------------------------------------------------------------------

async function analyzePageWithContext(
  pagePdfBuffer: Buffer,
  pageNumber: number,
  totalPages: number,
  previousAnalysis: PageAnalysis | null,
  structuralInfo: StructuralPageInfo | null,
  openrouter: OpenAI
): Promise<PageAnalysis> {
  // If structural analysis gives very high confidence, skip AI call
  if (structuralInfo && previousAnalysis) {
    const prevEnded = previousAnalysis.isInvoiceEnd;
    const hasStart = structuralInfo.hasInvoiceKeywords;
    const hasEnd = structuralInfo.hasTotalKeywords || structuralInfo.hasPaymentInfo;

    // High confidence: previous page ended + this page has invoice keywords
    if (prevEnded && hasStart && !hasEnd) {
      return {
        pageNumber,
        isInvoiceStart: true,
        isInvoiceEnd: false,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: false,
        pageType: 'header',
        confidence: 92,
      };
    }

    // High confidence: previous page did NOT end + no start markers + no end markers
    if (!prevEnded && !hasStart && !hasEnd) {
      return {
        pageNumber,
        isInvoiceStart: false,
        isInvoiceEnd: false,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: false,
        pageType: 'detail',
        confidence: 90,
      };
    }

    // High confidence: this page has total + payment info = end of invoice
    if (hasEnd && structuralInfo.hasPaymentInfo) {
      return {
        pageNumber,
        isInvoiceStart: false,
        isInvoiceEnd: true,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: true,
        pageType: 'footer',
        confidence: 92,
      };
    }

    // Single-page complete invoice
    if (hasStart && hasEnd && totalPages === 1) {
      return {
        pageNumber,
        isInvoiceStart: true,
        isInvoiceEnd: true,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: structuralInfo.hasPaymentInfo,
        pageType: 'mixed',
        confidence: 95,
      };
    }
  }

  // Fall through to AI analysis
  const base64 = pagePdfBuffer.toString('base64');
  const prompt = buildContextualPrompt(pageNumber, totalPages, previousAnalysis, structuralInfo);

  try {
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error('No response from AI');

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
    // Use structural info as fallback
    if (structuralInfo) {
      return {
        pageNumber,
        isInvoiceStart: structuralInfo.hasInvoiceKeywords,
        isInvoiceEnd: structuralInfo.hasTotalKeywords || structuralInfo.hasPaymentInfo,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: structuralInfo.hasPaymentInfo,
        pageType: structuralInfo.hasInvoiceKeywords ? 'header' : structuralInfo.hasTotalKeywords ? 'footer' : 'mixed',
        confidence: 40,
      };
    }
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
// Build segments from page analyses
// ---------------------------------------------------------------------------

function buildSegments(analyses: PageAnalysis[]): InvoiceSegment[] {
  if (analyses.length === 0) return [];

  console.log('[Detect Invoices] buildSegments - Analyses:', analyses.length);

  const segments: InvoiceSegment[] = [];

  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i];
    const pageNumber = analysis.pageNumber;

    console.log(`[Detect Invoices] Page ${pageNumber}: start=${analysis.isInvoiceStart}, end=${analysis.isInvoiceEnd}, vendor=${analysis.vendor || 'N/A'}, conf=${analysis.confidence}`);

    // CAS 1: Explicit start of a new invoice
    if (analysis.isInvoiceStart) {
      // Close previous segment if open
      if (segments.length > 0 && segments[segments.length - 1].endPage === null) {
        segments[segments.length - 1].endPage = pageNumber - 1;
      }
      // Create new segment
      segments.push({
        startPage: pageNumber,
        endPage: analysis.isInvoiceEnd ? pageNumber : null,
        vendor: analysis.vendor || null,
        invoiceNumber: analysis.invoiceNumber || null,
        date: analysis.invoiceDate || null,
        confidence: analysis.confidence || 70,
      });
    }
    // CAS 2: Continuation of an open segment
    else if (segments.length > 0 && segments[segments.length - 1].endPage === null) {
      const currentSegment = segments[segments.length - 1];
      // Merge info from this page
      if (analysis.vendor && !currentSegment.vendor) currentSegment.vendor = analysis.vendor;
      if (analysis.invoiceNumber && !currentSegment.invoiceNumber) currentSegment.invoiceNumber = analysis.invoiceNumber;
      if (analysis.invoiceDate && !currentSegment.date) currentSegment.date = analysis.invoiceDate;

      // Close if end detected
      if (analysis.isInvoiceEnd) {
        currentSegment.endPage = pageNumber;
      }
    }
    // CAS 2.5: Previous segment is closed, no explicit start — this is a new invoice
    else if (segments.length > 0 && segments[segments.length - 1].endPage !== null) {
      segments.push({
        startPage: pageNumber,
        endPage: analysis.isInvoiceEnd ? pageNumber : null,
        vendor: analysis.vendor || null,
        invoiceNumber: analysis.invoiceNumber || null,
        date: analysis.invoiceDate || null,
        confidence: Math.max(analysis.confidence || 60, 50),
      });
    }
    // CAS 3: No segment exists yet — create first segment
    else {
      segments.push({
        startPage: pageNumber,
        endPage: analysis.isInvoiceEnd ? pageNumber : null,
        vendor: analysis.vendor || null,
        invoiceNumber: analysis.invoiceNumber || null,
        date: analysis.invoiceDate || null,
        confidence: analysis.confidence || 60,
      });
    }
  }

  // Close remaining open segments
  for (const segment of segments) {
    if (segment.endPage === null) {
      segment.endPage = analyses[analyses.length - 1].pageNumber;
    }
  }

  // Merge adjacent segments with same invoice number
  const merged: InvoiceSegment[] = [];
  for (const segment of segments) {
    if (
      merged.length > 0 &&
      segment.invoiceNumber &&
      merged[merged.length - 1].invoiceNumber === segment.invoiceNumber &&
      merged[merged.length - 1].endPage === segment.startPage - 1
    ) {
      // Same invoice number and contiguous — merge
      merged[merged.length - 1].endPage = segment.endPage;
      if (segment.vendor) merged[merged.length - 1].vendor = segment.vendor;
      merged[merged.length - 1].confidence = Math.max(merged[merged.length - 1].confidence, segment.confidence);
    } else {
      merged.push({ ...segment });
    }
  }

  // Filter valid segments
  const valid = merged.filter(s => s.endPage !== null && s.startPage <= s.endPage);

  console.log(`[Detect Invoices] ${valid.length} segments:`);
  valid.forEach((s, i) => console.log(`  Segment ${i + 1}: pages ${s.startPage}-${s.endPage}, vendor=${s.vendor || 'N/A'}`));

  // Fallback: if no segments, one per page
  if (valid.length === 0 && analyses.length > 0) {
    return analyses.map(a => ({
      startPage: a.pageNumber,
      endPage: a.pageNumber,
      vendor: a.vendor || null,
      invoiceNumber: a.invoiceNumber || null,
      date: a.invoiceDate || null,
      confidence: 50,
    }));
  }

  return valid;
}

// ---------------------------------------------------------------------------
// POST handler — SEQUENTIAL processing with cross-page context
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
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
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json(
        { error: 'La détection multi-factures nécessite le plan Business.', feature: 'detect_invoices', requiredPlan: 'business', upgradeUrl: '/paywall?plan=business' },
        { status: 402 }
      );
    }

    // 2. Rate limiting
    {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentCount } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart);
      if (recentCount !== null && recentCount >= RATE_LIMIT_MAX_REQUESTS_DETECT) {
        return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, { status: 429 });
      }
    }

    // 3. Validate env
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    // 3. Parse file
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    if (!isPDF(file.type)) return NextResponse.json({ error: 'Type non supporté. PDF uniquement.' }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 50 Mo)' }, { status: 413 });

    // 4. Get page count
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const pageCount = await getPDFPageCount(pdfBuffer);

    if (pageCount > MAX_PAGES) return NextResponse.json({ error: `Trop de pages (${pageCount}). Max: ${MAX_PAGES}.` }, { status: 400 });

    if (pageCount === 1) {
      // Run structural analysis to extract vendor info even for single-page PDFs
      let vendor: string | null = null;
      let invoiceNumber: string | null = null;
      try {
        const structs = await structuralAnalysis(pdfBuffer);
        if (structs.length > 0) {
          // Extract vendor from top keywords
          const info = structs[0];
          if (info.hasInvoiceKeywords && info.topKeywords.length > 0) {
            vendor = info.topKeywords[0];
          }
        }
      } catch { /* non-critical */ }
      return NextResponse.json({
        totalPages: 1,
        segments: [{ startPage: 1, endPage: 1, vendor, invoiceNumber, date: null, confidence: 100 }],
        needsManualReview: false,
        analyses: [],
      });
    }

    // 5. Initialize OpenRouter
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // 6. Run structural analysis (fast, no AI)
    let structuralInfos: StructuralPageInfo[] = [];
    try {
      structuralInfos = await structuralAnalysis(pdfBuffer);
      console.log('[Detect Invoices] Structural analysis done:', structuralInfos.length, 'pages');
    } catch (e) {
      console.warn('[Detect Invoices] Structural analysis failed, continuing without:', e);
    }

    // 7. Analyze pages SEQUENTIALLY with cross-page context
    const analyses: PageAnalysis[] = [];

    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1;
      const previousAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;
      const structuralInfo = structuralInfos[i] || null;

      try {
        const pagePdfBuffer = await extractPageRange(pdfBuffer, pageNumber, pageNumber);
        const analysis = await analyzePageWithContext(
          pagePdfBuffer,
          pageNumber,
          pageCount,
          previousAnalysis,
          structuralInfo,
          openrouter
        );
        analyses.push(analysis);
      } catch (error) {
        console.error(`[Detect Invoices] Failed page ${pageNumber}:`, error);
        // Fallback using structural info
        analyses.push({
          pageNumber,
          isInvoiceStart: structuralInfo?.hasInvoiceKeywords || false,
          isInvoiceEnd: structuralInfo?.hasTotalKeywords || false,
          vendor: null,
          invoiceNumber: null,
          invoiceDate: null,
          totalAmount: null,
          hasPaymentInfo: structuralInfo?.hasPaymentInfo || false,
          pageType: 'mixed',
          confidence: 30,
        });
      }
    }

    // 8. Build segments
    const segments = buildSegments(analyses);
    const needsManualReview = segments.some(s => s.confidence < 70);

    // 9. Return result
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
      return NextResponse.json({ error: 'Clé API invalide' }, { status: 500 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (err.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Délai dépassé. Réessayez avec un fichier plus léger.' }, { status: 504 });
    }

    return NextResponse.json({ error: err.message || 'Erreur inattendue.' }, { status: 500 });
  }
}
