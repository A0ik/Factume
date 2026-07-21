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
import { learnVendorIntelligence, detectDuplicate, resolveOrCreateVendor, type SavedExpenseRef } from '@/lib/vendors';

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
  documentType: string | null = null,
  dueDate: string | null = null,
) {
  const journalEntry = generateJournalEntry({
    category,
    supplierCategory,
    amountTtc,
    amountHt,
    vatAmount,
    vatRate,
    paymentMethod,
    documentType,
    dueDate,
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
// DÉDALOS CIBLE 1a — Réconciliation HT / TVA / TTC
// amount est la convention TTC (cf. accounting_expenses_view: amount_ht = amount - vat_amount).
// L'IA peut omettre ht_amount ou renvoyer un triplet incohérent → on impose TTC comme pivot
// et on dérive HT = TTC − TVA. Évite le bug "HT = NaN €" côté UI et garantit la cohérence
// comptable (débit 6xx au HT, TVA 44566, crédit 401/512 au TTC).
// ---------------------------------------------------------------------------
export function reconcileAmounts(extracted: {
  amount: number | null;
  ht_amount: number | null;
  vat_amount: number | null;
}): { ttc: number; ht: number; vat: number;_htReconciled: boolean } {
  const ttc = Number.isFinite(extracted.amount as number) ? (extracted.amount as number) : 0;
  const vat = Number.isFinite(extracted.vat_amount as number) ? (extracted.vat_amount as number) : 0;
  let ht = Number.isFinite(extracted.ht_amount as number) ? (extracted.ht_amount as number) : NaN;
  let htReconciled = false;

  // HT manquant ou non positif → dériver depuis TTC − TVA
  if (!Number.isFinite(ht) || ht <= 0) {
    ht = Math.max(0, ttc - vat);
    htReconciled = true;
  }

  // Incohérence triplet (tolérance 0,05 €) → on fait confiance au TTC, on recale le HT
  if (Math.abs(ht + vat - ttc) > 0.05) {
    ht = Math.max(0, ttc - vat);
    htReconciled = true;
  }

  return { ttc, ht, vat, _htReconciled: htReconciled };
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

  // 3. Réconciliation HT/TVA/TTC (DÉDALOS CIBLE 1a — fix HT=NaN + cohérence comptable)
  const recon = reconcileAmounts({
    amount: extracted.amount as number | null,
    ht_amount: extracted.ht_amount as number | null,
    vat_amount: extracted.vat_amount as number | null,
  });

  // 3b. Build journal entry (au HT réconcilié)
  const je = buildJournalEntryJson(
    category, supplierCategory,
    recon.ttc,
    recon.ht,
    recon.vat,
    extracted.vat_rate as number | null,
    extracted.payment_method as string | null,
    (extracted.document_type as string | null) ?? null,
    (extracted.due_date as string | null) ?? null,
  );

  const accountMapping = getAccountCode(category, supplierCategory);

  // 3c. HERMÈS CIBLE 1 — résout/crée le fournisseur (SIRET > VAT > nom) AVANT
  // l'insert pour câbler la FK vendor_intelligence_id. C'est le chaînon qui
  // relie chaque facture scannée à son entrée du référentiel /suppliers.
  let vendorIntelligenceId: string | null = null;
  try {
    vendorIntelligenceId = await resolveOrCreateVendor(supabase, userId, {
      vendor: extracted.vendor as string | null,
      siret: extracted.vendor_siret as string | null,
      vat: extracted.vendor_vat_number as string | null,
    });
  } catch (e) {
    console.error('[OCR Core] vendor resolve error:', e);
  }

  // 4. Build expense record
  const expenseRecord: Record<string, unknown> = {
    user_id: userId,
    vendor: extracted.vendor,
    vendor_intelligence_id: vendorIntelligenceId,
    amount: recon.ttc,
    ht_amount: recon.ht,
    vat_amount: recon.vat,
    category: extracted.category,
    date: extracted.date,
    description: extracted.description,
    receipt_url: fileMeta.receiptUrl,
    receipt_storage_path: fileMeta.storagePath,
    // ARGOS (CIBLE 5) — tout flux OCR uploade obligatoirement un justificatif avant l'insert.
    // Sans has_receipt:true, les filtres « sans justificatif » classaient à tort ces dépenses.
    has_receipt: true,
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

  // Store validation warnings if any (+ transparence sur la réconciliation HT)
  const warnings = [...validation.warnings];
  if (recon._htReconciled) {
    warnings.push('HT réconcilié (TTC − TVA) : montant HT absent ou incohérent dans l\'extraction IA.');
  }
  if (warnings.length > 0) {
    expenseRecord.ocr_validation_warnings = warnings;
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

  // DÉDALOS / Dext-killer — auto-apprentissage fournisseur + détection de doublon
  // (best-effort). Chaque sauvegarde nourrit l'annuaire /suppliers et vérifie les
  // doublons contre l'historique — exactement le loop auto-categorize de Dext.
  if (savedExpense) {
    try {
      await learnVendorIntelligence(supabase, userId, {
        vendor: extracted.vendor,
        category: extracted.category,
        amount: recon.ttc,
        date: extracted.date,
        ocr_confidence: extracted.confidence,
        ocr_invoice_number: extracted.invoice_number,
      }, vendorIntelligenceId);
    } catch (e) {
      console.error('[OCR Core] vendor learn error:', e);
    }
    try {
      await detectDuplicate(supabase, userId, savedExpense as SavedExpenseRef);
    } catch (e) {
      console.error('[OCR Core] duplicate detect error:', e);
    }
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
