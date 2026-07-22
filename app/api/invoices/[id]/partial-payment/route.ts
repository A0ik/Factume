import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { buildVoidLinkUpdate } from '@/lib/payment-link';

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

    // ODIN (CIBLE 2) — un acompte modifie le SOLDE RESTANT. Tout lien de paiement
    // déjà créé a figé un montant désormais faux (le total). On l'invalide
    // (payment_link_stale=true + nullification des URL) pour que :
    //   • /pay/<token> n'envoie plus vers un checkout au montant obsolète ;
    //   • l'auto-régénération recrée un lien au SOLDE RESTANT (voir effet page facture).
    // Colonnes de paiement ≠ colonnes immuables → le trigger d'immutabilité ne s'y oppose pas.
    try {
      await createAdminClient()
        .from('invoices')
        .update(buildVoidLinkUpdate())
        .eq('id', id);
    } catch (e) {
      console.error('[partial-payment] void link update failed', e);
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[partial-payment POST]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
