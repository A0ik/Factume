// ---------------------------------------------------------------------------
// PDF to Image Converter
// Converts PDF pages to images for Tesseract OCR processing
// Supports multipage PDFs with multiple invoices
// ---------------------------------------------------------------------------

import { PDFDocument } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFPageResult {
  pageNumber: number;
  imageBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

export interface PDFConversionResult {
  totalPages: number;
  pages: PDFPageResult[];
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_PAGES = 50; // Limite de pages pour éviter les abus
const IMAGE_FORMAT = 'png' as const; // PNG pour meilleure qualité OCR

// ---------------------------------------------------------------------------
// Helper: Convert data URL to Buffer
// ---------------------------------------------------------------------------

function dataUrlToBuffer(dataUrl: string): Buffer {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(matches[2], 'base64');
}

// ---------------------------------------------------------------------------
// Helper: Check if buffer is a PDF
// ---------------------------------------------------------------------------

export function isPDFBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  const header = buffer.toString('ascii', 0, 4);
  return header === '%PDF';
}

// ---------------------------------------------------------------------------
// Helper: Get PDF page count
// ---------------------------------------------------------------------------

export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main: Convert PDF to images using pdftoimg-js
// ---------------------------------------------------------------------------

export async function convertPdfToImages(
  pdfBuffer: Buffer,
  options: {
    dpi?: number;
    maxPages?: number;
    format?: 'png' | 'jpeg';
  } = {}
): Promise<PDFConversionResult> {
  const startTime = Date.now();
  const { maxPages = MAX_PAGES, format = IMAGE_FORMAT } = options;

  try {
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        totalPages: 0,
        pages: [],
        success: false,
        error: 'Buffer PDF vide ou invalide',
      };
    }

    // Check if it's actually a PDF
    if (!isPDFBuffer(pdfBuffer)) {
      return {
        totalPages: 0,
        pages: [],
        success: false,
        error: 'Le fichier n\'est pas un PDF valide',
      };
    }

    // Get page count first
    const totalPages = await getPDFPageCount(pdfBuffer);

    if (totalPages === 0) {
      return {
        totalPages: 0,
        pages: [],
        success: false,
        error: 'Impossible de lire le nombre de pages du PDF',
      };
    }

    if (totalPages > maxPages) {
      return {
        totalPages,
        pages: [],
        success: false,
        error: `PDF trop volumineux (${totalPages} pages, max: ${maxPages})`,
      };
    }

    console.log(`[PDF to Image] Converting PDF with ${totalPages} pages to ${format} images...`);

    // Use pdftoimg-js for conversion
    let pdftoimg: any;
    try {
      pdftoimg = await import('pdftoimg-js');
    } catch (importError) {
      return {
        totalPages,
        pages: [],
        success: false,
        error: 'pdftoimg-js n\'est pas installé',
      };
    }

    // Convert each page individually
    const pages: PDFPageResult[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        // Use singlePdfToImg for individual pages
        const result = await pdftoimg.singlePdfToImg(pdfBuffer, {
          imgType: format === 'jpeg' ? 'jpg' : 'png',
          pages: pageNum,
          scale: 2, // Higher scale for better OCR quality
        });

        // Result can be a string (data URL) or Buffer
        let imageBuffer: Buffer;
        if (typeof result === 'string') {
          imageBuffer = dataUrlToBuffer(result);
        } else if (Array.isArray(result)) {
          // Handle array case (shouldn't happen with single page)
          const first = result[0];
          imageBuffer = typeof first === 'string' ? dataUrlToBuffer(first) : first;
        } else {
          imageBuffer = result;
        }

        pages.push({
          pageNumber: pageNum,
          imageBuffer,
          mimeType: `image/${format}`,
          width: 0,
          height: 0,
        });

        console.log(`[PDF to Image] Page ${pageNum}/${totalPages} converted to ${format}`);
      } catch (pageError) {
        console.error(`[PDF to Image] Failed to convert page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }

    const processingTimeMs = Date.now() - startTime;
    console.log(`[PDF to Image] Converted ${pages.length}/${totalPages} pages in ${processingTimeMs}ms`);

    return {
      totalPages,
      pages,
      success: pages.length > 0,
      error: pages.length === 0 ? 'Aucune page n\'a pu être convertie' : undefined,
    };

  } catch (error) {
    console.error('[PDF to Image] Conversion failed:', error);
    return {
      totalPages: 0,
      pages: [],
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la conversion PDF',
    };
  }
}
