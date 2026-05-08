import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SupplierTemplate {
  supplier_name: string;
  supplier_siret?: string;
  supplier_vat_number?: string;
  template_fields: {
    invoice_number_position?: 'header' | 'footer' | 'table' | 'body';
    date_position?: 'header' | 'footer' | 'body';
    total_position?: 'header' | 'footer' | 'body';
    vat_details_position?: 'footer' | 'body';
    line_items_position?: 'table' | 'body';
    typical_vat_rate?: number;
    typical_payment_terms?: string;
  };
}

interface LearnResult {
  success: boolean;
  template?: {
    id: string;
    supplier_name: string;
    confidence_score: number;
    sample_count: number;
  };
  message?: string;
}

// ---------------------------------------------------------------------------
// Helper: Extract patterns from OCR data
// ---------------------------------------------------------------------------

function extractSupplierPatterns(expense: any): SupplierTemplate['template_fields'] {
  const fields: SupplierTemplate['template_fields'] = {};

  // Analyze invoice_number position
  if (expense.ocr_invoice_number) {
    const raw = expense.ocr_raw_response as any;
    if (raw) {
      // Try to detect position based on typical patterns
      fields.invoice_number_position = 'header'; // Default assumption
    }
  }

  // Analyze typical VAT rate from line items
  if (expense.ocr_line_items && Array.isArray(expense.ocr_line_items)) {
    const vatRates = expense.ocr_line_items
      .map((item: any) => item.vat_rate)
      .filter((rate: number) => rate > 0);

    if (vatRates.length > 0) {
      // Find most common VAT rate
      const rateCounts = vatRates.reduce((acc: any, rate: number) => {
        acc[rate] = (acc[rate] || 0) + 1;
        return acc;
      }, {});

      const mostCommonRate = Object.entries(rateCounts)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0];

      if (mostCommonRate) {
        fields.typical_vat_rate = parseFloat(mostCommonRate);
      }
    }
  }

  // Detect line items presence
  fields.line_items_position =
    expense.ocr_line_items && expense.ocr_line_items.length > 0
      ? 'table'
      : 'body';

  return fields;
}

// ---------------------------------------------------------------------------
// Helper: Calculate confidence score
// ---------------------------------------------------------------------------

function calculateConfidenceScore(
  expense: any,
  existingTemplate?: any
): number {
  let score = 0.5; // Base score

  // OCR confidence
  if (expense.ocr_confidence) {
    score += expense.ocr_confidence * 0.3;
  }

  // Data completeness
  if (expense.vendor) score += 0.1;
  if (expense.ocr_invoice_number) score += 0.1;
  if (expense.amount) score += 0.1;

  // Line items presence
  if (expense.ocr_line_items && expense.ocr_line_items.length > 0) {
    score += 0.15;
  }

  // Existing template match
  if (existingTemplate) {
    score += existingTemplate.confidence_score * 0.25;
  }

  return Math.min(score, 1);
}

// ---------------------------------------------------------------------------
// POST handler - Learn from expense
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense_id } = await req.json();

    if (!expense_id) {
      return NextResponse.json(
        { error: 'ID de dépense manquant' },
        { status: 400 }
      );
    }

    // Fetch expense with OCR data
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (error || !expense) {
      return NextResponse.json(
        { error: 'Dépense introuvable' },
        { status: 404 }
      );
    }

    if (!expense.vendor || !expense.ocr_raw_response) {
      return NextResponse.json(
        { error: 'Données OCR insuffisantes pour l\'apprentissage' },
        { status: 400 }
      );
    }

    // Extract supplier SIRET if available
    const supplierSiret = expense.ocr_supplier_siret || null;

    // Check if template already exists
    const { data: existingTemplate } = await supabase
      .from('supplier_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('supplier_siret', supplierSiret)
      .single();

    // Extract patterns from this expense
    const templateFields = extractSupplierPatterns(expense);

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(expense, existingTemplate);

    if (existingTemplate) {
      // Update existing template
      const updatedFields = {
        ...existingTemplate.template_fields,
        ...templateFields,
      };

      // Merge patterns intelligently
      const newSampleCount = existingTemplate.sample_count + 1;
      const newConfidence =
        existingTemplate.confidence_score * 0.8 + confidenceScore * 0.2;

      const { error: updateError } = await supabase
        .from('supplier_templates')
        .update({
          template_fields: updatedFields,
          sample_count: newSampleCount,
          confidence_score: newConfidence,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTemplate.id);

      if (updateError) {
        throw updateError;
      }

      // Update expense with template reference
      await supabase
        .from('expenses')
        .update({
          supplier_template_id: existingTemplate.id,
          supplier_confidence: confidenceScore,
        })
        .eq('id', expense_id);

      return NextResponse.json({
        success: true,
        template: {
          id: existingTemplate.id,
          supplier_name: existingTemplate.supplier_name,
          confidence_score: newConfidence,
          sample_count: newSampleCount,
        },
        message: 'Template fournisseur mis à jour',
      } satisfies LearnResult);
    }

    // Create new template
    const { data: newTemplate, error: insertError } = await supabase
      .from('supplier_templates')
      .insert({
        user_id: user.id,
        supplier_name: expense.vendor,
        supplier_siret: supplierSiret,
        supplier_vat_number: expense.ocr_vendor_vat_number || null,
        template_fields: templateFields,
        sample_count: 1,
        confidence_score: confidenceScore,
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newTemplate) {
      throw insertError;
    }

    // Update expense with template reference
    await supabase
      .from('expenses')
      .update({
        supplier_template_id: newTemplate.id,
        supplier_confidence: confidenceScore,
      })
      .eq('id', expense_id);

    // Update vendor intelligence
    const { data: vendorIntelligence } = await supabase
      .from('vendor_intelligence')
      .select('*')
      .eq('user_id', user.id)
      .eq('vendor_siret', supplierSiret)
      .single();

    if (vendorIntelligence) {
      // Update existing vendor intelligence
      const newTotalPurchases = (vendorIntelligence.total_purchases || 0) + (expense.amount || 0);
      const newPurchaseCount = (vendorIntelligence.purchase_count || 0) + 1;
      const newAverageAmount = newTotalPurchases / newPurchaseCount;

      await supabase
        .from('vendor_intelligence')
        .update({
          total_purchases: newTotalPurchases,
          average_amount: newAverageAmount,
          purchase_count: newPurchaseCount,
          last_purchase_date: expense.date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorIntelligence.id);
    } else {
      // Create vendor intelligence
      await supabase.from('vendor_intelligence').insert({
        user_id: user.id,
        vendor_name: expense.vendor,
        vendor_siret: supplierSiret,
        total_purchases: expense.amount || 0,
        average_amount: expense.amount || 0,
        purchase_count: 1,
        first_purchase_date: expense.date,
        last_purchase_date: expense.date,
        category_distribution: { [expense.category]: 1 },
        typical_vat_rate: templateFields.typical_vat_rate || null,
        risk_score: 0,
      });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: newTemplate.id,
        supplier_name: newTemplate.supplier_name,
        confidence_score: newTemplate.confidence_score,
        sample_count: newTemplate.sample_count,
      },
      message: 'Nouveau template fournisseur créé',
    } satisfies LearnResult);
  } catch (error) {
    console.error('[Supplier Learn] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'apprentissage fournisseur' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - List supplier templates
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from('supplier_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('sample_count', { ascending: false })
      .order('confidence_score', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0,
    });
  } catch (error) {
    console.error('[Supplier Templates] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des templates' },
      { status: 500 }
    );
  }
}
