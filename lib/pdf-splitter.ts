// ---------------------------------------------------------------------------
// PDF Splitter - Dext-style multi-invoice detection utilities
// Uses pdf-lib for PDF manipulation and pdfjs for rendering
// ---------------------------------------------------------------------------

import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import sharp from 'sharp';

// Import polyfill for Node.js environment
import './pdfjs-polyfill';

// Set worker for pdfjs
if (typeof window === 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

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
  endPage: number | null; // null si la facture continue sur les pages suivantes
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
// PDF Page Extraction & Conversion
// ---------------------------------------------------------------------------

/**
 * Extract a single page from a PDF and convert to image buffer
 */
export async function extractPageAsImage(
  pdfBuffer: Buffer,
  pageNumber: number,
  scale = 2.0
): Promise<Buffer> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const canvasFactory = new NodeCanvasFactory();

  const context = canvasFactory.create(viewport.width, viewport.height);
  const renderContext = {
    canvasContext: context.context as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: context.canvas as unknown as HTMLCanvasElement,
  };

  await page.render(renderContext).promise;

  // Convert canvas to PNG buffer
  const imageBuffer = context.canvas.toBuffer('image/png');
  return imageBuffer;
}

// Safety caps to prevent OOM on pathological PDFs
const MAX_MERGED_WIDTH = 4096;
const MAX_MERGED_HEIGHT = 32_768; // ~10 pages at typical A4 resolution

/**
 * Convert PDF page range to a single merged image
 * Useful for multi-page invoices
 */
export async function mergePagesToImage(
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const images: Buffer[] = [];

  for (let page = startPage; page <= endPage; page++) {
    const image = await extractPageAsImage(pdfBuffer, page);
    images.push(image);
  }

  if (images.length === 1) {
    return images[0];
  }

  // Stack images vertically with padding
  const metadataList = await Promise.all(images.map((img) => sharp(img).metadata()));
  const rawWidth = Math.max(...metadataList.map((m) => m.width ?? 0));
  const rawHeight = metadataList.reduce((sum, m) => sum + (m.height ?? 0), 0) + (images.length - 1) * 20;

  // Reject oversized compositions before allocating memory
  if (rawWidth > MAX_MERGED_WIDTH || rawHeight > MAX_MERGED_HEIGHT) {
    throw new Error(
      `Image résultante trop grande (${rawWidth}×${rawHeight}px). Réduisez le nombre de pages par segment.`,
    );
  }

  const maxWidth = rawWidth;
  const totalHeight = rawHeight;

  const sharpInstances = images.map((img) => sharp(img));
  const metadatas = await Promise.all(sharpInstances.map((s) => s.metadata()));

  const composites = await Promise.all(
    sharpInstances.map(async (s, i) => ({
      input: await s.png().toBuffer(),
      top: i === 0 ? 0 : metadatas.slice(0, i).reduce((sum, m) => sum + (m.height ?? 0) + 20, 0),
      left: 0,
    })),
  );

  return sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
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
// Canvas Factory for Node.js (pdfjs rendering)
// ---------------------------------------------------------------------------

class NodeCanvasFactory {
  create(width: number, height: number) {
    // Clamp dimensions to prevent OOM on malformed PDFs
    const safeWidth = Math.min(Math.max(width, 1), MAX_MERGED_WIDTH);
    const safeHeight = Math.min(Math.max(height, 1), MAX_MERGED_HEIGHT);

    let canvasModule: { createCanvas: (w: number, h: number) => unknown };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      canvasModule = require('canvas') as { createCanvas: (w: number, h: number) => unknown };
    } catch {
      throw new Error(
        'Le module "canvas" est requis pour le rendu PDF. Installez-le avec : npm install canvas',
      );
    }

    const canvasEl = canvasModule.createCanvas(safeWidth, safeHeight) as {
      getContext: (type: string) => unknown;
      toBuffer: (type: string) => Buffer;
    };

    return {
      width: safeWidth,
      height: safeHeight,
      canvas: canvasEl,
      context: canvasEl.getContext('2d'),
    };
  }

  destroy(canvasAndContext: { canvas: unknown; context: unknown }) {
    // Allow GC to collect the canvas
    (canvasAndContext as Record<string, unknown>).canvas = null;
    (canvasAndContext as Record<string, unknown>).context = null;
  }
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
