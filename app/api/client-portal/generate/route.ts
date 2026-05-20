import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();

    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const admin = createAdminClient();

    // Verify user owns this client
    const { data: client } = await admin
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();
    if (!client || client.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Return existing token if present
    const { data: existing } = await admin
      .from('client_portal_tokens')
      .select('token')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .single();

    if (existing) return NextResponse.json({ token: existing.token });

    // Create a new one
    const { data, error } = await admin
      .from('client_portal_tokens')
      .insert({ client_id: clientId, user_id: user.id })
      .select('token')
      .single();

    if (error) throw error;
    return NextResponse.json({ token: data.token });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
