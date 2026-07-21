import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ATHÉNA CIBLE 1B — liste les acomptes (paiements partiels) d'une facture.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Garde d'appartenance (la RLS owner_select de partial_payments double-couvre).
    const { data: inv } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (!inv) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

    const { data: payments, error } = await supabase
      .from('partial_payments')
      .select('*')
      .eq('invoice_id', id)
      .order('paid_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ payments: payments || [] });
  } catch (e) {
    console.error('[partial-payments GET]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
