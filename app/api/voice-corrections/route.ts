import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/voice-corrections — Fetch all corrections for the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data, error } = await supabase
      .from('voice_corrections')
      .select('field, original_value, corrected_value, context')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ corrections: data || [] });
  } catch (error: any) {
    console.error('[voice-corrections GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/voice-corrections — Save a correction
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { field, original_value, corrected_value, context } = body;

    if (!field || !original_value || !corrected_value) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    // Upsert: if same user+field+original exists, update the corrected value
    const { data, error } = await supabase
      .from('voice_corrections')
      .upsert(
        { user_id: user.id, field, original_value, corrected_value, context: context || 'general' },
        { onConflict: 'user_id,field,original_value' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ correction: data });
  } catch (error: any) {
    console.error('[voice-corrections POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/voice-corrections — Delete a correction
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    const { error } = await supabase
      .from('voice_corrections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[voice-corrections DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
