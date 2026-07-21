import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ATHÉNA CIBLE 1B — enregistre un acompte via la RPC atomique record_partial_payment
// (insert partial_payments + recalcul du solde + bascule du statut partial/paid).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // auth.uid() est résolu côté serveur via le JWT porté par les cookies
    // (createServerSupabaseClient) — la RPC vérifie l'appartenance elle-même.
    const { data, error } = await supabase.rpc('record_partial_payment', {
      p_invoice_id: id,
      p_amount: amount,
      p_paid_at: body.paidAt ?? null,
      p_method: body.method ?? null,
      p_note: body.note ?? null,
    });
    if (error) {
      console.error('[partial-payment RPC]', error);
      return NextResponse.json({ error: error.message || 'Erreur.' }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('[partial-payment POST]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
