import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getValidSumUpToken } from '@/lib/sumup/oauth';

/**
 * SumUp Webhook Handler
 *
 * SumUp sends: { "event_type": "CHECKOUT_STATUS_CHANGED", "id": "checkout-id" }
 * We must call the SumUp API to get the actual checkout status.
 * Webhooks are configured via the `return_url` parameter on checkout creation.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  console.log('[sumup-webhook] Webhook received');

  let event: { event_type?: string; type?: string; id?: string };
  try {
    event = JSON.parse(body);
  } catch {
    console.error('[sumup-webhook] Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event_type || event.type;
  const checkoutId = event.id;

  console.log('[sumup-webhook] Event:', JSON.stringify({ type: eventType, id: checkoutId }));

  // Accept both uppercase (real) and lowercase (legacy) event types
  if (!eventType || !checkoutId) {
    console.warn('[sumup-webhook] Missing event_type or id');
    return NextResponse.json({ received: true });
  }

  const eventTypeLower = eventType.toLowerCase();
  if (eventTypeLower !== 'checkout.status.changed') {
    console.log('[sumup-webhook] Ignoring event type:', eventType);
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  try {
    // Find invoice by checkout_id
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, number, total, client_id, user_id')
      .eq('sumup_checkout_id', checkoutId)
      .single();

    if (!invoice) {
      console.warn('[sumup-webhook] No invoice found for checkout:', checkoutId);
      return NextResponse.json({ received: true });
    }

    // Get a valid SumUp token for this user to verify the checkout status
    const accessToken = await getValidSumUpToken(invoice.user_id);
    if (!accessToken) {
      console.error('[sumup-webhook] No valid SumUp token for user:', invoice.user_id);
      return NextResponse.json({ received: true });
    }

    // Call SumUp API to get actual checkout details
    const checkoutRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!checkoutRes.ok) {
      console.error('[sumup-webhook] Failed to fetch checkout:', checkoutRes.status);
      return NextResponse.json({ received: true });
    }

    const checkout: { status?: string; id?: string } = await checkoutRes.json();
    console.log('[sumup-webhook] Checkout status:', checkout.status, 'for invoice:', invoice.number);

    if (checkout.status === 'PAID') {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'sumup',
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('[sumup-webhook] Failed to update invoice:', updateError);
      } else {
        console.log('[sumup-webhook] Successfully marked invoice as paid:', invoice.number);
      }
    } else {
      console.log('[sumup-webhook] Checkout not PAID (status:', checkout.status, '), skipping');
    }
  } catch (err: any) {
    console.error('[sumup-webhook] Error processing webhook:', err);
  }

  // Always return 200 so SumUp doesn't retry
  return NextResponse.json({ received: true });
}
