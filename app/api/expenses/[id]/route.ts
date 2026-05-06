import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const ALLOWED_UPDATE_FIELDS = new Set([
  'vendor', 'amount', 'vat_amount', 'category', 'date',
  'description', 'payment_method', 'currency', 'invoice_number',
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const expenseId = params.id;
    if (!expenseId) {
      return NextResponse.json({ error: 'ID de dépense manquant' }, { status: 400 });
    }

    const body = await req.json();

    // Only allow whitelisted fields to be updated
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 });
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
      }
      console.error('[Expenses PATCH] DB error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ expense });
  } catch (error: unknown) {
    console.error('[Expenses PATCH] Unhandled error:', error);
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 });
  }
}
