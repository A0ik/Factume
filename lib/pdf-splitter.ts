// ---------------------------------------------------------------------------
// PDF Splitter - Dext-style multi-invoice detection utilities
// Uses pdf-lib for PDF manipulation
// ---------------------------------------------------------------------------

import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageAnalysis {
  pageNumber: number;
  isInvoiceStart: boolean;
  isInvoiceEnd: boolean;
  vendor: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  hasPaymentInfo: boolean;
  pageType: 'header' | 'detail' | 'footer' | 'mixed';
  confidence: number;
}

export interface InvoiceSegment {
  startPage: number;
  endPage: number | null;
  vendor: string | null;
  invoiceNumber: string | null;
  date: string | null;
  confidence: number;
}

export interface DetectionResult {
  totalPages: number;
  segments: InvoiceSegment[];
  needsManualReview: boolean;
  analyses: PageAnalysis[];
  thumbnails?: string[];
}

export interface StructuralPageInfo {
  pageNumber: number;
  hasInvoiceKeywords: boolean;
  hasTotalKeywords: boolean;
  hasPaymentInfo: boolean;
  hasTableHeaders: boolean;
  textLength: number;
  topKeywords: string[];
  extractedText: string;
}

// ---------------------------------------------------------------------------
// PDF Splitting
// ---------------------------------------------------------------------------

/**
 * Split a PDF into segments based on detected invoice boundaries
 * Returns an array of PDF buffers, one per invoice
 */
export async function splitPdfBySegments(
  pdfBuffer: Buffer,
  segments: InvoiceSegment[]
): Promise<Buffer[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const result: Buffer[] = [];

  for (const segment of segments) {
    const newPdf = await PDFDocument.create();

    // Copy pages from original (0-indexed in pdf-lib)
    const pageIndices = [];
    const endPage = segment.endPage ?? segment.startPage; // Fallback si null
    for (let i = segment.startPage - 1; i < endPage; i++) {
      if (i >= 0 && i < pdfDoc.getPageCount()) {
        pageIndices.push(i);
      }
    }

    if (pageIndices.length > 0) {
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      result.push(Buffer.from(pdfBytes));
    }
  }

  return result;
}

/**
 * Extract a specific page range as a new PDF
 */
export async function extractPageRange(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const newPdf = await PDFDocument.create();

  const pageIndices = [];
  for (let i = startPage - 1; i < endPage; i++) {
    if (i >= 0 && i < pdfDoc.getPageCount()) {
      pageIndices.push(i);
    }
  }

  if (pageIndices.length > 0) {
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
  }

  const pdfBytes = await newPdf.save();
  return Buffer.from(pdfBytes);
}

/**
 * Get PDF page count (re-exported from pdf-to-image for better error handling)
 */
export { getPDFPageCount } from './pdf-to-image';

// ---------------------------------------------------------------------------
// Helper: Detect if file is a PDF
// ---------------------------------------------------------------------------

export function isPDF(mimeType: string): boolean {
  return mimeType.startsWith('application/pdf');
}

// ---------------------------------------------------------------------------
// Build segments from page analyses (extracted from detect-invoices endpoint)
// ---------------------------------------------------------------------------

