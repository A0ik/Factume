import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// GET /api/vendor-rules — List all vendor mappings for the current user
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: rules, error } = await supabase
    .from('vendor_mappings')
    .select('id, vendor_name_pattern, account_code, account_name, corrected_category, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Vendor Rules] Fetch error:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des règles.' }, { status: 500 });
  }

  return NextResponse.json({ rules });
}

// ---------------------------------------------------------------------------
// POST /api/vendor-rules — Create a new vendor mapping
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await req.json();
  const { vendor_name_pattern, account_code, account_name, corrected_category } = body as {
    vendor_name_pattern?: string;
    account_code?: string;
    account_name?: string;
    corrected_category?: string;
  };

  if (!vendor_name_pattern || !vendor_name_pattern.trim()) {
    return NextResponse.json({ error: 'Le nom du fournisseur est requis.' }, { status: 400 });
  }

  const record: Record<string, unknown> = {
    user_id: user.id,
    vendor_name_pattern: vendor_name_pattern.toLowerCase().trim(),
    account_code: account_code || null,
    account_name: account_name || null,
    corrected_category: corrected_category || null,
  };

  // Remove null keys
  for (const key of Object.keys(record)) {
    if (record[key] === null || record[key] === undefined) {
      delete record[key];
    }
  }

  const { data: rule, error } = await supabase
    .from('vendor_mappings')
    .insert(record)
    .select('id, vendor_name_pattern, account_code, account_name, corrected_category, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Une règle existe déjà pour ce fournisseur.' }, { status: 409 });
    }
    console.error('[Vendor Rules] Insert error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la règle.' }, { status: 500 });
  }

  return NextResponse.json({ rule }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/vendor-rules — Delete a vendor mapping
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { id } = await req.json() as { id?: string };

  if (!id) {
    return NextResponse.json({ error: 'ID de la règle requis.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendor_mappings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[Vendor Rules] Delete error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
