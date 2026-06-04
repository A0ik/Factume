import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { getInvoiceEvents } from '@/lib/superPdpClient';

/**
 * GET /api/invoices/[id]/einvoice-status
 *
 * Vérifie le statut e-invoicing d'une facture en temps réel.
 * - Si la facture n'a pas de tracking ID SuperPDP → retourne not_submitted
 * - Si le statut a été vérifié il y a moins de 2 min → retourne le cache
 * - Sinon → interroge SuperPDP, met à jour la DB, retourne le statut
 *
 * Sécurisé par authentification utilisateur (JWT Supabase).
 */

// Cache TTL : 2 minutes en millisecondes
const CACHE_TTL_MS = 2 * 60 * 1000;

// Statuts terminaux — pas besoin de re-vérifier
const TERMINAL_STATUSES = new Set(['accepted', 'refused', 'paid', 'failed']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    // ── Authentification utilisateur ──────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ── Récupérer la facture ──────────────────────────────────────────────
    const admin = createAdminClient();

    const { data: invoice, error: fetchError } = await admin
      .from('invoices')
      .select('id, user_id, number, status, pdp_status, pdp_transmission_id, pdp_last_error, pdp_transmitted_at')
      .eq('id', invoiceId)
      .eq('user_id', user.id) // Sécurité : l'utilisateur ne peut voir que ses factures
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // ── Si pas de transmission PDP → statut immédiat ─────────────────────
    if (!invoice.pdp_transmission_id) {
      return NextResponse.json({
        pdp_status: invoice.pdp_status || 'not_submitted',
        invoice_status: invoice.status,
        checked_at: null,
        source: 'local',
      });
    }

    // ── Si la facture est dans un état terminal → pas besoin de polling ──
    if (invoice.pdp_status === 'failed' || TERMINAL_STATUSES.has(invoice.status)) {
      return NextResponse.json({
        pdp_status: invoice.pdp_status,
        invoice_status: invoice.status,
        pdp_last_error: invoice.pdp_last_error,
        pdp_transmission_id: invoice.pdp_transmission_id,
        pdp_transmitted_at: invoice.pdp_transmitted_at,
        checked_at: new Date().toISOString(),
        source: 'terminal',
      });
    }

    // ── Vérifier le cache (2 min) ─────────────────────────────────────────
    // On utilise un check basé sur la dernière sync de cette facture
    // La colonne updated_at sert de proxy en attendant einvoice_status_checked_at
    const updatedAt = invoice.pdp_transmitted_at;
    if (updatedAt) {
      const ageMs = Date.now() - new Date(updatedAt).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return NextResponse.json({
          pdp_status: invoice.pdp_status,
          invoice_status: invoice.status,
          pdp_transmission_id: invoice.pdp_transmission_id,
          pdp_transmitted_at: invoice.pdp_transmitted_at,
          checked_at: updatedAt,
          source: 'cached',
          cache_age_ms: ageMs,
        });
      }
    }

    // ── Polling en temps réel depuis SuperPDP ─────────────────────────────
    console.log('[einvoice-status] Polling SuperPDP pour facture', invoice.number);

    const eventsResult = await getInvoiceEvents(invoice.pdp_transmission_id);

    if (!eventsResult.events || eventsResult.events.length === 0) {
      // Pas d'événements = facture toujours en transit
      return NextResponse.json({
        pdp_status: invoice.pdp_status,
        invoice_status: invoice.status,
        pdp_transmission_id: invoice.pdp_transmission_id,
        pdp_transmitted_at: invoice.pdp_transmitted_at,
        checked_at: new Date().toISOString(),
        source: 'polled_no_events',
      });
    }

    // Prendre le dernier événement
    const latestEvent = eventsResult.events[eventsResult.events.length - 1];
    const rawCode = latestEvent.statusCode?.toLowerCase() || '';
    const code = rawCode.startsWith('fr:') ? rawCode : rawCode;

    // ── Mapper le statut ──────────────────────────────────────────────────
    let newInvoiceStatus: string | null = null;
    let newPdpStatus: string | null = null;

    switch (code) {
      case 'fr:204': // Acceptation
      case 'accepted':
        newInvoiceStatus = invoice.status === 'sent' ? 'accepted' : null;
        break;
      case 'fr:205': // Refus
      case 'fr:207': // Refus sur montant
      case 'fr:210': // Rejet contentieux
      case 'refused':
        newInvoiceStatus = ['sent', 'accepted'].includes(invoice.status) ? 'refused' : null;
        break;
      case 'fr:212': // Paiement
      case 'paid':
        newInvoiceStatus = !['paid', 'refunded'].includes(invoice.status) ? 'paid' : null;
        break;
      case 'error':
      case 'technical_rejection':
        newPdpStatus = 'failed';
        break;
    }

    // ── Mettre à jour la DB si changement ─────────────────────────────────
    if (newInvoiceStatus || newPdpStatus) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (newInvoiceStatus) {
        updates.status = newInvoiceStatus;
        if (newInvoiceStatus === 'paid') updates.paid_at = new Date().toISOString();
      }

      if (newPdpStatus) {
        updates.pdp_status = newPdpStatus;
        updates.pdp_last_error = latestEvent.description || `Statut PDP: ${code}`;
      }

      await admin.from('invoices').update(updates).eq('id', invoiceId);

      // Audit trail
      await admin.from('invoice_audit_trail').insert({
        invoice_id: invoiceId,
        user_id: user.id,
        action: `pdp_sync:${code}`,
        from_status: invoice.status,
        to_status: newInvoiceStatus || invoice.status,
        metadata: {
          superpdp_event_id: latestEvent.id,
          superpdp_status_code: code,
          superpdp_description: latestEvent.description,
          sync_source: 'on-demand-poll',
        },
      });

      // Mettre à jour les valeurs locales pour la réponse
      if (newInvoiceStatus) invoice.status = newInvoiceStatus;
      if (newPdpStatus) invoice.pdp_status = newPdpStatus;
    }

    return NextResponse.json({
      pdp_status: invoice.pdp_status,
      invoice_status: invoice.status,
      pdp_transmission_id: invoice.pdp_transmission_id,
      pdp_transmitted_at: invoice.pdp_transmitted_at,
      pdp_last_error: invoice.pdp_last_error,
      latest_event: {
        code,
        description: latestEvent.description,
        created_at: latestEvent.createdAt,
      },
      checked_at: new Date().toISOString(),
      source: 'polled',
    });

  } catch (error: any) {
    console.error('[einvoice-status] Erreur:', error.message);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut e-invoicing' },
      { status: 500 }
    );
  }
}