export function buildSegments(analyses: PageAnalysis[]): InvoiceSegment[] {
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
    // CAS 2.5: Previous segment is closed, no explicit start — only create if confidence > 60
    else if (segments.length > 0 && segments[segments.length - 1].endPage !== null && (analysis.confidence || 50) > 60) {
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
// AI-based invoice segment detection (extracted from detect-invoices endpoint)
// Can be called directly without going through HTTP.
// ---------------------------------------------------------------------------

const DETECT_MODEL = 'google/gemini-2.5-flash';
const MAX_PAGES_DETECT = 50;

export async function detectInvoiceSegments(
  pdfBuffer: Buffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openrouterClient: any,
): Promise<DetectionResult> {
  const pageCount = await getPDFPageCount(pdfBuffer);

  if (pageCount > MAX_PAGES_DETECT) {
    throw new Error(`Too many pages (${pageCount}). Max: ${MAX_PAGES_DETECT}.`);
  }

  if (pageCount === 1) {
    // Run structural analysis to extract vendor info even for single-page PDFs
    let vendor: string | null = null;
    let invoiceNumber: string | null = null;
    try {
      const structs = await structuralAnalysis(pdfBuffer);
      if (structs.length > 0) {
        const info = structs[0];
        if (info.hasInvoiceKeywords && info.topKeywords.length > 0) {
          vendor = info.topKeywords[0];
        }
      }
    } catch { /* non-critical */ }
    return {
      totalPages: 1,
      segments: [{ startPage: 1, endPage: 1, vendor, invoiceNumber, date: null, confidence: 90 }],
      needsManualReview: false,
      analyses: [],
    };
  }

  // Run structural analysis (fast, no AI)
  let structuralInfos: StructuralPageInfo[] = [];
  try {
    structuralInfos = await structuralAnalysis(pdfBuffer);
    console.log('[Detect Invoices] Structural analysis done:', structuralInfos.length, 'pages');
  } catch (e) {
    console.warn('[Detect Invoices] Structural analysis failed, continuing without:', e);
  }

  // Single-pass detection: send full PDF to Gemini with structural context
  const analyses: PageAnalysis[] = [];

  // Build structural context summary
  let structuralSummary = '';
  for (const info of structuralInfos) {
    structuralSummary += `\nPage ${info.pageNumber}:`;
    structuralSummary += `\n  - Mots-clés facture: ${info.hasInvoiceKeywords ? 'OUI' : 'NON'}`;
    structuralSummary += `\n  - Mots-clés total: ${info.hasTotalKeywords ? 'OUI' : 'NON'}`;
    structuralSummary += `\n  - Infos paiement: ${info.hasPaymentInfo ? 'OUI' : 'NON'}`;
    structuralSummary += `\n  - En-têtes tableau: ${info.hasTableHeaders ? 'OUI' : 'NON'}`;
    if (info.topKeywords.length > 0) {
      structuralSummary += `\n  - Mots fréquents: ${info.topKeywords.join(', ')}`;
    }
    if (info.extractedText.length > 0) {
      structuralSummary += `\n  - Texte extrait: ${info.extractedText.substring(0, 300)}`;
    }
  }

  const singlePassPrompt = `Tu es un expert en analyse de documents comptables. Ta mission est d'identifier TOUTES les factures dans un PDF de ${pageCount} pages.

PRÉ-ANALYSE TEXTUELLE (extraction réelle du PDF):
${structuralSummary || '(aucune donnée textuelle extraite)'}

CONSIGNES :
1. Analyse le PDF complet page par page
2. Pour CHAQUE page, détermine si c'est le DÉBUT ou la FIN d'une facture
3. Identifie les changements de fournisseur ou de numéro de facture
4. Regroupe les pages contiguës appartenant à la même facture

MARQUEURS DE DÉBUT (is_invoice_start: true):
- En-tête avec logo/nom d'entreprise
- Nouveau fournisseur ou nouveau numéro de facture
- Mots-clés: "FACTURE", "INVOICE", "DEVIS"
- Tableau avec en-têtes de colonnes

MARQUEURS DE FIN (is_invoice_end: true):
- "Total TTC", "Net à payer", "Balance due"
- Détails TVA
- IBAN, SWIFT, infos bancaires
- Conditions de paiement

CAS SPÉCIAL: Page unique avec fournisseur ET total → start=true, end=true

Retourne UNIQUEMENT du JSON valide:
{
  "pages": [
    {
      "page_number": 1,
      "is_invoice_start": true/false,
      "is_invoice_end": true/false,
      "vendor": "nom ou null",
      "invoice_number": "numéro ou null",
      "invoice_date": "YYYY-MM-DD ou null",
      "total_amount": nombre ou null,
      "has_payment_info": true/false,
      "page_type": "header|detail|footer|mixed",
      "confidence": 0-100
    }
  ]
}`;

  try {
    const base64 = pdfBuffer.toString('base64');
    const completion = await openrouterClient.chat.completions.create({
      model: DETECT_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: singlePassPrompt },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed.pages)) {
        for (const p of parsed.pages) {
          analyses.push({
            pageNumber: p.page_number || analyses.length + 1,
            isInvoiceStart: Boolean(p.is_invoice_start),
            isInvoiceEnd: Boolean(p.is_invoice_end),
            vendor: p.vendor || null,
            invoiceNumber: p.invoice_number || null,
            invoiceDate: p.invoice_date || null,
            totalAmount: typeof p.total_amount === 'number' ? p.total_amount : null,
            hasPaymentInfo: Boolean(p.has_payment_info),
            pageType: ['header', 'detail', 'footer', 'mixed'].includes(p.page_type) ? p.page_type : 'mixed',
            confidence: typeof p.confidence === 'number' ? p.confidence : 50,
          });
        }
      }
    }
  } catch (error) {
    console.error('[Detect Invoices] Single-pass detection failed:', error);
    // Fallback: use structural analysis only
    for (const info of structuralInfos) {
      analyses.push({
        pageNumber: info.pageNumber,
        isInvoiceStart: info.hasInvoiceKeywords,
        isInvoiceEnd: info.hasTotalKeywords || info.hasPaymentInfo,
        vendor: null,
        invoiceNumber: null,
        invoiceDate: null,
        totalAmount: null,
        hasPaymentInfo: info.hasPaymentInfo,
        pageType: info.hasInvoiceKeywords ? 'header' : info.hasTotalKeywords ? 'footer' : 'mixed',
        confidence: 40,
      });
    }
  }

  // Build segments
  const segments = buildSegments(analyses);
  const needsManualReview = segments.some(s => s.confidence < 70);

  return {
    totalPages: pageCount,
    segments,
    needsManualReview,
    analyses,
  };
}

