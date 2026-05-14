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
  return mimeType === 'application/pdf';
}

export function isPDFBuffer(buffer: Buffer): boolean {
  return buffer.toString('ascii', 0, 4) === '%PDF';
}
