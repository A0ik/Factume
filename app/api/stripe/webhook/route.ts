import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

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
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle regular invoice payment (metadata.invoiceId)
        if (session.mode === 'payment' && session.metadata?.invoiceId) {
          const { data: invoice } = await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', session.metadata.invoiceId)
            .select('*, client:client_id(name)')
            .single();

          // Créer une notification pour l'utilisateur
          if (invoice && session.metadata?.userId) {
            await supabase.from('notifications').insert({
              user_id: session.metadata.userId,
              type: 'invoice_paid',
              title: `Facture payée — ${invoice.number}`,
              body: `La facture de ${invoice.total?.toFixed(2) || '0'}€ de ${invoice.client?.name || 'un client'} a été payée avec succès.`,
              link: `/invoices/${invoice.id}`,
            });
          }
        }

        // Handle Stripe Connect payment link completion (metadata.invoice_id)
        else if (session.mode === 'payment' && session.metadata?.invoice_id) {
          const invoiceId = session.metadata.invoice_id;
          const userId = session.metadata.user_id;

          // Update invoice status
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq('id', invoiceId);

          // Get invoice details for notification
          const { data: invoice } = await supabase
            .from('invoices')
            .select('*, client:clients(name)')
            .eq('id', invoiceId)
            .single();

          if (invoice && userId) {
            // Create notification
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'invoice_paid',
              title: `Facture payée — ${invoice.number}`,
              body: `La facture de ${invoice.total?.toFixed(2) || '0'}€ de ${invoice.client?.name || 'un client'} a été payée via Stripe.`,
              link: `/invoices/${invoiceId}`,
            });
          }
        }

        // Handle subscription activation
        if (session.mode === 'subscription' && session.metadata?.userId) {
          const plan = session.metadata.plan as string;
          await supabase.from('profiles').update({
            subscription_tier: plan,
            stripe_subscription_id: session.subscription as string,
          }).eq('id', session.metadata.userId);
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
        const plan = sub.metadata?.plan || 'free';
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
        }
        break;
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const subscriptionId = setupIntent.metadata?.subscriptionId;
        const userId = setupIntent.metadata?.userId;
        const plan = setupIntent.metadata?.plan || 'business';

        // Link the confirmed payment method to the trial subscription
        if (subscriptionId && setupIntent.payment_method) {
          await stripe.subscriptions.update(subscriptionId, {
            default_payment_method: setupIntent.payment_method as string,
          });
        }

        // Activate trial in profile now that the user has completed checkout
        if (userId) {
          await supabase.from('profiles').update({
            trial_start_date: new Date().toISOString(),
            trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            is_trial_active: true,
            subscription_tier: 'trial',
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
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
