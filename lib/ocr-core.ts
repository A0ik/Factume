// ---------------------------------------------------------------------------
// OCR Core — shared expense processing logic
// Single source of truth for: sanitize → vendor lookup → journal entry → DB save
// Used by: ocr-receipt, ocr-multi-page, ocr-bulk, ocr-hybrid, ocr-queue
// ---------------------------------------------------------------------------

import {
  sanitizeCategory,
  sanitizeString,
  sanitizeNumeric,
  sanitizeDate,
  sanitizePaymentMethod,
  sanitizeLineItems,
  sanitizeVatDetails,
  normalizeConfidence,
  validatePCGCode,
  generateStoragePath,
  buildOcrPrompt,
  validateOcrExtraction,
  type ValidationResult,
} from '@/lib/ocr-helpers';
import { getAccountCode, generateJournalEntry } from '@/lib/plan-comptable';
import { extractPageRange, type InvoiceSegment } from '@/lib/pdf-splitter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileMeta {
  receiptUrl: string;
  storagePath: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isPdf?: boolean;
}

export interface ProcessedExpense {
  extracted: Record<string, unknown>;
  accounting: {
    account_code: string;
    account_label: string;
    journal_type: string;
    journal_entry: {
      debit: { account: string; label: string; amount: number };
      credit: { account: string; label: string; amount: number };
      vat: { account: string; amount: number } | null;
    };
    vat_deductible: boolean;
    default_vat_rate: number | null;
  };
  savedExpense: Record<string, unknown> | null;
  dbError: string | null;
  validation: ValidationResult;
}

// ---------------------------------------------------------------------------
// Sanitize raw AI response into structured extracted data
// ---------------------------------------------------------------------------

export function sanitizeOcrResponse(raw: Record<string, unknown>) {
  const category = sanitizeCategory(raw.category);
  const supplierCategory = sanitizeString(raw.supplier_category);
  const extractedAccountCode = sanitizeString(raw.account_code);
  const extractedAccountLabel = sanitizeString(raw.account_label);

  const extracted = {
    vendor: sanitizeString(raw.vendor),
    vendor_address: sanitizeString(raw.vendor_address),
    vendor_siret: sanitizeString(raw.vendor_siret),
    vendor_vat_number: sanitizeString(raw.vendor_vat_number),
    amount: sanitizeNumeric(raw.amount),
    ht_amount: sanitizeNumeric(raw.ht_amount),
    vat_amount: sanitizeNumeric(raw.vat_amount),
    vat_rate: sanitizeNumeric(raw.vat_rate),
    vat_details: sanitizeVatDetails(raw.vat_details),
    date: sanitizeDate(raw.date),
    due_date: sanitizeDate(raw.due_date),
    invoice_number: sanitizeString(raw.invoice_number),
    description: sanitizeString(raw.description),
    category,
    currency: sanitizeString(raw.currency) ?? 'EUR',
    line_items: sanitizeLineItems(raw.line_items),
    confidence: normalizeConfidence(raw.confidence),
    payment_method: sanitizePaymentMethod(raw.payment_method),
    is_duplicate: typeof raw.is_duplicate === 'boolean' ? raw.is_duplicate : false,
    supplier_category: supplierCategory,
    account_code: extractedAccountCode,
    account_label: extractedAccountLabel,
    document_type: sanitizeString(raw.document_type),
    is_professional_expense: typeof raw.is_professional_expense === 'boolean' ? raw.is_professional_expense : true,
    cost_center: sanitizeString(raw.cost_center),
  };

  return { extracted, category, supplierCategory, extractedAccountCode, extractedAccountLabel };
}

// ---------------------------------------------------------------------------
// Resolve account code: vendor_mappings > AI > plan-comptable fallback
// ---------------------------------------------------------------------------

