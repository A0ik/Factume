// ---------------------------------------------------------------------------
// PDF Splitter - Dext-style multi-invoice detection utilities
// Uses pdf-lib for PDF manipulation
// ---------------------------------------------------------------------------

import { PDFDocument } from 'pdf-lib';

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
 * Get PDF page count
 */
export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
}

// ---------------------------------------------------------------------------
// Helper: Detect if file is a PDF
// ---------------------------------------------------------------------------

export function isPDF(mimeType: string): boolean {
  return mimeType.startsWith('application/pdf');
}

export function isPDFBuffer(buffer: Buffer): boolean {
  return buffer.toString('ascii', 0, 4) === '%PDF';
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

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);

    // Extract raw text from page content stream
    let extractedText = '';
    try {
      const contents = page.node.Contents();
      if (contents) {
        // Get raw bytes from content stream (pdf-lib internal API)
        let rawContent = '';
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contextAny = pdfDoc.context as any;
          const ref = typeof contents === 'object' && 'ref' in contents ? (contents as any).ref : contents;
          const bytes = contextAny.lookup(ref);
          if (bytes) {
            rawContent = new TextDecoder('latin1').decode(bytes as unknown as Uint8Array);
          }
        } catch {
          rawContent = '';
        }

        // Extract text between parentheses in Tj and TJ operators
        const textMatches: string[] = [];

        // Match Tj operator: (text) Tj
        const tjRegex = /\(([^)]*)\)\s*Tj/gi;
        let match;
        while ((match = tjRegex.exec(rawContent)) !== null) {
          textMatches.push(match[1]);
        }

        // Match TJ array: [(text1) num (text2)] TJ
        const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gi;
        while ((match = tjArrayRegex.exec(rawContent)) !== null) {
          const arrayContent = match[1];
          const textParts = arrayContent.match(/\(([^)]*)\)/g) || [];
          textParts.forEach((part) => {
            const cleaned = part.replace(/^\(|\)$/g, '');
            textMatches.push(cleaned);
          });
        }

        extractedText = textMatches.join(' ').toLowerCase();
      }
    } catch {
      extractedText = '';
    }

    const textLen = extractedText.length;

    const hasInvoiceStart = INVOICE_START_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasTotal = TOTAL_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasPayment = PAYMENT_KEYWORDS.some(kw => extractedText.includes(kw));
    const hasTableHeaders = TABLE_HEADER_KEYWORDS.filter(kw => extractedText.includes(kw)).length >= 2;

    // Extract top keywords (most frequent significant words)
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
