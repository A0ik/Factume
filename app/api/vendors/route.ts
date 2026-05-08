import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorIntelligence {
  id?: string;
  vendor_name: string;
  vendor_domain?: string;
  typical_categories: string[];
  typical_amount_range: { min: number; max: number };
  avg_processing_time: number;
  invoice_patterns: string[];
  ocr_confidence_avg: number;
  total_invoices: number;
  last_seen: string;
  notes?: string;
  payment_terms?: string;
  vat_number?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

// ---------------------------------------------------------------------------
// GET handler - Get vendor intelligence
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vendor_name = searchParams.get('vendor_name');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get vendor intelligence
    let query = supabase
      .from('vendor_intelligence')
      .select('*')
      .eq('user_id', user.id)
      .order('total_invoices', { ascending: false })
      .limit(limit);

    if (vendor_name) {
      query = query.ilike('vendor_name', `%${vendor_name}%`);
    }

    if (search) {
      query = query.or(`vendor_name.ilike.%${search}%,vendor_domain.ilike.%${search}%`);
    }

    const { data: vendors } = await query;

    // Get supplier templates
    const { data: templates } = await supabase
      .from('supplier_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false });

    return NextResponse.json({
      vendors: vendors || [],
      templates: templates || [],
    });
  } catch (error) {
    console.error('[Get Vendors] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fournisseurs' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler - Learn from invoice (update vendor intelligence)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense_id, vendor_data } = await req.json();

    if (!expense_id) {
      return NextResponse.json(
        { error: 'ID de dépense requis' },
        { status: 400 }
      );
    }

    // Get expense details if vendor_data not provided
    let expenseVendor = vendor_data;
    if (!expenseVendor) {
      const { data: expense } = await supabase
        .from('expenses')
        .select('vendor, category, amount, date, ocr_confidence')
        .eq('id', expense_id)
        .eq('user_id', user.id)
        .single();

      if (!expense) {
        return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
      }

      expenseVendor = expense;
    }

    const vendorName = expenseVendor.vendor;
    if (!vendorName) {
      return NextResponse.json(
        { error: 'Nom de fournisseur requis' },
        { status: 400 }
      );
    }

    // Check if vendor intelligence exists
    const { data: existing } = await supabase
      .from('vendor_intelligence')
      .select('*')
      .eq('user_id', user.id)
      .ilike('vendor_name', vendorName)
      .single();

    const now = new Date().toISOString();
    const amount = expenseVendor.amount || 0;
    const confidence = expenseVendor.ocr_confidence || 0.8;

    if (existing) {
      // Update existing vendor intelligence
      const updateData: any = {
        total_invoices: existing.total_invoices + 1,
        last_seen: now,
        ocr_confidence_avg: (
          (existing.ocr_confidence_avg * existing.total_invoices + confidence) /
          (existing.total_invoices + 1)
        ),
        updated_at: now,
      };

      // Update amount range
      const currentMin = existing.typical_amount_range?.min || amount;
      const currentMax = existing.typical_amount_range?.max || amount;
      updateData.typical_amount_range = {
        min: Math.min(currentMin, amount),
        max: Math.max(currentMax, amount),
      };

      // Update categories if new category
      if (expenseVendor.category) {
        const categories = existing.typical_categories || [];
        if (!categories.includes(expenseVendor.category)) {
          updateData.typical_categories = [...categories, expenseVendor.category];
        }
      }

      // Add invoice pattern if date exists
      if (expenseVendor.date) {
        const dayOfMonth = new Date(expenseVendor.date).getDate();
        const patterns = existing.invoice_patterns || [];
        if (!patterns.includes(`day_${dayOfMonth}`)) {
          updateData.invoice_patterns = [...patterns, `day_${dayOfMonth}`];
        }
      }

      const { data: updated, error } = await supabase
        .from('vendor_intelligence')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        vendor: updated,
        message: 'Intelligence fournisseur mise à jour',
      });
    }

    // Create new vendor intelligence
    const dayOfMonth = expenseVendor.date
      ? `day_${new Date(expenseVendor.date).getDate()}`
      : null;

    const { data: newVendor, error } = await supabase
      .from('vendor_intelligence')
      .insert({
        user_id: user.id,
        vendor_name: vendorName,
        typical_categories: expenseVendor.category ? [expenseVendor.category] : [],
        typical_amount_range: { min: amount, max: amount },
        avg_processing_time: 0,
        invoice_patterns: dayOfMonth ? [dayOfMonth] : [],
        ocr_confidence_avg: confidence,
        total_invoices: 1,
        last_seen: now,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      vendor: newVendor,
      message: 'Intelligence fournisseur créée',
    }, { status: 201 });
  } catch (error) {
    console.error('[Learn Vendor] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'apprentissage' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update vendor intelligence manually
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { vendor_id, updates } = await req.json();

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'ID de fournisseur requis' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('vendor_intelligence')
      .select('*')
      .eq('id', vendor_id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Fournisseur introuvable' }, { status: 404 });
    }

    // Update allowed fields
    const allowedFields = [
      'vendor_domain', 'notes', 'payment_terms', 'vat_number',
      'contact_info', 'typical_categories', 'invoice_patterns'
    ];

    const updateData: any = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const { data: updated, error } = await supabase
      .from('vendor_intelligence')
      .update(updateData)
      .eq('id', vendor_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      vendor: updated,
      message: 'Fournisseur mis à jour',
    });
  } catch (error) {
    console.error('[Update Vendor] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete vendor intelligence
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vendor_id = searchParams.get('vendor_id');

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'ID de fournisseur requis' },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const { error } = await supabase
      .from('vendor_intelligence')
      .delete()
      .eq('id', vendor_id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Fournisseur supprimé',
    });
  } catch (error) {
    console.error('[Delete Vendor] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
