import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // --- Auth check ---
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // --- Ownership check ---
    const { data: conn, error: connErr } = await admin
      .from('merchant_connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)  // Only allow syncing own connections
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Simulate sync (in production, this would call the merchant's API)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update last_sync_at
    await admin
      .from('merchant_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: null
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      synced: 0
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
