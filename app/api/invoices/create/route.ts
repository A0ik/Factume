import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { calculateInvoiceTotals } from '@/lib/money';
import { transmitInvoice, isRetryableError } from '@/lib/superPdpClient';
import { isInvoiceB2B } from '@/lib/tva-validator';
import { getUserSubscriptionStatus, requireLimit } from '@/lib/subscription-guard';
import type { NextRequest } from 'next/server';

// SENTINEL (URGENCE 1) : autoriser jusqu'à 60s pour que la transmission e-facturation
// B2B (SuperPDP) ne soit pas coupée par la limite serverless par défaut (~10s), ce qui
// faisait échouer/raccourcir la création de factures B2B avant la réponse.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // LOI 9 : seuil entreprise — ne pas bloquer la création légitime (était 20/min)
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Subscription gate: check invoicesPerMonth limit
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireLimit(sub, 'invoicesPerMonth', sub.monthlyInvoiceCount);
    } catch (err: any) {
      const [, limit, message] = err.message.split(':');
      return NextResponse.json({
        error: message || 'Limite atteinte.',
        code: 'LIMIT_REACHED',
        limit,
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const tier = sub.tier;

    const body = await req.json();
    const {
      client_id, client_name_override, document_type, issue_date, due_date,
      items, subtotal, vat_amount, discount_percent, discount_amount, total,
      notes, prefix, linked_invoice_id, idempotency_id, client_type,
      client_siret, client_vat_number, client_email, client_phone,
      client_address, client_city, client_postal_code, payment_terms
    } = body;

    // FIX GAP-6: Validation serveur de la date d'émission (anti-antidatage)
    if (issue_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const issueDate = new Date(issue_date);
      issueDate.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (issueDate < yesterday) {
        return NextResponse.json({ error: 'Date d\'émission invalide : antidatage détecté.' }, { status: 400 });
      }
      if (issueDate > today) {
        return NextResponse.json({ error: 'Date d\'émission invalide : la date ne peut pas être dans le futur.' }, { status: 400 });
      }
    }

    // Server-side validation of items and amounts
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'La facture doit contenir au moins une ligne.' }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 lignes par facture.' }, { status: 400 });
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 99999) {
        return NextResponse.json({ error: `Ligne ${i + 1} : quantité invalide.` }, { status: 400 });
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0 || item.unit_price > 9999999) {
        return NextResponse.json({ error: `Ligne ${i + 1} : prix unitaire invalide.` }, { status: 400 });
      }
      if (typeof item.vat_rate !== 'number' || item.vat_rate < 0 || item.vat_rate > 100) {
        return NextResponse.json({ error: `Ligne ${i + 1} : taux TVA invalide.` }, { status: 400 });
      }
      // FIX BUG-EDGE-02: Valider le discount_percent par ligne (0-100)
      if (item.discount_percent !== undefined && item.discount_percent !== null) {
        if (typeof item.discount_percent !== 'number' || item.discount_percent < 0 || item.discount_percent > 100) {
          return NextResponse.json({ error: `Ligne ${i + 1} : remise invalide (0-100%).` }, { status: 400 });
        }
      }
      // Validate each item's total matches quantity * unit_price
      const expectedTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      if (item.total !== undefined && Math.abs(item.total - expectedTotal) > 0.02) {
        return NextResponse.json({ error: `Ligne "${item.description || `Ligne ${i + 1}`}": total incohérent avec quantité × prix unitaire.` }, { status: 400 });
      }
    }
    if (typeof total !== 'number' || total < -99999999 || total > 99999999) {
      return NextResponse.json({ error: 'Montant total invalide.' }, { status: 400 });
    }
    if (discount_percent !== null && discount_percent !== undefined && (discount_percent < 0 || discount_percent > 100)) {
      return NextResponse.json({ error: 'Pourcentage de remise invalide.' }, { status: 400 });
    }

    // FIX BUG-EDGE-03: Client obligatoire (au moins un identifiant)
    if (!client_id && !client_name_override?.trim()) {
      return NextResponse.json({ error: 'Un client est requis pour créer une facture.' }, { status: 400 });
    }

    // FIX BUG-AVOIR-02: Pour les avoirs, valider le signe et le lien
    if (document_type === 'credit_note') {
      if (!linked_invoice_id) {
        return NextResponse.json({ error: 'Un avoir doit être lié à une facture originale. Art. L.441-9 du Code de commerce.' }, { status: 400 });
      }
      // Vérifier que la facture originale existe et appartient à l'utilisateur
      const { data: originalInvoice } = await supabase
        .from('invoices')
        .select('id, total, status')
        .eq('id', linked_invoice_id)
        .eq('user_id', user.id)
        .single();
      if (!originalInvoice) {
        return NextResponse.json({ error: 'Facture originale introuvable.' }, { status: 404 });
      }
      // Vérifier le montant cumulé des avoirs existants
      const { data: existingCredits } = await supabase
        .from('invoices')
        .select('total')
        .eq('linked_invoice_id', linked_invoice_id)
        .eq('document_type', 'credit_note')
        .neq('status', 'cancelled');
      const existingCreditTotal = (existingCredits || []).reduce((sum: number, inv: any) => sum + Math.abs(inv.total), 0);
      if (existingCreditTotal + Math.abs(total) > Math.abs(originalInvoice.total) + 0.01) {
        return NextResponse.json({
          error: `Le montant total des avoirs (${(existingCreditTotal + Math.abs(total)).toFixed(2)} EUR) dépasse la facture originale (${Math.abs(originalInvoice.total).toFixed(2)} EUR).`
        }, { status: 400 });
      }
    }

    // BUG-11 fix: Validate string lengths and sanitize HTML
    if (client_name_override && client_name_override.length > 200) {
      return NextResponse.json({ error: 'Nom du client trop long (max 200 caractères).' }, { status: 400 });
    }
    if (notes && notes.length > 5000) {
      return NextResponse.json({ error: 'Notes trop longues (max 5000 caractères).' }, { status: 400 });
    }
    if (notes) {
      body.notes = notes.replace(/<[^>]*>/g, '');
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].description || !items[i].description.trim()) {
        return NextResponse.json({ error: `Ligne ${i + 1} : description requise.` }, { status: 400 });
      }
      if (items[i].description.length > 500) {
        return NextResponse.json({ error: `Ligne ${i + 1} : description trop longue (max 500 caractères).` }, { status: 400 });
      }
      if (!Number.isFinite(items[i].quantity) || items[i].quantity < 0.01) {
        return NextResponse.json({ error: `Ligne ${i + 1} : quantité trop petite (min 0.01).` }, { status: 400 });
      }
    }

    // Recalculate totals server-side using shared cents arithmetic (BUG-08 fix)
    const serverTotals = calculateInvoiceTotals(
      items.map((i: any) => ({
        quantity: i.quantity,
        unit_price: i.unit_price,
        vat_rate: i.vat_rate,
        discount_percent: (i as any).discount_percent || 0,
      })),
      discount_percent || 0
    );
    const recalculatedTotal = serverTotals.total;
    // Allow 1 cent tolerance for rounding differences
    if (Math.abs(recalculatedTotal - total) > 0.02) {
      console.warn('[API /invoices/create] Amount mismatch:', { clientTotal: total, serverTotal: recalculatedTotal });
      return NextResponse.json({ error: 'Incohérence dans les montants. Veuillez recharger la page.' }, { status: 400 });
    }

    console.log('[API /invoices/create] User:', user.id, 'Tier:', tier, 'Prefix:', prefix, 'Total:', total);

    const { data: invoiceId, error: rpcError } = await supabase
      .rpc('create_invoice_atomique', {
        p_user_id: user.id,
        p_client_id: client_id || null,
        p_client_name_override: client_name_override || null,
        p_document_type: document_type || 'invoice',
        p_status: 'draft',
        p_issue_date: issue_date,
        p_due_date: due_date || null,
        p_items: items,
        p_subtotal: subtotal,
        p_vat_amount: vat_amount,
        p_discount_percent: discount_percent || null,
        p_discount_amount: serverTotals.discountAmount || null,
        p_total: total,
        p_notes: notes || null,
        p_prefix: prefix || 'FACT',
        p_linked_invoice_id: linked_invoice_id || null,
        p_idempotency_id: idempotency_id || crypto.randomUUID(),
        p_client_type: client_type || null,
      });

    if (rpcError || !invoiceId) {
      console.error('[API /invoices/create] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError?.message || 'Erreur RPC' }, { status: 500 });
    }

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('[API /invoices/create] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Facture créée mais impossible de la récupérer' }, { status: 500 });
    }

    // ATELIER (e-invoicing) — le RPC create_invoice_atomique ne stocke PAS les
    // champs client inline (siret, tva, adresse…). Or la transmission Factur-X en
    // a BESOIN (le XML exige SIRET + adresse client ; isFacturXEligible vérifie le
    // SIRET client). On les persiste donc sur la facture et on les fusionne dans
    // l'objet invoice pour transmitInvoice. Choix produit « inline » : on fige ces
    // infos sur la facture TOUJOURS, même pour un client lié (champs vides ignorés
    // → le PDF/XML replient sur la fiche via le join).
    {
      const inlineFields: Record<string, string> = {};
      if (client_siret) inlineFields.client_siret = client_siret;
      if (client_vat_number) inlineFields.client_vat_number = client_vat_number;
      if (client_email) inlineFields.client_email = client_email;
      if (client_phone) inlineFields.client_phone = client_phone;
      if (client_address) inlineFields.client_address = client_address;
      if (client_city) inlineFields.client_city = client_city;
      if (client_postal_code) inlineFields.client_postal_code = client_postal_code;
      // OVERLORD (CIBLE 8) — toujours persister les conditions (même '' = à réception)
      // pour que le PDF lise la facture et non le défaut profil ('30').
      inlineFields.payment_terms = typeof payment_terms === 'string' ? payment_terms : '';
      try {
        await createAdminClient().from('invoices')
          .update({ ...inlineFields, updated_at: new Date().toISOString() })
          .eq('id', invoice.id);
      } catch (e: any) {
        console.warn('[invoices/create] inline client fields persist failed:', e?.message);
      }
      Object.assign(invoice, inlineFields);
    }

    // Update profile stats in background
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data: freshProfile }) => {
        if (freshProfile) {
          // We can't update the client-side store from the server, but the profile data is fresh
          console.log('[API /invoices/create] Profile updated, count:', freshProfile.monthly_invoice_count);
        }
      });

    console.log('[API /invoices/create] SUCCESS:', invoice.id);

    // ── Transmission automatique PDP pour les factures B2B ────────────────
    // Si la facture est B2B et que les identifiants PDP sont configurés,
    // on transmet automatiquement à SuperPDP en arrière-plan.
    let pdpResult: { transmitted: boolean; superPdpId?: string; error?: string } | null = null;

    // ATELIER (e-invoicing) — transmission UNIQUEMENT pour le B2B (client assujetti
    // = SIRET ou identifiants d'entreprise), via isInvoiceB2B (source de vérité
    // unique SIRET-based, cohérente avec le flux voix). Avant, la gate testait
    // client_type === 'b2b' qui ne matchait jamais le 'business' du flux voix.
    if (invoice.number && isInvoiceB2B(invoice)) {
      const hasPdpCredentials = process.env.SUPER_PDP_CLIENT_ID
        && (process.env.SUPER_PDP_CLIENT_SECRET || process.env.SUPER_PDP_SECRET_ID);

      if (hasPdpCredentials) {
        const pdpTier = sub.tier || 'free';
        const hasPdpAccess = sub.isTrial || pdpTier === 'pro' || pdpTier === 'business';

        if (hasPdpAccess) {
          try {
            // Récupérer le profil complet pour la transmission
            const admin = createAdminClient();
            const { data: fullProfile } = await admin
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (fullProfile) {
              console.log('[invoices/create] Transmission PDP automatique pour B2B facture', invoice.number);
              const result = await transmitInvoice(invoice, fullProfile);

              if (result.success) {
                await admin
                  .from('invoices')
                  .update({
                    pdp_transmission_id: result.superPdpId,
                    pdp_status: 'transmitted',
                    pdp_transmitted_at: new Date().toISOString(),
                    pdp_last_error: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoice.id);

                pdpResult = { transmitted: true, superPdpId: result.superPdpId };
                console.log('[invoices/create] PDP transmis, ID:', result.superPdpId);
              } else if (isRetryableError(result)) {
                // Erreur transitoire → planifier un retry
                await admin
                  .from('invoices')
                  .update({
                    pdp_status: 'pending_retry',
                    pdp_last_error: result.error,
                    pdp_next_retry_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoice.id);

                pdpResult = { transmitted: false, error: 'Transmission en attente de retry' };
                console.warn('[invoices/create] PDP retry planifié:', result.error);
              } else if (result.errorCode === 'SUPERPDP_NOT_CONNECTED') {
                // Utilisateur sans plateforme connectée → pas un échec, juste un
                // prérequis manquant. On reste en not_transmitted (silencieux) ;
                // la transmission se fera dès qu'il branchera SuperPDP (settings).
                await admin
                  .from('invoices')
                  .update({
                    pdp_status: 'not_transmitted',
                    pdp_last_error: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoice.id);

                pdpResult = { transmitted: false, error: 'Plateforme non connectée' };
                console.log('[invoices/create] SuperPDP non connecté — transmission différée');
              } else {
                // Erreur non retryable
                await admin
                  .from('invoices')
                  .update({
                    pdp_status: 'failed',
                    pdp_last_error: result.error,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoice.id);

                pdpResult = { transmitted: false, error: result.error };
                console.error('[invoices/create] PDP échoué:', result.error);
              }
            }
          } catch (pdpError: any) {
            console.error('[invoices/create] Erreur PDP:', pdpError.message);
            pdpResult = { transmitted: false, error: pdpError.message };
          }
        }
      }
    } else {
      // ATELIER (e-invoicing) — B2C (particulier) : la facturation électronique
      // n'est PAS requise (e-reporting à part côté SuperPDP /b2c_*). On pose un
      // statut explicite pour que ça ne paraisse pas comme un échec de transmission.
      try {
        const adminB2c = createAdminClient();
        const { error: b2cErr } = await adminB2c.from('invoices')
          .update({ pdp_status: 'not_required_b2c', updated_at: new Date().toISOString() })
          .eq('id', invoice.id);
        if (b2cErr) console.warn('[invoices/create] not_required_b2c update failed:', b2cErr.message);
      } catch (e: any) {
        console.warn('[invoices/create] not_required_b2c update error:', e?.message);
      }
    }

    return NextResponse.json({ invoice, pdpTransmission: pdpResult });

  } catch (error: any) {
    console.error('[API /invoices/create] Error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}
