import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getValidSumUpToken } from '@/lib/sumup/oauth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { buildFreshLinkUpdate } from '@/lib/payment-link';
import { ensureShortToken, buildShortPayUrl } from '@/lib/pay-token';
import { getPaidTotal, computeRemaining } from '@/lib/invoice-balance';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 requests/minute per IP
    const rlResult = rateLimit({ key: getClientIp(req), limit: 20, windowMs: 60000 });
    if (!rlResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId, force } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get invoice — verify ownership to prevent IDOR
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Get valid OAuth token (will refresh if needed)
    const accessToken = await getValidSumUpToken(user.id);

    if (!accessToken) {
      return NextResponse.json({
        error: 'SumUp non connecté. Connectez votre compte dans les paramètres.',
        needsReauth: true,
      }, { status: 400 });
    }

    // Get profile for additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency, sumup_merchant_code')
      .eq('id', user.id)
      .single();

    // FIXER (BUG 1) — cache court-circuité quand l'utilisateur force la régénération.
    if (invoice.sumup_checkout_id && !force) {
      const existingUrl = invoice.payment_link || `https://checkout.sumup.com/${invoice.sumup_checkout_id}`;
      return NextResponse.json({
        url: existingUrl,
        checkoutId: invoice.sumup_checkout_id,
        shortUrl: buildShortPayUrl(invoice.payment_short_token) ?? existingUrl,
      });
    }

    // ATELIER (CIBLE 2 & 3) — token d'URL courte pour QR léger + lien cliquable.
    // Idempotent : renvoie le token existant ou en minte un nouveau (une seule fois).
    const shortToken = await ensureShortToken(supabase, invoiceId, invoice.payment_short_token);

    // ODIN (CIBLE 2) — on charge le SOLDE RESTANT (total − acomptes), jamais le
    // total brut. Une facture soldée est refusée.
    const paidTotal = await getPaidTotal(supabase, invoiceId);
    const amount = computeRemaining(Number(invoice.total), paidTotal);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Cette facture est déjà soldée (acomptes ≥ total).' }, { status: 400 });
    }

    const currency = (profile?.currency || 'EUR').toUpperCase();

    // ODIN (CIBLE 2 — fix SumUp) — checkout_reference UNIQUE PAR SOLDE. SumUp impose
    // l'unicité du checkout_reference par marchand : régénérer avec le même invoiceId
    // déclenchait un 409, et le handler réutilisait l'ancien checkout au TOTAL COMPLET
    // (ignorant l'acompte → double-encaissement). On suffixe par le solde en centimes :
    // un nouveau solde (acompte versé) => un NOUVEAU checkout au bon montant ; un même
    // solde re-cliqué => 409 légitime, on réutilise (même montant, correct).
    // Le webhook rapproche par sumup_checkout_id (PAS par référence) : rapprochement préservé.
    const checkoutReference = `${invoiceId}-s${Math.round(amount * 100)}`;

    console.log('[sumup-payment-link] Creating checkout with OAuth token — invoice:', invoiceId, 'amount:', amount, 'currency:', currency, 'ref:', checkoutReference);

    // Build checkout request
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;

    const checkoutBody: Record<string, unknown> = {
      checkout_reference: checkoutReference,
      amount,
      currency,
      merchant_code: profile?.sumup_merchant_code,
      description: `${invoice.document_type === 'quote' ? 'Devis' : 'Facture'} ${invoice.number}`,
      return_url: `${appUrl}/api/sumup/webhook`,
      hosted_checkout: { enabled: true },
    };

    // Call SumUp API with OAuth token
    const checkoutRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) {
      let err: Record<string, any> = {};
      try { err = await checkoutRes.json(); } catch {}

      console.error('[sumup-payment-link] SumUp API error — HTTP', checkoutRes.status, JSON.stringify(err));

      // Handle token expiry specifically
      if (checkoutRes.status === 401) {
        return NextResponse.json({
          error: 'Votre session SumUp a expiré. Veuillez vous reconnecter dans Paramètres > SumUp.',
          needsReauth: true,
        }, { status: 401 });
      }

      if (checkoutRes.status === 403) {
        return NextResponse.json({
          error: 'Votre compte SumUp n\'a pas les permissions pour créer des liens de paiement. Contactez le support SumUp.',
        }, { status: 400 });
      }

      if (checkoutRes.status === 409) {
        // Checkout already exists for this checkout_reference — reconstruct URL
        // The checkout_reference is the invoiceId, so the checkout exists on SumUp's side
        const existingCheckoutId = err.id || err.checkout_id;
        if (existingCheckoutId) {
          const existingUrl = `https://checkout.sumup.com/${existingCheckoutId}`;
          // INSPECTOR (BUG 2) — ré-écriture via le builder : nullifie aussi les
          // colonnes Stripe legacy (stripe_payment_link_url/_id) + pose provider/amount.
          const updA = buildFreshLinkUpdate('sumup', { url: existingUrl, amount, sumupId: existingCheckoutId });
          if (shortToken) updA.payment_short_token = shortToken;
          await supabase.from('invoices').update(updA).eq('id', invoiceId);
          return NextResponse.json({ url: existingUrl, checkoutId: existingCheckoutId, shortUrl: buildShortPayUrl(shortToken) ?? existingUrl });
        }
        // Fallback: try to list checkouts to find the existing one
        try {
          const listRes = await fetch(`https://api.sumup.com/v0.1/checkouts?checkout_reference=${checkoutReference}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const existing = Array.isArray(listData) ? listData[0] : listData?.items?.[0];
            if (existing?.id) {
              const existingUrl = existing.hosted_checkout_url || `https://checkout.sumup.com/${existing.id}`;
              // INSPECTOR (BUG 2) — même nettoyage complet que ci-dessus.
              const updB = buildFreshLinkUpdate('sumup', { url: existingUrl, amount, sumupId: existing.id });
              if (shortToken) updB.payment_short_token = shortToken;
              await supabase.from('invoices').update(updB).eq('id', invoiceId);
              return NextResponse.json({ url: existingUrl, checkoutId: existing.id, shortUrl: buildShortPayUrl(shortToken) ?? existingUrl });
            }
          }
        } catch {}
        return NextResponse.json({
          error: 'Un lien de paiement existe déjà pour cette facture côté SumUp.',
        }, { status: 400 });
      }

      // Extract error details
      const sumupMsg = err.message || err.error_description || err.error_code || err.error || '';
      const errorMsg = sumupMsg
        ? `Erreur SumUp : ${sumupMsg}`
        : `Erreur SumUp (${checkoutRes.status}).`;

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const checkout = await checkoutRes.json();
    console.log('[sumup-payment-link] Checkout created:', JSON.stringify(checkout));

    if (!checkout.id) {
      console.error('[sumup-payment-link] SumUp response has no id field:', JSON.stringify(checkout));
      return NextResponse.json({
        error: 'SumUp n\'a pas retourné d\'identifiant de checkout. Contactez le support SumUp.'
      }, { status: 500 });
    }

    const paymentUrl = checkout.hosted_checkout_url || `https://checkout.sumup.com/${checkout.id}`;

    // INSPECTOR (BUG 2) — source de vérité unique : payment_provider='sumup',
    // payment_link_amount = montant figé dans le checkout, et nullification de
    // TOUTES les colonnes Stripe (url ET legacy link) via le builder. Avant, seul
    // stripe_payment_url était nettoyé → stripe_payment_link_url/_id survivaient
    // et corrompaient les résolveurs du PDF (QR/libellé en désaccord).
    const updMain = buildFreshLinkUpdate('sumup', { url: paymentUrl, amount, sumupId: checkout.id });
    if (shortToken) updMain.payment_short_token = shortToken;
    const { error: saveErr } = await supabase.from('invoices').update(updMain).eq('id', invoiceId);

    if (saveErr) {
      console.error('[sumup-payment-link] DB save failed:', saveErr.message);
    }

    return NextResponse.json({ url: paymentUrl, checkoutId: checkout.id, shortUrl: buildShortPayUrl(shortToken) ?? paymentUrl });
  } catch (error: any) {
    console.error('[sumup-payment-link] Unexpected error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
