import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getInvoiceEvents } from '@/lib/superPdpClient';

export const maxDuration = 60;

/**
 * GET|POST /api/cron/pdp-sync
 *
 * Cron job appelé par Vercel Cron (journalier) ET pg_cron (toutes les 10 min).
 * Synchronise le statut des factures transmises via Super PDP
 * en interrogeant les événements de cycle de vie (CDAR).
 *
 * Super PDP n'a pas de webhooks → polling nécessaire.
 *
 * Sécurisé par CRON_SECRET.
 *
 * Codes de statut français (CDAR) :
 *   fr:204 = Acceptation par le destinataire
 *   fr:205 = Refus par le destinataire
 *   fr:206 = Accord sur le montant à payer
 *   fr:207 = Refus sur le montant à payer
 *   fr:208 = Demande de copie
 *   fr:209 = Suspension contentieuse
 *   fr:210 = Rejet contentieux
 *   fr:211 = Levée de suspension
 *   fr:212 = Paiement (encaissée) — avec détails du montant
 */
export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  // ── Sécurité : vérifier le CRON_SECRET ─────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret')
    || req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  console.log('[pdp-sync] Début de la synchronisation des statuts...');

  try {
    const admin = createAdminClient();

    // ── Trouver toutes les factures transmises à synchroniser ─────────────
    // On ne sync que les factures dont le statut PDP est 'transmitted'
    // et qui ont un pdp_transmission_id valide
    const { data: transmittedInvoices, error: fetchError } = await admin
      .from('invoices')
      .select('id, user_id, number, pdp_transmission_id, pdp_transmitted_at, status')
      .eq('pdp_status', 'transmitted')
      .not('pdp_transmission_id', 'is', null)
      .limit(100); // Traiter par batch de 100

    if (fetchError) {
      console.error('[pdp-sync] Erreur fetch:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!transmittedInvoices || transmittedInvoices.length === 0) {
      console.log('[pdp-sync] Aucune facture transmise à synchroniser');
      return NextResponse.json({ synced: 0, message: 'Aucune facture à synchroniser' });
    }

    console.log('[pdp-sync] Trouvé', transmittedInvoices.length, 'factures transmises à vérifier');

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // ── Pour chaque facture, interroger les événements Super PDP ──────────
    for (const inv of transmittedInvoices) {
      try {
        if (!inv.pdp_transmission_id) continue;

        // Récupérer les événements depuis Super PDP
        const eventsResult = await getInvoiceEvents(inv.pdp_transmission_id);

        if (!eventsResult.events || eventsResult.events.length === 0) {
          syncedCount++;
          continue; // Pas d'événements = pas de changement de statut
        }

        // Prendre le dernier événement (le plus récent)
        const latestEvent = eventsResult.events[eventsResult.events.length - 1];
        const statusCode = latestEvent.statusCode?.toLowerCase() || '';

        // ── Mapper les statuts Super PDP → statuts factu.me ───────────────
        // Les codes SuperPDP sont au format "fr:204" à "fr:212" pour la France.
        // On garde aussi les codes anglais en fallback pour compatibilité future.
        let newInvoiceStatus: string | null = null;
        let newPdpStatus: string | null = null;

        // Normaliser : "FR:204" → "fr:204"
        const code = statusCode.startsWith('fr:') ? statusCode : statusCode;

        switch (code) {
          // fr:204 = Acceptation par le destinataire
          case 'fr:204':
          case 'accepted':
          case 'accepted_by_receiver':
            if (inv.status === 'sent') {
              newInvoiceStatus = 'accepted';
            }
            break;

          // fr:205 = Refus par le destinataire
          case 'fr:205':
          case 'refused':
          case 'rejected_by_receiver':
            if (inv.status === 'sent' || inv.status === 'accepted') {
              newInvoiceStatus = 'refused';
            }
            break;

          // fr:206 = Accord sur montant à payer (acceptation partielle)
          case 'fr:206':
            if (inv.status === 'sent') {
              newInvoiceStatus = 'accepted';
            }
            break;

          // fr:207 = Refus sur montant à payer
          case 'fr:207':
            if (inv.status === 'sent' || inv.status === 'accepted') {
              newInvoiceStatus = 'refused';
            }
            break;

          // fr:208 = Demande de copie (pas de changement de statut)
          case 'fr:208':
            console.log('[pdp-sync] Demande de copie pour facture', inv.number);
            break;

          // fr:209 = Suspension contentieuse
          case 'fr:209':
          case 'disputed':
            console.log('[pdp-sync] Suspension contentieuse pour facture', inv.number);
            // On ne change pas le statut automatiquement pour un litige
            break;

          // fr:210 = Rejet contentieux
          case 'fr:210':
            if (inv.status === 'sent' || inv.status === 'accepted') {
              newInvoiceStatus = 'refused';
            }
            break;

          // fr:211 = Levée de suspension
          case 'fr:211':
            console.log('[pdp-sync] Levée de suspension pour facture', inv.number);
            break;

          // fr:212 = Paiement (encaissée)
          case 'fr:212':
          case 'paid':
          case 'payment_received':
            if (inv.status !== 'paid' && inv.status !== 'refunded') {
              newInvoiceStatus = 'paid';
            }
            break;

          // Erreur technique côté PDP
          case 'error':
          case 'technical_rejection':
            newPdpStatus = 'failed';
            break;

          default:
            // Statut non géré, on loggue mais on ne fait rien
            console.log('[pdp-sync] Statut non géré:', code, 'pour facture', inv.number);
            break;
        }

        // ── Mettre à jour la DB si nécessaire ─────────────────────────────
        const updates: Record<string, any> = {
          updated_at: new Date().toISOString(),
          einvoice_status_checked_at: new Date().toISOString(),
        };

        if (newInvoiceStatus) {
          updates.status = newInvoiceStatus;

          // Ajouter les timestamps selon le nouveau statut
          if (newInvoiceStatus === 'paid') {
            updates.paid_at = new Date().toISOString();
          }
        }

        if (newPdpStatus) {
          updates.pdp_status = newPdpStatus;
          updates.pdp_last_error = latestEvent.description || `Statut PDP: ${code}`;
        }

        // N'update que si on a des changements
        if (Object.keys(updates).length > 2) { // > 2 car updated_at + einvoice_status_checked_at toujours présents
          await admin
            .from('invoices')
            .update(updates)
            .eq('id', inv.id);

          updatedCount++;
          console.log('[pdp-sync] Facture', inv.number, 'mise à jour:',
            newInvoiceStatus ? `status→${newInvoiceStatus}` : '',
            newPdpStatus ? `pdp→${newPdpStatus}` : ''
              .trim() || 'metadata only');

          // ── Logger dans l'audit trail ────────────────────────────────────
          await admin
            .from('invoice_audit_trail')
            .insert({
              invoice_id: inv.id,
              user_id: inv.user_id,
              action: `pdp_sync:${code}`,
              from_status: inv.status,
              to_status: newInvoiceStatus || inv.status,
              metadata: {
                superpdp_event_id: latestEvent.id,
                superpdp_status_code: code,
                superpdp_description: latestEvent.description,
                sync_source: 'pdp-sync-cron',
              },
            });

          // ── Mettre à jour pdp_transmissions si la table est utilisée ─────
          await admin
            .from('pdp_transmissions')
            .update({
              status: code,
              acknowledged_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              validation_details: {
                last_sync_event: latestEvent,
                sync_source: 'pdp-sync-cron',
              },
            })
            .eq('invoice_id', inv.id);
        }

        syncedCount++;

        // Respecter le rate limit Super PDP (30 req/sec → 100ms entre chaque)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error('[pdp-sync] Exception pour facture', inv.id, ':', error.message);
        errorCount++;
      }
    }

    const summary = {
      total: transmittedInvoices.length,
      synced: syncedCount,
      updated: updatedCount,
      errors: errorCount,
    };

    console.log('[pdp-sync] Résumé:', summary);
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('[pdp-sync] Erreur fatale:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
