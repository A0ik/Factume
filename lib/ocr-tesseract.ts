// ---------------------------------------------------------------------------
// Tesseract OCR Engine - Free OCR for receipts and invoices
// Used as first-pass OCR before falling back to paid OpenRouter API
// ---------------------------------------------------------------------------

import Tesseract from 'tesseract.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TesseractResult {
  text: string;
  confidence: number;
  basicData: {
    vendor?: string;
    amount?: number;
    date?: string;
    vatAmount?: number;
    invoiceNumber?: string;
  };
  metadata: {
    engine: 'tesseract';
    language: string;
    processingTimeMs: number;
  };
}

export interface TesseractOptions {
  language?: string;
  imageType?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TESSERACT_CONFIDENCE_THRESHOLD = 0.8; // 80% confidence needed to skip OpenRouter

// ---------------------------------------------------------------------------
// Helper: Extract basic data from OCR text using regex patterns
// ---------------------------------------------------------------------------

function extractBasicData(text: string): TesseractResult['basicData'] {
  const basicData: TesseractResult['basicData'] = {};

  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // 1. Extract amount (multiple patterns)
  const amountPatterns = [
    /(?:total|montant|ttc|t\.t\.c\.|à payer|amount|total\s*€)\s*[:=]?\s*[\d\s]+[.,]\d{2}\s*€/i,
    /[\d\s]+[.,]\d{2}\s*€\s*(?:ttc|total)?/i,
    /\b\d{1,5}[.,]\d{2}\s*€\b/,
  ];

  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const amountStr = match[0]
        .replace(/[^\d.,]/g, '')
        .replace(',', '.');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0 && amount < 100000) {
        basicData.amount = amount;
        break;
      }
    }
  }

  // 2. Extract date (multiple formats)
  const datePatterns = [
    /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/, // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/, // YYYY/MM/DD or YYYY-MM-DD
    /\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      let day: string, month: string, year: string;

      if (pattern.toString().includes('janvier') || pattern.toString().includes('février')) {
        // French month format
        const months: Record<string, string> = {
          janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
          juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12'
        };
        day = match[1].padStart(2, '0');
        month = months[match[2].toLowerCase()];
        year = match[3];
      } else {
        // Numeric format
        const parts = match.slice(1);
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          [year, month, day] = parts;
        } else {
          // DD-MM-YYYY
          [day, month, year] = parts;
        }
      }

      const dateStr = `${year}-${month}-${day}`;
      // Validate date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= new Date().getFullYear() + 1) {
        basicData.date = dateStr;
        break;
      }
    }
  }

  // 3. Extract invoice number
  const invoicePatterns = [
    /(?:facture|invoice|n°|no|numéro)\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
    /(?:réf|réference|ref)\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
  ];

  for (const pattern of invoicePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      basicData.invoiceNumber = match[1].toUpperCase();
      break;
    }
  }

  // 4. Extract vendor (first line with capital letters or after "from")
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    const cleanLine = line.trim();
    // Skip if it's a date or amount
    if (basicData.date && cleanLine.includes(basicData.date)) continue;
    if (basicData.amount && cleanLine.includes(basicData.amount.toString())) continue;

    // Look for company name patterns
    if (
      (/^[A-Za-z][A-Za-z0-9\s&\-\.]{2,30}$/.test(cleanLine)) ||
      (/^(SAS|SARL|EURL|SA|GmbH|Ltd|LLC|INC)/i.test(cleanLine)) ||
      cleanLine.includes('Société') ||
      cleanLine.includes('Company')
    ) {
      basicData.vendor = cleanLine.substring(0, 50); // Limit length
      break;
    }
  }

  // 5. Extract VAT amount if different from total
  const vatPatterns = [
    /(?:tva|vat|t\.v\.a\.|taxe)\s*[:=]?\s*[\d\s]+[.,]\d{2}\s*€/i,
  ];

  for (const pattern of vatPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const vatStr = match[0]
        .replace(/[^\d.,]/g, '')
        .replace(',', '.');
      const vat = parseFloat(vatStr);
      if (!isNaN(vat) && vat > 0 && vat < 10000) {
        basicData.vatAmount = vat;
        break;
      }
    }
  }

  return basicData;
}

