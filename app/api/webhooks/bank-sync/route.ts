import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { applyIpRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitError = applyIpRateLimit(req, 100, 60_000);
  if (rateLimitError) return rateLimitError as NextResponse;

  // ARGOS (sécurité) — Fail-closed : le secret partagé DOIT être configuré. Avant, son
  // absence rendait la route ouverte ET l'utilisateur était résolu via payload.user_email
  // (champ contrôlable par l'appelant) → injection de transactions bancaires chez autrui.
  const syncSecret = process.env.BANK_SYNC_SECRET;
  if (!syncSecret) {
    console.error('[bank-sync] BANK_SYNC_SECRET manquant — rejet fail-closed');
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 401 });
  }
  const provided = req.headers.get('authorization')?.replace('Bearer ', '')
    || req.headers.get('x-sync-secret');
  if (provided !== syncSecret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const email = payload.user_email;
    const transactions = payload.transactions || [];
    const source = payload.source || 'external';

    if (!email) return NextResponse.json({ error: 'Missing user_email' }, { status: 400 });

    const admin = createAdminClient();

    const { data: user } = await admin.from('profiles').select('id').eq('email', email).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    for (const trx of transactions) {
      const { data: bTrx, error: insertErr } = await admin.from('bank_transactions').insert({
        user_id: user.id,
        amount: trx.amount,
        transaction_date: trx.date,
        label: trx.label,
        currency: trx.currency || 'EUR',
        source: source,
        status: 'unreconciled'
      }).select().single();

      if (insertErr || !bTrx) continue;

      if (trx.amount < 0) {
        const docAmount = Math.abs(trx.amount);

        const { data: docs } = await admin
          .from('captured_documents')
          .select('id, document_date')
          .eq('user_id', user.id)
          .eq('amount', docAmount)
          .is('matched_transaction_id', null)
          .order('document_date', { ascending: false });

        if (docs && docs.length > 0) {
          const targetDoc = docs[0];

          await admin.from('captured_documents')
            .update({ matched_transaction_id: bTrx.id })
            .eq('id', targetDoc.id);

          await admin.from('bank_transactions')
            .update({ status: 'reconciled' })
            .eq('id', bTrx.id);
        }
      }
    }

    return NextResponse.json({ success: true, processed: transactions.length });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
