import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { ContractType } from '@/types';

// GET /api/contracts/comments?contractId=&contractType=
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const contractType = searchParams.get('contractType');

    if (!contractId || !contractType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: comments, error } = await admin
      .from('contract_comments')
      .select('*')
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(comments || []);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/contracts/comments
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { contractId, contractType, content } = await req.json();

    if (!contractId || !contractType || !content?.trim()) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: comment, error } = await admin
      .from('contract_comments')
      .insert({
        contract_id: contractId,
        contract_type: contractType,
        user_id: session.user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
