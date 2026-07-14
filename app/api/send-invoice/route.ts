import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { SendInvoiceSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { transmitInvoice, isRetryableError } from '@/lib/superPdpClient';
import { isInvoiceB2B } from '@/lib/tva-validator';
import { isFacturXEligible } from '@/lib/facturx';
import { resolvePaymentLink } from '@/lib/payment-link';

export const maxDuration = 60;

const safe = (s: unknown) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '_');

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function buildEmailHtml(invoice: any, profile: any, senderName: string, isReminder = false, customMessage?: string): string {
  const accent = profile?.accent_color || '#1D9E75';
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';
  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  const docLabels: Record<string, string> = { invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir' };
  const docLabel = docLabels[invoice.document_type] || 'Facture';
  const firstItem = invoice.items?.[0]?.description || 'votre prestation';
  const itemRows = (invoice.items || []).map((item: any) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">${esc(item.description)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;text-align:center">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right">${fmt(item.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#111827;text-align:right">${fmt(item.total)}</td>
    </tr>`).join('');

  // ARGOS (CIBLE 5) — bouton Payer via le résolveur unique (SumUp + liens stale gérés).
  // Avant : invoice.stripe_payment_url en dur → pas de bouton pour SumUp + lien stale affiché.
  const resolvedPay = resolvePaymentLink(invoice);
  const payBtn = resolvedPay.url
    ? `<div style="text-align:center;margin:28px 0">
        <a href="${resolvedPay.url}" style="display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">
          Payer ${fmt(invoice.total)} en ligne
        </a>
      </div>` : '';

  return `<!DOCTYPE html>
<html lang="${profile?.language || 'fr'}">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:${accent};border-radius:16px 16px 0 0;padding:32px 40px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">${docLabel}</div>
                <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">${esc(invoice.number)}</div>
              </td>
              <td align="right">
                <div style="font-size:12px;color:rgba(255,255,255,0.8)">Émise le</div>
                <div style="font-size:14px;font-weight:700;color:#fff">${fmtDate(invoice.issue_date)}</div>
                ${invoice.due_date ? `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px">Échéance</div><div style="font-size:14px;font-weight:700;color:#fff">${fmtDate(invoice.due_date)}</div>` : ''}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 40px">
          ${customMessage
            ? `<p style="font-size:14px;color:#374151;margin:0 0 28px;line-height:1.6;white-space:pre-wrap">${esc(customMessage).replace(/\n/g, '<br/>')}</p>`
            : `
          <p style="font-size:15px;color:#374151;margin:0 0 8px">Bonjour ${esc(clientName)},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 4px;line-height:1.6">
            ${isReminder
              ? `Je me permets de revenir vers vous concernant la ${docLabel.toLowerCase()} <strong style="color:#111827">${esc(invoice.number)}</strong> restée impayée à ce jour.`
              : `Veuillez trouver ci-joint votre ${docLabel.toLowerCase()} pour <strong style="color:#111827">${esc(firstItem)}</strong>.`
            }
          </p>
          <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6">
            De la part de <strong style="color:#111827">${esc(senderName)}</strong>.
          </p>
          `}

          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb">Prestation</th>
                <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:center;border-bottom:1px solid #e5e7eb">Qté</th>
                <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb">P.U. HT</th>
                <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb">Total HT</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td></td>
              <td width="240" style="padding:0">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280">Sous-total HT</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;font-weight:600">${fmt(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">TVA</td>
                    <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">${fmt(invoice.vat_amount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#fff;background:#111827;border-radius:8px 0 0 8px">Total TTC</td>
                    <td style="padding:12px 16px;font-size:20px;font-weight:900;color:${accent};background:#111827;border-radius:0 8px 8px 0;text-align:right">${fmt(invoice.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          ${payBtn}

          ${invoice.notes ? `<div style="background:#f8f8fc;border-left:3px solid ${accent};border-radius:6px;padding:14px 16px;margin-bottom:24px"><div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Notes</div><p style="font-size:13px;color:#374151;margin:0;line-height:1.6">${esc(invoice.notes)}</p></div>` : ''}

          ${profile?.iban ? `<div style="background:#f0fdf4;border-left:3px solid ${accent};border-radius:6px;padding:14px 16px;margin-bottom:24px"><div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Coordonnées bancaires</div><div style="font-size:13px;color:#374151;line-height:1.8">${profile.bank_name ? `<div><strong>Banque :</strong> ${esc(profile.bank_name)}</div>` : ''}<div><strong>IBAN :</strong> ${esc(profile.iban)}</div>${profile.bic ? `<div><strong>BIC :</strong> ${esc(profile.bic)}</div>` : ''}</div></div>` : ''}

          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.6">Cordialement,<br/><strong style="color:#111827">${esc(senderName)}</strong></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #e5e7eb">
          <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;line-height:1.7">
            Ce document vous est transmis par <strong>${esc(senderName)}</strong> via Factu.me<br/>
            ${profile?.siret ? `SIRET : ${esc(profile.siret)} · ` : ''}${profile?.legal_status === 'auto-entrepreneur' ? 'TVA non applicable, art. 293 B du CGI' : ''}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Rate limiting : 30 requêtes/minute par IP ou user
  const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 30, windowMs: 60000 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) }
      }
    );
  }

  console.log('[send-invoice] Request received');
  try {
    // Auth check
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();

    // Valider les données avec Zod
    let validatedData;
    try {
      validatedData = validateRequest(SendInvoiceSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          details: error.errors
        }, { status: 400 });
      }
      throw error;
    }

    const { invoiceId, email, profile: requestProfile, isReminder, subject: customSubject, message: customMessage } = validatedData;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré (RESEND_API_KEY manquante)' }, { status: 500 });
    }

    const supabase = createAdminClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const senderName = profile?.company_name || 'Factu.me';
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
    const replyToEmail = profile?.email || senderEmail;

    console.log('[send-invoice] Génération PDF (pdf-lib)...');
    let pdfBuffer: Buffer;
    try {
      // ATELIER (CIBLE 5) — unification : le chemin email passe enfin par pdf-lib
      // (même moteur que le téléchargement) au lieu de @react-pdf/renderer.
      //   • rendu identique au PDF téléchargé (layout, QR léger, lien cliquable,
      //     conditions non débordantes, émetteur bien placé) ;
      //   • Factur-X EMBARQUÉ (avant, le PDF emailé était SANS XML → non conforme
      //     e-invoicing 2026). Défensif : si l'embarquement échoue, on envoie quand
      //     même le PDF (sans XML) plutôt que de bloquer l'email.
      const { generatePdfBuffer } = await import('@/lib/pdf-server');
      const { createFacturXPdf } = await import('@/lib/facturx');
      let pdfBytes = await generatePdfBuffer(invoice, profile);
      const facturxEligible = isFacturXEligible(invoice, profile);
      // isFacturXEligible() retourne un OBJET {eligible, reason, warnings} (pas un booléen) —
      // on teste bien .eligible, sinon le test serait toujours truthy → XML embarqué sur des
      // factures inéligibles (B2C / sans SIRET client).
      if (facturxEligible?.eligible) {
        try {
          pdfBytes = await createFacturXPdf(pdfBytes, invoice, profile);
        } catch (fxErr: any) {
          console.error('[send-invoice] Factur-X embed échoué (PDF envoyé sans XML) :', fxErr.message);
        }
      }
      pdfBuffer = Buffer.from(pdfBytes);
      console.log('[send-invoice] PDF généré', facturxEligible?.eligible ? '(pdf-lib + Factur-X)' : '(pdf-lib)', 'taille:', pdfBuffer.length, 'bytes');
    } catch (pdfErr: any) {
      console.error('[send-invoice] ERREUR génération PDF:', pdfErr.message);
      return NextResponse.json({ error: `Erreur génération PDF: ${pdfErr.message}` }, { status: 500 });
    }

    const firstItem = invoice.items?.[0]?.description || 'prestation';
    const emailSubject = customSubject || (isReminder
      ? `[Rappel] Facture ${invoice.number} de ${senderName}`
      : `Votre facture pour ${firstItem} — ${senderName}`);

    console.log('[send-invoice] Envoi via Resend → to:', email);

    const resend = new Resend(RESEND_API_KEY);
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [email],
      replyTo: replyToEmail,
      subject: emailSubject,
      html: buildEmailHtml(invoice, profile, senderName, isReminder, customMessage),
      attachments: [{
        filename: `${safe(invoice.number)}.pdf`,
        content: pdfBuffer,
      }],
    });

    if (resendError) {
      console.error('[send-invoice] Erreur Resend:', resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    console.log('[send-invoice] Email envoyé avec succès, id:', resendData?.id);

    // ── Transmission électronique Super PDP (en arrière-plan) ──────────
    let pdpResult: { transmitted: boolean; attempted?: boolean; notConnected?: boolean; superPdpId?: string; error?: string } | null = null;

    try {
      // Vérifier si la transmission PDP est activée et éligible
      const hasPdpCredentials = process.env.SUPER_PDP_CLIENT_ID && (process.env.SUPER_PDP_CLIENT_SECRET || process.env.SUPER_PDP_SECRET_ID);
      const isEligibleDocType = ['invoice', 'credit_note', 'deposit'].includes(invoice.document_type);
      const tier = profile?.subscription_tier || 'free';
      const hasPdpAccess = profile?.is_trial_active || tier === 'pro' || tier === 'business';

      if (hasPdpCredentials && isEligibleDocType && hasPdpAccess) {
        // ATELIER (e-invoicing) — B2C (particulier) : non soumis à la transmission
        // (e-reporting à part côté SuperPDP /b2c_*). isInvoiceB2B = source unique
        // SIRET-based ; corrige aussi le B2C vocal 'individual' qui n'était pas
        // sauté par l'ancien test client_type === 'b2c'.
        if (!isInvoiceB2B(invoice)) {
          console.log('[send-invoice] Facture B2C (particulier) — transmission non requise');
          await supabase.from('invoices').update({ pdp_status: 'not_required_b2c', updated_at: new Date().toISOString() }).eq('id', invoiceId).then(({ error }) => { if (error) console.warn('[send-invoice] not_required_b2c:', error.message); });
        } else {
          const eligibility = isFacturXEligible(invoice, profile || {});

          if (eligibility.eligible) {
            // ── Anti-double transmission (CIBLE 2) ─────────────────────────────
            // SuperPDP /invoices n'expose PAS de clé d'idempotence (doc §3.2) :
            // un 2e POST = une 2e facture légale (doublon côté État). Garde haute
            // (épargne l'appel API) en plus du filet bas dans transmitInvoice().
            if (invoice.pdp_status === 'transmitted' && invoice.pdp_transmission_id) {
              console.log('[send-invoice] Facture déjà transmise (id', invoice.pdp_transmission_id, ') — skip anti-double');
              pdpResult = { transmitted: true, attempted: false, superPdpId: invoice.pdp_transmission_id };
            } else {
              console.log('[send-invoice] Transmission Super PDP en cours pour', invoice.number, '...');

              // Transmettre à Super PDP (ne bloque pas la réponse en cas d'erreur)
              const result = await transmitInvoice(invoice, profile || {});

              if (result.success) {
                // Sauvegarder l'ID de transmission en base
                await supabase
                  .from('invoices')
                  .update({
                    pdp_transmission_id: result.superPdpId,
                    pdp_status: 'transmitted',
                    pdp_transmitted_at: new Date().toISOString(),
                    pdp_last_error: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoiceId);

                pdpResult = { transmitted: true, attempted: true, superPdpId: result.superPdpId };
                console.log('[send-invoice] Facture transmise légalement. ID PDP:', result.superPdpId);

              } else if (result.errorCode === 'SUPERPDP_NOT_CONNECTED') {
                // Pas de plateforme connectée → silencieux (pas un échec). L'email
                // part quand même ; la transmission suivra dès le branchement SuperPDP.
                await supabase
                  .from('invoices')
                  .update({
                    pdp_status: 'not_transmitted',
                    pdp_last_error: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoiceId);

                // notConnected + attempted:false → le front SAIT qu'il ne faut PAS
                // afficher la popup « transmission en cours » (CIBLE 1 : fantôme).
                pdpResult = { transmitted: false, attempted: false, notConnected: true };
                console.log('[send-invoice] SuperPDP non connecté — transmission différée');
              } else {
                // Erreur de transmission — on loggue mais on ne bloque pas l'envoi email
                const retryable = isRetryableError(result);
                await supabase
                  .from('invoices')
                  .update({
                    pdp_status: retryable ? 'pending_retry' : 'failed',
                    pdp_last_error: result.error,
                    pdp_retry_count: 1,
                    pdp_next_retry_at: retryable ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', invoiceId);

                pdpResult = { transmitted: false, attempted: true, error: result.error };
                console.warn('[send-invoice] Transmission PDP échouée:', result.error, retryable ? '(retry programmé)' : '(définitif)');
              }
            } // end anti-double else
          } else {
            console.log('[send-invoice] Facture non éligible Factur-X:', eligibility.reason);
          }
        } // end B2B-only PDP branch
      }
    } catch (pdpError: any) {
      // Ne JAMAIS bloquer l'envoi email pour une erreur PDP
      console.error('[send-invoice] Erreur transmission PDP (non bloquante):', pdpError.message);
      pdpResult = { transmitted: false, error: pdpError.message };
    }

    return NextResponse.json({
      success: true,
      messageId: resendData?.id,
      pdpTransmission: pdpResult,
    });

  } catch (error: any) {
    console.error('[send-invoice] Erreur inattendue:', error.message);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
