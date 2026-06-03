import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { transmitInvoice, isRetryableError, TransmitResult } from '@/lib/superPdpClient';
import { isFacturXEligible } from '@/lib/facturx';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

export const maxDuration = 60;

const TransmitSchema = z.object({
  invoiceId: z.string().uuid('ID de facture invalide'),
});

/**
 * POST /api/invoices/transmit
 *
 * Transmet une facture électroniquement via Super PDP.
 * Peut être appelé :
 * - Manuellement par l'utilisateur (bouton "Transmettre légalement")
 * - Automatiquement après l'envoi d'email
 * - Par le cron de retry
 */
export async function POST(req: NextRequest) {
  // Rate limiting : 10 requêtes/minute (transmission légale = plus sensible)
  const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60000 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes de transmission. Réessayez dans quelques instants.' },
      { status: 429 }
    );
  }

  try {
    // ── Authentification ───────────────────────────────────────────────────
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ── Validation ─────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const parsed = TransmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.errors }, { status: 400 });
    }

    const { invoiceId } = parsed.data;
    const admin = createAdminClient();

    // ── Récupération facture + profil ──────────────────────────────────────
    const [
      { data: invoice, error: invError },
      { data: profile },
    ] = await Promise.all([
      admin
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single(),
      admin.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profil utilisateur introuvable' }, { status: 404 });
    }

    // ── Vérification abonnement ────────────────────────────────────────────
    const tier = profile.subscription_tier || 'free';
    const isTrialActive = profile.is_trial_active || false;
    const hasAccess = isTrialActive || tier === 'pro' || tier === 'business';

    if (!hasAccess) {
      return NextResponse.json({
        error: 'La transmission électronique nécessite un abonnement Pro ou Business.',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    // ── Vérification non déjà transmise ────────────────────────────────────
    if (invoice.pdp_transmission_id && invoice.pdp_status === 'transmitted') {
      return NextResponse.json({
        success: true,
        message: 'Facture déjà transmise',
        superPdpId: invoice.pdp_transmission_id,
        alreadyTransmitted: true,
      });
    }

    // ── Vérification type de document ──────────────────────────────────────
    if (!['invoice', 'credit_note', 'deposit'].includes(invoice.document_type)) {
      return NextResponse.json({
        error: `Les "${invoice.document_type}" ne peuvent pas être transmis électroniquement. Seuls les factures, avoirs et acomptes sont éligibles.`,
      }, { status: 400 });
    }

    // ── Transmission via Super PDP ─────────────────────────────────────────
    console.log('[transmit] Transmission facture', invoice.number, 'via Super PDP...');

    // Marquer comme "en cours de transmission"
    await admin
      .from('invoices')
      .update({
        pdp_status: 'transmitting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    const result: TransmitResult = await transmitInvoice(invoice, profile);

    // ── Mise à jour base de données ────────────────────────────────────────
    if (result.success) {
      await admin
        .from('invoices')
        .update({
          pdp_transmission_id: result.superPdpId,
          pdp_status: 'transmitted',
          pdp_last_error: null,
          pdp_transmitted_at: new Date().toISOString(),
          pdp_retry_count: 0,
          pdp_next_retry_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      console.log('[transmit] Facture', invoice.number, 'transmise avec succès. ID:', result.superPdpId);

      return NextResponse.json({
        success: true,
        superPdpId: result.superPdpId,
        status: result.status,
        message: `Facture ${invoice.number} transmise légalement via PDP agréée`,
      });

    } else {
      // Déterminer si c'est retryable
      const retryable = isRetryableError(result);
      const retryCount = (invoice.pdp_retry_count || 0) + 1;
      const maxRetries = 6; // ~1h de retry (10 min × 6)

      const updateData: Record<string, any> = {
        pdp_status: retryable && retryCount < maxRetries ? 'pending_retry' : 'failed',
        pdp_last_error: result.error,
        pdp_retry_count: retryCount,
        updated_at: new Date().toISOString(),
      };

      if (retryable && retryCount < maxRetries) {
        // Prochain retry dans 10 minutes
        const nextRetry = new Date(Date.now() + 10 * 60 * 1000);
        updateData.pdp_next_retry_at = nextRetry.toISOString();
      }

      await admin
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      console.error('[transmit] Échec transmission facture', invoice.number, ':', result.error);

      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        validationDetails: result.validationDetails,
        retryable,
        retryCount,
      }, { status: retryable ? 503 : 400 });
    }

  } catch (error: any) {
    console.error('[transmit] Erreur inattendue:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erreur interne lors de la transmission' },
      { status: 500 }
    );
  }
}
