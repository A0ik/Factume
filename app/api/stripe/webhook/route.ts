import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

// Normalisation défensive : les créateurs de checkout/payment-intent utilisent
// indifféremment invoiceId (camel), invoice_id (snake) ou invoiceID. On résout
// l'ID facture quel que soit le camelCase pour qu'aucun paiement abouti ne
// laisse une facture impayée (bug silencieux de statut/recette).
const resolveInvoiceIdFromMetadata = (
  m: { [key: string]: string } | null | undefined,
): string | undefined =>
  m?.invoiceId || m?.invoice_id || m?.invoiceID || undefined;

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[Stripe Webhook] Signature verification failed:', e.message);
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // LOI 10 (Webhook Souverain) : idempotence ATOMIQUE par event.id.
  // On "claim" l'événement via un INSERT ; la PK (event_id) rend le claim atomique
  // → deux livraisons concurrentes du même event ne peuvent pas toutes deux le traiter.
  // 23505 = doublon (déjà traité) → on skip. Autre erreur (table absente) → fail-open.
  const { error: claimError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type });
  if (claimError && (claimError as { code?: string }).code === '23505') {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Règlement facture — résout l'ID quel que soit le camelCase utilisé par le
        // créateur du checkout (invoiceId / invoice_id / invoiceID). Avant, deux
        // handlers parallèles lisaient des clés différentes : un checkout ne portant
        // qu'une orthographe laissait la facture impayée (bug silencieux de statut).
        // LOI 10 : idempotence préservée (claim event_id en amont + check statut 'paid').
        const invoiceId = resolveInvoiceIdFromMetadata(session.metadata);
        if (session.mode === 'payment' && invoiceId) {
          const userId = session.metadata?.userId || session.metadata?.user_id;

          // Idempotence : skip si déjà payée
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id, status')
            .eq('id', invoiceId)
            .single();

          if (existingInvoice && existingInvoice.status !== 'paid') {
            await supabase
              .from('invoices')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq('id', invoiceId);

            const { data: invoice } = await supabase
              .from('invoices')
              .select('*, client:clients(name)')
              .eq('id', invoiceId)
              .single();

            if (invoice && userId) {
              await supabase.from('notifications').insert({
                user_id: userId,
                type: 'invoice_paid',
                title: `Facture payée — ${invoice.number}`,
                body: `La facture de ${invoice.total?.toFixed(2) || '0'}€ de ${invoice.client?.name || 'un client'} a été payée via Stripe.`,
                link: `/invoices/${invoiceId}`,
              });
            }
          }
        }

        // Handle subscription activation
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const plan = session.metadata.plan as string;
          await supabase.from('profiles').update({
            subscription_tier: plan,
            stripe_subscription_id: session.subscription as string,
            is_trial_active: false,
          }).eq('id', session.metadata.userId);
        }
        break;
      }

      case 'customer.subscription.paused': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from('profiles')
          .update({
            subscription_tier: 'free',
            is_trial_active: false,
          })
          .eq('stripe_subscription_id', sub.id);

        // Notify user their trial has ended
        const { data: profile } = await supabase.from('profiles')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (profile) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'system',
            title: 'Essai terminé',
            body: 'Votre période d\'essai est terminée. Ajoutez un moyen de paiement pour continuer à utiliser Factu.me sans limitation.',
            link: '/settings',
            read: false,
          }).select();
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before trial ends — nudge user to add payment method
        const sub = event.data.object as Stripe.Subscription;
        const { data: profile } = await supabase.from('profiles')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (profile) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'system',
            title: 'Votre essai se termine bientôt',
            body: 'Plus que 3 jours d\'essai gratuit. Ajoutez votre carte pour garder accès à toutes les fonctionnalités.',
            link: '/settings',
            read: false,
          }).select();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
            is_trial_active: false,
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        // Trial → active transition: update tier to the actual plan from metadata
        let plan = sub.metadata?.plan;
        // TOLL FIX B6: Fallback — infer plan from price ID when metadata is missing
        if (!plan) {
          const priceId = sub.items.data[0]?.price?.id;
          // MONOLITH: Plus de plan Solo — 'solo' legacy → 'pro'
          if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) plan = 'pro';
          else if (priceId === process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID) plan = 'business';
          // Legacy: si quelqu'un avait encore un ancien prix Solo, le mapper vers Pro
          // LOI 3 FIX: Plus de plan Solo — tout legacy est mappé vers Pro
          // L'ancien STRIPE_SOLO_* n'est plus utilisé

          if (plan) {
            console.warn('[webhook] metadata.plan missing, inferred from price:', plan, 'for sub', sub.id);
          } else {
            console.warn('[webhook] metadata.plan missing AND price fallback failed for sub', sub.id, '- skipping update');
            break;
          }
        }
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;

        if (sub.status === 'active') {
          if (previousAttributes?.status === 'trialing') {
            // Trial just ended, subscription is now active
            await supabase.from('profiles')
              .update({
                subscription_tier: plan,
                is_trial_active: false,
              })
              .eq('stripe_subscription_id', sub.id);
          } else if (previousAttributes?.status === 'incomplete') {
            // New subscription payment confirmed — activate the plan
            await supabase.from('profiles')
              .update({ subscription_tier: plan })
              .eq('stripe_subscription_id', sub.id);
          } else {
            // Plan change or other update
            await supabase.from('profiles')
              .update({ subscription_tier: plan })
              .eq('stripe_subscription_id', sub.id);
          }
        } else if (['past_due', 'canceled', 'unpaid'].includes(sub.status)) {
          await supabase.from('profiles')
            .update({
              subscription_tier: 'free',
              is_trial_active: false,
            })
            .eq('stripe_subscription_id', sub.id);
        } else if (sub.status === 'trialing') {
          // ARGOS — synchro profil pendant l'essai (changement de plan opéré depuis le
          // portal Stripe en cours d'essai). Avant, ce statut n'était traité par aucune branche.
          await supabase.from('profiles')
            .update({
              subscription_tier: 'trial',
              is_trial_active: true,
              trial_selected_plan: plan,
            })
            .eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const subscriptionId = setupIntent.metadata?.subscriptionId;
        const userId = setupIntent.metadata?.userId;
        const plan = setupIntent.metadata?.plan || 'business';

        // GUARDIAN (CIBLE 4) — récupère l'empreinte carte (card.fingerprint) pour la
        // déduplication anti-fraude multi-comptes (même carte = essai unique).
        let cardFingerprint: string | null = null;
        if (setupIntent.payment_method) {
          try {
            const pm = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
            cardFingerprint = pm.card?.fingerprint ?? null;
          } catch {}
        }

        // GUARDIAN (CIBLE 4) — anti-doublon : la MÊME carte déjà utilisée pour un essai
        // sur un AUTRE compte = fraude. On annule l'abonnement et on n'active PAS l'essai.
        if (userId && cardFingerprint) {
          const { data: dup } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', userId)
            .eq('trial_card_fingerprint', cardFingerprint)
            .limit(1);

          if (dup && dup.length > 0) {
            console.warn('[webhook] GUARDIAN: carte réutilisée détectée (fraude essai) user=', userId);
            if (subscriptionId) {
              try { await stripe.subscriptions.cancel(subscriptionId); } catch {}
            }
            await supabase.from('profiles').update({
              is_trial_active: false,
              subscription_tier: 'free',
              stripe_subscription_id: null,
              has_used_trial: true,            // bloque tout nouvel essai sur ce compte
              trial_card_fingerprint: cardFingerprint,
            }).eq('id', userId);
            break; // pas d'activation de l'essai
          }
        }

        // Link the confirmed payment method to the trial subscription
        if (subscriptionId && setupIntent.payment_method) {
          await stripe.subscriptions.update(subscriptionId, {
            default_payment_method: setupIntent.payment_method as string,
          });
        }

        // Activate trial in profile now that the user has completed checkout
        // Use Stripe's trial dates to avoid divergence
        if (userId) {
          let trialStart = new Date().toISOString();
          let trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              if (sub.trial_start) trialStart = new Date(sub.trial_start * 1000).toISOString();
              if (sub.trial_end) trialEnd = new Date(sub.trial_end * 1000).toISOString();
            } catch {}
          }

          await supabase.from('profiles').update({
            trial_start_date: trialStart,
            trial_end_date: trialEnd,
            is_trial_active: true,
            subscription_tier: 'trial',
            has_used_trial: true,
            trial_selected_plan: plan,
            trial_card_fingerprint: cardFingerprint,
          }).eq('id', userId);
        }
        break;
      }

      case 'invoice.paid': {
        // Filet de sécurité : activer l'abonnement via stripe_customer_id
        // couvre le cas où stripe_subscription_id n'était pas encore en DB
        const inv = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;

        if (!subscriptionId || !customerId) break;

        // Récupérer le plan depuis les métadonnées de la souscription Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = subscription.metadata?.plan;

        if (!plan || subscription.status !== 'active') break;

        // Chercher par stripe_subscription_id d'abord, puis par stripe_customer_id
        const { data: profileBySub } = await supabase
          .from('profiles')
          .select('id, subscription_tier')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (profileBySub) {
          // Profil trouvé — s'assurer que le tier est bien à jour
          if (profileBySub.subscription_tier !== plan) {
            await supabase.from('profiles')
              .update({ subscription_tier: plan })
              .eq('id', profileBySub.id);
          }
        } else {
          // Fallback : trouver par customer_id et mettre à jour subscription_id + tier
          await supabase.from('profiles')
            .update({
              subscription_tier: plan,
              stripe_subscription_id: subscriptionId,
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId) {
          // Récupérer le profil par stripe_customer_id pour logguer l'échec
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            // Insérer une notification d'échec de paiement
            await supabase.from('notifications').insert({
              user_id: profile.id,
              type: 'system',
              title: 'Échec de paiement',
              body: `Le renouvellement de votre abonnement a échoué. Mettez à jour votre moyen de paiement.`,
              link: '/settings',
              read: false,
            }).select();
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          await supabase.from('invoices')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntentId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const piInvoiceId = resolveInvoiceIdFromMetadata(pi.metadata);
        // Marquer les factures SEPA en pending_payment comme payées quand le paiement aboutit
        if (piInvoiceId) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, status, number, user_id, total, client:clients(name)')
            .eq('id', piInvoiceId)
            .single();

          if (invoice && invoice.status === 'pending_payment') {
            await supabase.from('invoices')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: pi.id,
              })
              .eq('id', piInvoiceId);
          }
        }
        // Fallback: rechercher par payment_intent_id
        if (!piInvoiceId) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, status, number, user_id, total, client:clients(name)')
            .eq('stripe_payment_intent_id', pi.id)
            .single();

          if (invoice && invoice.status === 'pending_payment') {
            await supabase.from('invoices')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
              })
              .eq('id', invoice.id);
          }
        }
        break;
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        await supabase.from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_customer_id: null,
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customer.id);
        break;
      }
    }
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[webhook]', e.message);
    // LOI 10 : libérer le claim pour qu'un retry Stripe puisse retraiter l'événement
    // (sinon l'event serait marqué traité sans l'être → event perdu).
    try { await supabase.from('stripe_webhook_events').delete().eq('event_id', event.id); } catch { /* non-bloquant */ }
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }

  // LOI 10 : l'événement est déjà "claimé" (INSERT upfront) — traitement réussi → on garde le claim.
  return NextResponse.json({ received: true });
}
