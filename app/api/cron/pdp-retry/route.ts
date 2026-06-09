import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { transmitInvoice, isRetryableError } from '@/lib/superPdpClient';

export const maxDuration = 60;

/**
 * GET|POST /api/cron/pdp-retry
 *
 * Cron job appelé par Vercel Cron (journalier) ET pg_cron (toutes les 10 min).
 * Retransmet les factures en échec temporaire (pending_retry).
 *
 * Sécurisé par CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  return handleRetry(req);
}

export async function POST(req: NextRequest) {
  return handleRetry(req);
}

async function handleRetry(req: NextRequest) {
  // ── Sécurité : vérifier le CRON_SECRET ─────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret')
    || req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  console.log('[pdp-retry] Début du cron de retry...');

  try {
    const admin = createAdminClient();

    // ── Trouver les factures en attente de retry ──────────────────────────
    const now = new Date().toISOString();

    const { data: pendingInvoices, error: fetchError } = await admin
      .from('invoices')
      .select('id, user_id, number, pdp_retry_count, pdp_next_retry_at')
      .eq('pdp_status', 'pending_retry')
      .lte('pdp_next_retry_at', now)
      .limit(50); // Traiter par batch de 50

    if (fetchError) {
      console.error('[pdp-retry] Erreur fetch:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingInvoices || pendingInvoices.length === 0) {
      console.log('[pdp-retry] Aucune facture en attente de retry');
      return NextResponse.json({ processed: 0, message: 'Aucune facture à retransmettre' });
    }

    console.log('[pdp-retry] Trouvé', pendingInvoices.length, 'factures à retransmettre');

    let successCount = 0;
    let failCount = 0;
    let exhaustedCount = 0;

    // ── Retransmettre chaque facture ──────────────────────────────────────
    for (const inv of pendingInvoices) {
      try {
        // Récupérer la facture complète + profil
        const [
          { data: invoice },
          { data: profile },
        ] = await Promise.all([
          admin
            .from('invoices')
            .select('*, client:clients(*)')
            .eq('id', inv.id)
            .single(),
          admin
            .from('profiles')
            .select('*')
            .eq('id', inv.user_id)
            .single(),
        ]);

        if (!invoice || !profile) {
          console.warn('[pdp-retry] Facture ou profil introuvable:', inv.id);
          continue;
        }

        // Transmettre
        const result = await transmitInvoice(invoice, profile);

        const retryCount = (inv.pdp_retry_count || 0) + 1;
        const maxRetries = 6;

        if (result.success) {
          // Succès !
          await admin
            .from('invoices')
            .update({
              pdp_transmission_id: result.superPdpId,
              pdp_status: 'transmitted',
              pdp_last_error: null,
              pdp_transmitted_at: new Date().toISOString(),
              pdp_retry_count: retryCount,
              pdp_next_retry_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inv.id);

          successCount++;
          console.log('[pdp-retry] Facture', inv.number, 'retransmise avec succès');

        } else {
          const retryable = isRetryableError(result);

          if (retryable && retryCount < maxRetries) {
            // Encore retryable
            const nextRetry = new Date(Date.now() + 10 * 60 * 1000);
            await admin
              .from('invoices')
              .update({
                pdp_status: 'pending_retry',
                pdp_last_error: result.error,
                pdp_retry_count: retryCount,
                pdp_next_retry_at: nextRetry.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', inv.id);

            failCount++;
            console.warn('[pdp-retry] Facture', inv.number, 'retry', retryCount, '/', maxRetries);

          } else {
            // Échec définitif
            await admin
              .from('invoices')
              .update({
                pdp_status: 'failed',
                pdp_last_error: result.error,
                pdp_retry_count: retryCount,
                pdp_next_retry_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', inv.id);

            exhaustedCount++;
            console.error('[pdp-retry] Facture', inv.number, 'échec définitif après', retryCount, 'tentatives');
          }
        }

        // Respecter le rate limit Super PDP (30 req/sec → on attend 100ms entre chaque)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error('[pdp-retry] Exception pour facture', inv.id, ':', error.message);
        failCount++;
      }
    }

    const summary = {
      processed: pendingInvoices.length,
      success: successCount,
      retryLater: failCount,
      exhausted: exhaustedCount,
    };

    console.log('[pdp-retry] Résumé:', summary);
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('[pdp-retry] Erreur fatale:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
