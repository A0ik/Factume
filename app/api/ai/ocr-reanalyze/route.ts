import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAccountCode, generateJournalEntry } from '@/lib/plan-comptable';
import {
  sanitizeString,
  sanitizeNumeric,
  sanitizeDate,
  sanitizeCategory,
  sanitizePaymentMethod,
  sanitizeLineItems,
  sanitizeVatDetails,
  normalizeConfidence,
  validatePCGCode,
  buildOcrPrompt,
} from '@/lib/ocr-helpers';

const OCR_MODEL = 'google/gemini-2.0-flash-exp';

// ---------------------------------------------------------------------------
// POST /api/ai/ocr-reanalyze
// Body: { expense_id: string }
// Downloads existing receipt from Storage, re-runs OCR, updates the expense.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const { expense_id } = await req.json();
    if (!expense_id) {
      return NextResponse.json({ error: 'expense_id requis' }, { status: 400 });
    }

    // ── 1. Load existing expense ──────────────────────────────────────────
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    if (!expense.receipt_storage_path) {
      return NextResponse.json({ error: 'Aucun justificatif stocké pour cette dépense' }, { status: 422 });
    }

    // ── 2. Download file from Supabase Storage ────────────────────────────
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(expense.receipt_storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Impossible de télécharger le justificatif depuis le stockage' }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const isPdf = expense.receipt_storage_path.toLowerCase().endsWith('.pdf');
    const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';

    // ── 3. Re-run OCR via OpenRouter ──────────────────────────────────────
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: OCR_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: "L'IA n'a retourné aucune réponse" }, { status: 500 });
    }

    // ── 4. Parse & sanitize ───────────────────────────────────────────────
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: "Réponse IA non parseable" }, { status: 500 });
    }

    const vendor = sanitizeString(parsed.vendor);
    const amount = sanitizeNumeric(parsed.amount_ttc ?? parsed.amount);
    const vatAmount = sanitizeNumeric(parsed.vat_amount ?? parsed.tva);
    const htAmount = sanitizeNumeric(parsed.amount_ht);
    const date = sanitizeDate(parsed.date);
    const category = sanitizeCategory(parsed.category);
    const paymentMethod = sanitizePaymentMethod(parsed.payment_method);
    const confidence = normalizeConfidence(parsed.confidence);
    const invoiceNumber = sanitizeString(parsed.invoice_number);
    const description = sanitizeString(parsed.description);
    const extractedAccountCode = sanitizeString(parsed.account_code);
    const extractedAccountLabel = sanitizeString(parsed.account_label);
    const supplierCategory = sanitizeString(parsed.supplier_category);
    const lineItems = sanitizeLineItems(parsed.line_items);
    const vatDetails = sanitizeVatDetails(parsed.vat_details);

    // ── 5. Account code: vendor_mappings → AI (PCG-validated) → fallback ──
    const accountMapping = getAccountCode(category ?? '', supplierCategory ?? '');
    let finalAccountCode = (validatePCGCode(extractedAccountCode) ? extractedAccountCode : null) ?? accountMapping.code;
    let finalAccountLabel = extractedAccountLabel ?? accountMapping.label;

    if (vendor) {
      const normalized = vendor.toLowerCase().trim();
      const { data: mapping } = await supabase
        .from('vendor_mappings')
        .select('account_code, account_name')
        .eq('user_id', user.id)
        .ilike('vendor_name_pattern', normalized)
        .maybeSingle();
      if (mapping?.account_code) {
        finalAccountCode = mapping.account_code;
        finalAccountLabel = mapping.account_name || finalAccountLabel;
      }
    }

    // ── 6. Journal entry ──────────────────────────────────────────────────
    const journalEntry = generateJournalEntry({
      category: category ?? '',
      supplierCategory: supplierCategory ?? '',
      amountTtc: amount ?? 0,
      amountHt: htAmount,
      vatAmount,
      vatRate: typeof parsed.vat_rate === 'number' ? parsed.vat_rate : null,
      paymentMethod: paymentMethod ?? 'card',
    });

    // ── 7. Update expense in DB ───────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      ocr_confidence: confidence,
      ocr_reanalyzed_at: new Date().toISOString(),
    };

    if (vendor !== null) updatePayload.vendor = vendor;
    if (amount !== null) updatePayload.amount = amount;
    if (vatAmount !== null) updatePayload.vat_amount = vatAmount;
    if (htAmount !== null) updatePayload.ht_amount = htAmount;
    if (date !== null) updatePayload.date = date;
    if (category !== null) updatePayload.category = category;
    if (paymentMethod !== null) updatePayload.payment_method = paymentMethod;
    if (invoiceNumber !== null) updatePayload.invoice_number = invoiceNumber;
    if (description !== null) updatePayload.description = description;
    if (finalAccountCode) updatePayload.account_code = finalAccountCode;
    if (finalAccountLabel) updatePayload.account_label = finalAccountLabel;
    if (lineItems.length > 0) updatePayload.ocr_line_items = lineItems;
    if (vatDetails.length > 0) updatePayload.vat_details = vatDetails;
    if (journalEntry) updatePayload.journal_entry = journalEntry;

    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Re-analyze] Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
      ocr_confidence: confidence,
      message: 'Facture re-analysée avec succès',
    });
  } catch (error) {
    console.error('[OCR Re-analyze] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inattendue' },
      { status: 500 }
    );
  }
}
