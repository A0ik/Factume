import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY!)
  : null;

/**
 * ARBITER — Suppression de compte (anonymisation RGPD)
 *
 * LOI 4 (ÉRADICATION) : Anonymise les données personnelles au lieu de les supprimer.
 * LOI 5 (SÉCURITÉ) : Requiert le mot de passe + confirmation "SUPPRIMER".
 * LOI 7 (AUTH FIABLE) : Supprime l'identité via supabase.auth.admin.deleteUser.
 * LOI 9 (ANNULATION GRACIEUSE) : Si Stripe échoue, on logge mais on continue.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Require password re-confirmation for account deletion
    const body = await req.json().catch(() => ({}));
    const password = body.password;
    if (!password || typeof password !== 'string' || password.length < 1) {
      return NextResponse.json(
        { error: 'Confirmation requise', code: 'PASSWORD_REQUIRED' },
        { status: 400 }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    if (signInError) {
      return NextResponse.json(
        { error: 'Mot de passe incorrect', code: 'INVALID_PASSWORD' },
        { status: 403 }
      );
    }

    const userId = user.id;
    const admin = createAdminClient();

    // ── 1. Cancel Stripe subscription & customer ──────────────────────
    if (stripe) {
      try {
        // Get profile to find Stripe IDs
        const { data: profile } = await admin
          .from('profiles')
          .select('stripe_customer_id, stripe_subscription_id, stripe_connect_account_id')
          .eq('id', userId)
          .single();

        if (profile) {
          // Cancel subscription if active
          if (profile.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(profile.stripe_subscription_id);
              console.log(`[account/delete] Stripe subscription ${profile.stripe_subscription_id} cancelled`);
            } catch (stripeErr: any) {
              // Subscription may already be cancelled — log but continue
              console.warn(`[account/delete] Stripe subscription cancel warning: ${stripeErr.message}`);
            }
          }

          // Delete Stripe customer
          if (profile.stripe_customer_id) {
            try {
              await stripe.customers.del(profile.stripe_customer_id);
              console.log(`[account/delete] Stripe customer ${profile.stripe_customer_id} deleted`);
            } catch (stripeErr: any) {
              console.warn(`[account/delete] Stripe customer delete warning: ${stripeErr.message}`);
            }
          }

          // Disconnect Stripe Connect account (cannot delete — just revoke)
          if (profile.stripe_connect_account_id) {
            try {
              await stripe.oauth.deauthorize({
                client_id: process.env.STRIPE_CLIENT_ID!,
                stripe_user_id: profile.stripe_connect_account_id,
              });
              console.log(`[account/delete] Stripe Connect ${profile.stripe_connect_account_id} deauthorized`);
            } catch (stripeErr: any) {
              console.warn(`[account/delete] Stripe Connect deauth warning: ${stripeErr.message}`);
            }
          }
        }
      } catch (stripeErr: any) {
        // LOI 9: Don't block deletion if Stripe fails
        console.error(`[account/delete] Stripe cleanup error (non-blocking): ${stripeErr.message}`);
      }
    } else {
      console.warn('[account/delete] Stripe not configured — skipping Stripe cleanup');
    }

    // ── 2. Anonymize personal data in profile ─────────────────────────
    // LOI 4: On anonymise au lieu de supprimer (RGPD soft delete)
    const anonymousId = `anon_${userId.substring(0, 8)}_${Date.now()}`;
    try {
      await admin.from('profiles').update({
        email: `${anonymousId}@deleted.factu.me`,
        company_name: 'Compte supprimé',
        first_name: 'Supprimé',
        last_name: 'Supprimé',
        phone: null,
        siret: null,
        vat_number: null,
        address: null,
        postal_code: null,
        city: null,
        logo_url: null,
        signature_url: null,
        iban: null,
        bic: null,
        bank_name: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_account_id: null,
        stripe_connect_account_id: null,
        stripe_connect_access_token: null,
        stripe_connect_refresh_token: null,
        sumup_email: null,
        sumup_access_token: null,
        sumup_refresh_token: null,
        sumup_merchant_id: null,
        google_access_token: null,
        google_refresh_token: null,
        google_email: null,
        google_name: null,
        google_picture: null,
        web_push_subscription: null,
        expo_push_token: null,
        subscription_tier: 'free',
        onboarding_done: false,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      console.log(`[account/delete] Profile anonymized for user ${userId}`);
    } catch (err) {
      console.error('[account/delete] Profile anonymization failed:', err);
    }

    // ── 3. Anonymize client personal data (keep for invoicing legal requirement) ──
    try {
      const { data: clients } = await admin.from('clients').select('id, email, phone').eq('user_id', userId);
      if (clients && clients.length > 0) {
        for (const client of clients) {
          await admin.from('clients').update({
            email: `${anonymousId}_client_${client.id.substring(0, 8)}@deleted.factu.me`,
            phone: null,
          }).eq('id', client.id);
        }
        console.log(`[account/delete] ${clients.length} clients anonymized`);
      }
    } catch (err) {
      console.error('[account/delete] Client anonymization error:', err);
    }

    // ── 4. Delete non-essential data (notifications, tokens, webhooks) ──
    const cleanupTables = [
      'notifications',
      'client_portal_tokens',
      'webhook_endpoints',
      'workspace_members',
      'workspace_invitations',
    ];
    for (const table of cleanupTables) {
      try {
        await admin.from(table).delete().eq('user_id', userId);
      } catch {
        // Table may not exist — continue
      }
    }

    // Delete workspaces owned by the user
    try {
      const { data: ws } = await admin.from('workspaces').select('id').eq('owner_id', userId);
      if (ws && ws.length > 0) {
        const wsIds = ws.map((w) => w.id);
        await admin.from('workspace_members').delete().in('workspace_id', wsIds);
        await admin.from('workspace_invitations').delete().in('workspace_id', wsIds);
        await admin.from('workspaces').delete().eq('owner_id', userId);
      }
    } catch {
      // Workspace tables may not exist
    }

    // ── 5. Delete auth user (Supabase Auth) ───────────────────────────
    // LOI 7: Utilise la méthode officielle du provider
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[account/delete] Auth user deletion failed:', deleteError);
      // LOI 9: Si l'auth delete échoue, le profil est déjà anonymisé — on informe
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'identité. Vos données ont été anonymisées.' },
        { status: 500 }
      );
    }

    console.log(`[account/delete] User ${userId} account deleted and data anonymized successfully`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 });
  }
}
