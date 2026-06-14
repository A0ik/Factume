import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getValidSumUpToken } from '@/lib/sumup/oauth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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
      return NextResponse.json({ url: existingUrl, checkoutId: invoice.sumup_checkout_id });
    }

    // Validate and round amount
    const amount = Math.round(Number(invoice.total) * 100) / 100;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Le montant de la facture doit être supérieur à 0.' }, { status: 400 });
    }

    const currency = (profile?.currency || 'EUR').toUpperCase();

    console.log('[sumup-payment-link] Creating checkout with OAuth token — invoice:', invoiceId, 'amount:', amount, 'currency:', currency);

    // Build checkout request
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;

    const checkoutBody: Record<string, unknown> = {
      checkout_reference: invoiceId,
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
          // Re-save to DB in case it was lost
          await supabase
            .from('invoices')
            .update({ sumup_checkout_id: existingCheckoutId, payment_link: existingUrl, stripe_payment_url: null })
            .eq('id', invoiceId);
          return NextResponse.json({ url: existingUrl, checkoutId: existingCheckoutId });
        }
        // Fallback: try to list checkouts to find the existing one
        try {
          const listRes = await fetch(`https://api.sumup.com/v0.1/checkouts?checkout_reference=${invoiceId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const existing = Array.isArray(listData) ? listData[0] : listData?.items?.[0];
            if (existing?.id) {
              const existingUrl = existing.hosted_checkout_url || `https://checkout.sumup.com/${existing.id}`;
              await supabase
                .from('invoices')
                .update({ sumup_checkout_id: existing.id, payment_link: existingUrl, stripe_payment_url: null })
                .eq('id', invoiceId);
              return NextResponse.json({ url: existingUrl, checkoutId: existing.id });
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

    // Save checkout to invoice
    const { error: saveErr } = await supabase
      .from('invoices')
      .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl, stripe_payment_url: null })
      .eq('id', invoiceId);

    if (saveErr) {
      console.error('[sumup-payment-link] DB save failed:', saveErr.message);
    }

    return NextResponse.json({ url: paymentUrl, checkoutId: checkout.id });
  } catch (error: any) {
    console.error('[sumup-payment-link] Unexpected error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