// ---------------------------------------------------------------------------
// Structural Analysis — text-based pre-classification without AI
// ---------------------------------------------------------------------------

const INVOICE_START_KEYWORDS = [
  'facture', 'invoice', 'devis', 'bon de commande', 'avoir', 'note de credit',
  'commande', 'quotation', 'purchase order', 'credit note',
];

const TOTAL_KEYWORDS = [
  'total ttc', 'net a payer', 'montant a payer', 'a payer', 'balance due',
  'total ht', 'total general', 'grand total', 'total tva', 'montant total',
  'total facture', 'total a regler', 'solde a payer', 'montant du',
];

const PAYMENT_KEYWORDS = [
  'iban', 'swift', 'bic', 'rib', 'virement', 'bancaire', 'rip',
  'releve d\'identite', 'bank account', 'wire transfer',
];

const TABLE_HEADER_KEYWORDS = [
  'designation', 'description', 'quantite', 'qte', 'prix unitaire', 'montant',
  'total', 'tva', 'ht', 'ttc', 'ref', 'reference', 'article', 'produit',
  'unit price', 'amount', 'quantity', 'subtotal',
];

export async function structuralAnalysis(pdfBuffer: Buffer): Promise<StructuralPageInfo[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  const results: StructuralPageInfo[] = [];

  // Parse the full PDF once with pdf-parse, then split by form-feed character
  let fullTextByPage: string[] = [];
  try {
    const pdfData = await pdf(pdfBuffer);
    // pdf-parse separates pages with '\f' (form feed)
    fullTextByPage = pdfData.text.split('\f').map(t => t.toLowerCase());
    // Pad or trim to match actual page count from pdf-lib
    while (fullTextByPage.length < pageCount) fullTextByPage.push('');
    if (fullTextByPage.length > pageCount) fullTextByPage = fullTextByPage.slice(0, pageCount);
  } catch {
    // Fallback: empty text for all pages
    fullTextByPage = Array(pageCount).fill('');
  }

  for (let i = 0; i < pageCount; i++) {
    const extractedText = fullTextByPage[i] || '';
    const textLen = extractedText.length;

    const hasInvoiceStart = INVOICE_START_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasTotal = TOTAL_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasPayment = PAYMENT_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasTableHeaders = TABLE_HEADER_KEYWORDS.filter(kw => extractedText.includes(kw)).length >= 2;

    const words = extractedText
      .split(/[\s,;.:\-!/()]+/)
      .filter(w => w.length > 3)
      .filter(w => !['facture', 'invoice', 'total', 'montant', 'page'].includes(w));
    const freq: Record<string, number> = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);

    results.push({
      pageNumber: i + 1,
      hasInvoiceKeywords: hasInvoiceStart,
      hasTotalKeywords: hasTotal,
      hasPaymentInfo: hasPayment,
      hasTableHeaders,
      textLength: textLen,
      topKeywords,
      extractedText: extractedText.substring(0, 2000),
    });
  }

  return results;
}