export async function resolveAccountCode(
  category: string,
  supplierCategory: string | null,
  extractedAccountCode: string | null,
  extractedAccountLabel: string | null,
  vendor: string | null,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{ code: string; label: string }> {
  const accountMapping = getAccountCode(category, supplierCategory);
  let code = (validatePCGCode(extractedAccountCode) ? extractedAccountCode : null) ?? accountMapping.code;
  let label = extractedAccountLabel ?? accountMapping.label;

  if (vendor) {
    const normalized = vendor.toLowerCase().trim();
    const { data: mapping } = await supabase
      .from('vendor_mappings')
      .select('account_code, account_name')
      .eq('user_id', userId)
      .ilike('vendor_name_pattern', normalized)
      .maybeSingle();
    if (mapping?.account_code) {
      code = mapping.account_code;
      label = mapping.account_name || label;
    }
  }

  return { code, label };
}

// ---------------------------------------------------------------------------
// Build journal entry JSON
// ---------------------------------------------------------------------------

export function buildJournalEntryJson(
  category: string,
  supplierCategory: string | null,
  amountTtc: number,
  amountHt: number | null,
  vatAmount: number | null,
  vatRate: number | null,
  paymentMethod: string | null,
) {
  const journalEntry = generateJournalEntry({
    category,
    supplierCategory,
    amountTtc,
    amountHt,
    vatAmount,
    vatRate,
    paymentMethod,
  });

  return {
    debit: { account: journalEntry.debitAccount, label: journalEntry.debitLabel, amount: journalEntry.amount },
    credit: { account: journalEntry.creditAccount, label: journalEntry.creditLabel, amount: journalEntry.amount + journalEntry.vatAmount },
    vat: journalEntry.vatAccount ? { account: journalEntry.vatAccount, amount: journalEntry.vatAmount } : null,
    journalType: journalEntry.journalType,
    vatAccount: journalEntry.vatAccount || null,
  };
}

// ---------------------------------------------------------------------------
// Full pipeline: sanitize + resolve accounts + journal entry + DB save
// ---------------------------------------------------------------------------

export async function processAndSaveExpense(
  rawAiResponse: Record<string, unknown>,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fileMeta: FileMeta,
): Promise<ProcessedExpense> {
  // 1. Sanitize
  const { extracted, category, supplierCategory } = sanitizeOcrResponse(rawAiResponse);

  // 1b. Validate extraction (catch AI hallucinations)
  const validation = validateOcrExtraction(extracted);

  // 2. Resolve account code
  const { code: finalAccountCode, label: finalAccountLabel } = await resolveAccountCode(
    category, supplierCategory,
    extracted.account_code as string | null, extracted.account_label as string | null,
    extracted.vendor as string | null,
    userId, supabase,
  );

  // 3. Build journal entry
  const je = buildJournalEntryJson(
    category, supplierCategory,
    (extracted.amount as number) ?? 0,
    extracted.ht_amount as number | null,
    extracted.vat_amount as number | null,
    extracted.vat_rate as number | null,
    extracted.payment_method as string | null,
  );

  const accountMapping = getAccountCode(category, supplierCategory);

  // 4. Build expense record
  const expenseRecord: Record<string, unknown> = {
    user_id: userId,
    vendor: extracted.vendor,
    amount: extracted.amount,
    vat_amount: extracted.vat_amount,
    category: extracted.category,
    date: extracted.date,
    description: extracted.description,
    receipt_url: fileMeta.receiptUrl,
    receipt_storage_path: fileMeta.storagePath,
    payment_method: extracted.payment_method,
    // TITAN — 'needs_review' est refusé par la contrainte expenses_status_check
    // (CHECK limité à pending/reviewed/ready/validated/rejected/exported). Le signal
    // « à vérifier » est porté par ocr_validation_warnings + la confiance ; le statut
    // reste 'pending' jusqu'à vérification utilisateur (→ 'reviewed').
    status: 'pending',
    ocr_raw_response: rawAiResponse,
    ocr_confidence: extracted.confidence,
    ocr_line_items: extracted.line_items,
    ocr_supplier_siret: extracted.vendor_siret,
    ocr_invoice_number: extracted.invoice_number,
    ocr_currency: extracted.currency,
    ocr_payment_due_date: extracted.due_date,
    account_code: finalAccountCode,
    account_label: finalAccountLabel,
    journal_type: je.journalType,
    journal_entry: { debit: je.debit, credit: je.credit, vat: je.vat },
    vat_account: je.vatAccount,
    document_type: extracted.document_type,
    is_professional_expense: extracted.is_professional_expense,
    supplier_category: extracted.supplier_category,
  };

  // Store validation warnings if any
  if (validation.warnings.length > 0) {
    expenseRecord.ocr_validation_warnings = validation.warnings;
  }

  // Remove null keys
  for (const key of Object.keys(expenseRecord)) {
    if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
      delete expenseRecord[key];
    }
  }

  // 5. Save to DB
  const { data: savedExpense, error: dbError } = await supabase
    .from('expenses')
    .insert(expenseRecord)
    .select()
    .single();

  if (dbError) {
    console.error('[OCR Core] DB insert error:', dbError);
  }

  return {
    extracted,
    accounting: {
      account_code: finalAccountCode,
      account_label: finalAccountLabel,
      journal_type: je.journalType,
      journal_entry: { debit: je.debit, credit: je.credit, vat: je.vat },
      vat_deductible: accountMapping.vatDeductible,
      default_vat_rate: accountMapping.defaultVatRate,
    },
    savedExpense: dbError ? null : savedExpense,
    dbError: dbError?.message || null,
    validation,
  };
}

// ---------------------------------------------------------------------------
// Auto-learn vendor rule from OCR corrections
// When the same vendor is corrected to the same category 3+ times,
// automatically create/update a vendor_mappings entry so future OCR results
// for that vendor use the corrected category by default.
// ---------------------------------------------------------------------------

