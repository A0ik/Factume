import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// PUT /api/vendor-rules/[id] — Update a vendor mapping
// ---------------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { vendor_name_pattern, account_code, account_name, corrected_category } = body as {
    vendor_name_pattern?: string;
    account_code?: string;
    account_name?: string;
    corrected_category?: string;
  };

  const updates: Record<string, unknown> = {};
  if (vendor_name_pattern !== undefined) updates.vendor_name_pattern = vendor_name_pattern.toLowerCase().trim();
  if (account_code !== undefined) updates.account_code = account_code || null;
  if (account_name !== undefined) updates.account_name = account_name || null;
  if (corrected_category !== undefined) updates.corrected_category = corrected_category || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from('vendor_mappings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, vendor_name_pattern, account_code, account_name, corrected_category, created_at, updated_at')
    .single();

  if (error) {
    console.error('[Vendor Rules] Update error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
  }

  if (!rule) {
    return NextResponse.json({ error: 'Règle introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ rule });
}
