import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST — Save / update a vendor mapping (user correction)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { raw_vendor, corrected_vendor, corrected_category, corrected_payment_method, corrected_vat_rate, account_code, account_name } = body;

  if (!raw_vendor) {
    return NextResponse.json({ error: 'raw_vendor is required' }, { status: 400 });
  }

  // Normalize the raw vendor name for consistent matching
  const normalized = raw_vendor.toLowerCase().trim().replace(/\s+/g, ' ');

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    raw_vendor: normalized,
    vendor_name_pattern: normalized,
    corrected_vendor: corrected_vendor || raw_vendor,
    corrected_category: corrected_category ?? null,
    corrected_payment_method: corrected_payment_method ?? null,
    corrected_vat_rate: corrected_vat_rate ?? null,
    usage_count: 1,
    updated_at: new Date().toISOString(),
  };

  if (account_code) {
    upsertData.account_code = account_code;
    upsertData.account_name = account_name ?? null;
  }

  // Upsert: if the user already has a mapping for this raw_vendor, update it
  const { data, error } = await supabase
    .from('vendor_mappings')
    .upsert(upsertData, { onConflict: 'user_id,raw_vendor' })
    .select()
    .single();

  if (error) {
    // If upsert failed due to onConflict handling, try an explicit update
    // to increment usage_count instead
    const { data: existing } = await supabase
      .from('vendor_mappings')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('raw_vendor', normalized)
      .single();

    const newCount = (existing?.usage_count ?? 0) + 1;

    const { data: updated, error: updateError } = await supabase
      .from('vendor_mappings')
      .update({
        corrected_vendor,
        corrected_category: corrected_category ?? null,
        corrected_payment_method: corrected_payment_method ?? null,
        corrected_vat_rate: corrected_vat_rate ?? null,
        usage_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('raw_vendor', normalized)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// GET — Look up a learned vendor mapping
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawVendor = req.nextUrl.searchParams.get('vendor');
  if (!rawVendor) {
    return NextResponse.json({ error: 'vendor query param is required' }, { status: 400 });
  }

  // Normalize the vendor name for matching
  const normalized = rawVendor.toLowerCase().trim().replace(/\s+/g, ' ');

  // Try exact match first
  const { data: exact } = await supabase
    .from('vendor_mappings')
    .select('corrected_vendor, corrected_category, corrected_payment_method, corrected_vat_rate, usage_count')
    .eq('user_id', user.id)
    .eq('raw_vendor', normalized)
    .order('usage_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exact) {
    return NextResponse.json({
      found: true,
      vendor: exact.corrected_vendor,
      category: exact.corrected_category,
      payment_method: exact.corrected_payment_method,
      vat_rate: exact.corrected_vat_rate,
    });
  }

  // Fallback: fuzzy match using ILIKE with wildcards around each word
  const words = normalized.split(' ').filter(Boolean);
  const fuzzyPattern = words.length > 0 ? `%${words.join('%')}%` : `%${normalized}%`;

  const { data: fuzzy } = await supabase
    .from('vendor_mappings')
    .select('corrected_vendor, corrected_category, corrected_payment_method, corrected_vat_rate, usage_count')
    .eq('user_id', user.id)
    .ilike('raw_vendor', fuzzyPattern)
    .order('usage_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fuzzy) {
    return NextResponse.json({
      found: true,
      vendor: fuzzy.corrected_vendor,
      category: fuzzy.corrected_category,
      payment_method: fuzzy.corrected_payment_method,
      vat_rate: fuzzy.corrected_vat_rate,
    });
  }

  return NextResponse.json({ found: false });
}