export interface AutoLearnResult {
  ruleCreated: boolean;
  correctionCount: number;
}

export async function autoLearnVendorRule(
  userId: string,
  vendor: string,
  correctedCategory: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<AutoLearnResult> {
  const normalized = vendor.toLowerCase().trim().replace(/\s+/g, ' ');

  // Fetch recent corrections for this vendor
  const { data: corrections, error } = await supabase
    .from('expenses')
    .select('ocr_corrections')
    .eq('user_id', userId)
    .ilike('vendor', normalized)
    .not('ocr_corrections', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !corrections) {
    console.error('[AutoLearn] Error fetching corrections:', error);
    return { ruleCreated: false, correctionCount: 0 };
  }

  // Count how many recent corrections targeted the same category
  let matchCount = 0;
  for (const row of corrections) {
    const corr = row.ocr_corrections as Record<string, unknown> | null;
    if (!corr) continue;
    const correctedValues = corr.corrected_values as Record<string, unknown> | undefined;
    if (correctedValues?.category === correctedCategory) {
      matchCount++;
    }
  }

  if (matchCount < 3) {
    return { ruleCreated: false, correctionCount: matchCount };
  }

  // Threshold reached — upsert vendor_mapping
  const accountMapping = getAccountCode(correctedCategory, null);

  const upsertData = {
    user_id: userId,
    raw_vendor: normalized,
    vendor_name_pattern: normalized,
    corrected_vendor: vendor,
    corrected_category: correctedCategory,
    account_code: accountMapping.code,
    account_name: accountMapping.label,
    usage_count: matchCount,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('vendor_mappings')
    .upsert(upsertData, { onConflict: 'user_id,vendor_name_pattern' });

  if (upsertError) {
    console.error('[AutoLearn] Upsert error:', upsertError);
    return { ruleCreated: false, correctionCount: matchCount };
  }

  return { ruleCreated: true, correctionCount: matchCount };
}

// ---------------------------------------------------------------------------
// Multi-page invoice extraction (extracted from ocr-multi-page endpoint)
// Can be called directly without going through HTTP.
// ---------------------------------------------------------------------------

const OCR_MODEL = 'google/gemini-2.5-flash';

export interface MultiPageOCRResult {
  success: boolean;
  segment?: InvoiceSegment;
  expense?: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  receipt_url?: string;
  receipt_storage_path?: string;
  error?: string;
}

export async function extractInvoiceFromPDF(
  pdfBuffer: Buffer,
  segment: InvoiceSegment,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openrouter: any,
): Promise<MultiPageOCRResult> {
  const endPage = segment.endPage ?? segment.startPage;

  try {
    // Extract the segment PDF pages
    const segmentPdfBuffer = await extractPageRange(pdfBuffer, segment.startPage, endPage);

    // Upload to storage
    const storagePath = generateStoragePath(userId, `segment_${segment.startPage}-${endPage}.pdf`);
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, segmentPdfBuffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      console.error('[OCR Multi-Page] Storage upload error:', uploadError);
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const receiptPublicUrl = urlData.publicUrl;

    // Call Gemini directly (no HTTP hop)
    const base64 = segmentPdfBuffer.toString('base64');
    const completion = await openrouter.chat.completions.create({
      model: OCR_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error('Empty AI response');

    const parsed = JSON.parse(rawContent);

    // Sanitize, resolve accounts, generate journal entry, save to DB — all via ocr-core
    const result = await processAndSaveExpense(parsed, userId, supabase, {
      receiptUrl: receiptPublicUrl,
      storagePath,
      isPdf: true,
    });

    if (result.dbError) {
      return { success: false, segment, error: 'Erreur sauvegarde: ' + result.dbError };
    }

    return {
      success: true,
      segment,
      expense: result.savedExpense ?? undefined,
      extracted: result.extracted,
      receipt_url: receiptPublicUrl,
      receipt_storage_path: storagePath,
    };
  } catch (error) {
    console.error(`[OCR Multi-Page] Exception segment ${segment.startPage}-${segment.endPage}:`, error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, segment, error: message };
  }
}

export async function processSegments(
  pdfBuffer: Buffer,
  segments: InvoiceSegment[],
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openrouter: any,
  limit: number = 2,
): Promise<MultiPageOCRResult[]> {
  const results = new Array<MultiPageOCRResult>(segments.length);
  const queue: Array<[number, InvoiceSegment]> = segments.map((s, i) => [i, s]);

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [idx, segment] = item;

      try {
        results[idx] = await extractInvoiceFromPDF(pdfBuffer, segment, userId, supabase, openrouter);
      } catch (error) {
        console.error(`[OCR Multi-Page] Worker error for segment ${segment.startPage}-${segment.endPage ?? segment.startPage}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results[idx] = { success: false, segment, error: errorMessage };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, segments.length) }, worker));
  return results;
}