// ---------------------------------------------------------------------------
// Main Tesseract OCR function
// ---------------------------------------------------------------------------

export async function extractWithTesseract(
  imageBuffer: Buffer,
  mimeType: string,
  options: TesseractOptions = {}
): Promise<TesseractResult> {
  const startTime = Date.now();
  const language = options.language || 'fra'; // French by default

  try {
    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer: empty or null');
    }

    // Validate MIME type
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
    const normalizedMimeType = mimeType?.toLowerCase() || '';
    if (!supportedTypes.includes(normalizedMimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}. Tesseract requires images.`);
    }

    console.log(`[Tesseract] Starting OCR with language: ${language}`);

    // Perform OCR
    const { data } = await Tesseract.recognize(
      imageBuffer,
      language,
      {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text') {
            // Optional: log progress
            // console.log(`[Tesseract] Progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      }
    );

    const processingTimeMs = Date.now() - startTime;
    const confidence = (data.confidence || 0) / 100; // Tesseract returns 0-100

    console.log(`[Tesseract] OCR completed in ${processingTimeMs}ms with confidence: ${confidence}`);

    // Extract basic data from recognized text
    const basicData = extractBasicData(data.text);

    // Determine if extraction is reliable enough
    const isReliable = confidence >= TESSERACT_CONFIDENCE_THRESHOLD &&
                      !!basicData.amount &&
                      !!basicData.date &&
                      !!basicData.vendor;

    return {
      text: data.text,
      confidence,
      basicData,
      metadata: {
        engine: 'tesseract',
        language,
        processingTimeMs,
      },
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error('[Tesseract] OCR failed:', error);

    // Return a low-confidence result instead of throwing
    return {
      text: '',
      confidence: 0,
      basicData: {},
      metadata: {
        engine: 'tesseract',
        language,
        processingTimeMs,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: Check if Tesseract result is reliable enough
// ---------------------------------------------------------------------------

export function isTesseractResultReliable(
  result: TesseractResult,
  confidenceThreshold: number = TESSERACT_CONFIDENCE_THRESHOLD
): boolean {
  return (
    result.confidence >= confidenceThreshold &&
    !!result.basicData.amount &&
    !!result.basicData.date &&
    !!result.basicData.vendor
  );
}

// ---------------------------------------------------------------------------
// Helper: Convert Tesseract result to expense format
// ---------------------------------------------------------------------------

export function tesseractResultToExpense(
  result: TesseractResult,
  additionalData: {
    userId: string;
    receiptUrl: string;
    storagePath: string;
    category?: string;
  }
): Record<string, unknown> {
  return {
    user_id: additionalData.userId,
    vendor: result.basicData.vendor || null,
    amount: result.basicData.amount || null,
    vat_amount: result.basicData.vatAmount || null,
    date: result.basicData.date || null,
    invoice_number: result.basicData.invoiceNumber || null,
    description: result.text.substring(0, 500) || null, // First 500 chars of OCR text
    receipt_url: additionalData.receiptUrl,
    receipt_storage_path: additionalData.storagePath,
    category: additionalData.category || 'other',
    payment_method: null,
    status: 'pending',
    ocr_raw_response: {
      text: result.text,
      confidence: result.confidence,
      metadata: result.metadata,
    },
    ocr_confidence: result.confidence,
    ocr_method: 'tesseract',
    ocr_line_items: [], // Tesseract doesn't extract line items
  };
}

// ---------------------------------------------------------------------------
// Batch processing helper
// ---------------------------------------------------------------------------

export async function batchExtractWithTesseract(
  items: Array<{ buffer: Buffer; mimeType: string }>,
  onProgress?: (current: number, total: number) => void,
  concurrency: number = 3,
): Promise<TesseractResult[]> {
  const results = new Array<TesseractResult>(items.length);
  let completed = 0;
  const queue = items.map((item, idx) => ({ idx, item }));

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      const { idx, item } = entry;

      results[idx] = await extractWithTesseract(item.buffer, item.mimeType);
      completed++;

      if (onProgress) {
        onProgress(completed, items.length);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}
