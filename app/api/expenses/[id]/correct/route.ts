import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { autoLearnVendorRule } from '@/lib/ocr-core';
import { getAccountCode } from '@/lib/plan-comptable';

// ---------------------------------------------------------------------------
// Fields that can be corrected via this endpoint
// ---------------------------------------------------------------------------
const CORRECTABLE_FIELDS = new Set([
  'vendor', 'amount', 'vat_amount', 'category', 'date',
  'description', 'payment_method', 'ht_amount', 'vat_rate',
  'account_code', 'account_label',
]);

// ---------------------------------------------------------------------------
// PATCH /api/expenses/[id]/correct
//
// Correct an OCR-extracted expense. Builds an ocr_corrections JSON diff
// between original and corrected values, updates the expense, and triggers
// the auto-learn system to potentially create a vendor_mapping rule.
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: expenseId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!expenseId) {
      return NextResponse.json({ error: 'ID de dépense manquant' }, { status: 400 });
    }

    const body = await req.json();

    // Only keep correctable fields
    const corrected: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (CORRECTABLE_FIELDS.has(key)) {
        corrected[key] = body[key];
      }
    }

    if (Object.keys(corrected).length === 0) {
      return NextResponse.json({ error: 'Aucun champ correctible fourni' }, { status: 400 });
    }

    // Fetch the current expense to diff against
    const { data: current, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Build the corrections diff
    const fieldsChanged: string[] = [];
    const originalValues: Record<string, unknown> = {};
    const correctedValues: Record<string, unknown> = {};

    for (const [key, newValue] of Object.entries(corrected)) {
      const oldValue = current[key];
      // Only record a change if the value actually differs
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        fieldsChanged.push(key);
        originalValues[key] = oldValue ?? null;
        correctedValues[key] = newValue;
      }
    }

    if (fieldsChanged.length === 0) {
      // No actual changes — return the expense as-is
      return NextResponse.json({ expense: current, corrections: null, autoLearn: null });
    }

    const ocrCorrections = {
      fields_changed: fieldsChanged,
      original_values: originalValues,
      corrected_values: correctedValues,
      corrected_at: new Date().toISOString(),
    };

    // Build the update payload: corrected fields + ocr_corrections metadata
    const updates: Record<string, unknown> = {
      ...corrected,
      ocr_corrections: ocrCorrections,
      updated_at: new Date().toISOString(),
    };

    // If category was corrected, re-resolve the account code
    if (fieldsChanged.includes('category')) {
      const newCategory = correctedValues.category as string;
      const supplierCategory = (corrected.supplier_category ?? current.supplier_category) as string | null;
      const accountMapping = getAccountCode(newCategory, supplierCategory);

      // Only auto-update account code if the user didn't explicitly provide one
      if (!fieldsChanged.includes('account_code')) {
        updates.account_code = accountMapping.code;
        updates.account_label = accountMapping.label;
      }
    }

    // Update the expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Expense Correct] Update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la correction' }, { status: 500 });
    }

    // Trigger auto-learn if category was corrected and vendor exists
    let autoLearnResult = null;
    const vendor = (updatedExpense.vendor ?? current.vendor) as string | null;
    if (fieldsChanged.includes('category') && vendor) {
      try {
        autoLearnResult = await autoLearnVendorRule(
          user.id,
          vendor,
          correctedValues.category as string,
          supabase,
        );
      } catch (err) {
        // Non-critical: log but don't fail the correction
        console.error('[Expense Correct] Auto-learn error (non-critical):', err);
      }
    }

    return NextResponse.json({
      expense: updatedExpense,
      corrections: ocrCorrections,
      autoLearn: autoLearnResult,
    });
  } catch (error: unknown) {
    console.error('[Expense Correct] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 });
  }
}
