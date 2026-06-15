import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import React from 'react';
import { PdfDocument } from '@/components/pdf-document';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { SendInvoiceSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { transmitInvoice, isRetryableError } from '@/lib/superPdpClient';
import { isFacturXEligible } from '@/lib/facturx';

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

  const payBtn = invoice.stripe_payment_url
    ? `<div style="text-align:center;margin:28px 0">
        <a href="${invoice.stripe_payment_url}" style="display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">
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

    console.log('[send-invoice] Génération PDF...');
    let pdfBuffer: Buffer;
    try {
      // SENTINEL (AUDIT 2) — Injecter le QR code (data URL) avant le rendu, sinon
      // PdfDocument affiche le fallback texte « Payer » au lieu de l'image QR
      // (l'invoice vient de Supabase, qui ne persiste pas qr_data_url). Miroir du
      // chemin downloadInvoicePdf / withQrDataUrl pour que le PDF email ait le QR.
      const { withQrDataUrl } = await import('@/lib/pdf');
      const invoiceWithQr = await withQrDataUrl(invoice);
      const element = React.createElement(PdfDocument, { invoice: invoiceWithQr, profile: (profile || {}) as any });
      const pdfBytes = await renderToBuffer(element as any);
      pdfBuffer = Buffer.from(pdfBytes);
      console.log('[send-invoice] PDF généré, taille:', pdfBuffer.length, 'bytes');
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
    let pdpResult: { transmitted: boolean; superPdpId?: string; error?: string } | null = null;

    try {
      // Vérifier si la transmission PDP est activée et éligible
      const hasPdpCredentials = process.env.SUPER_PDP_CLIENT_ID && (process.env.SUPER_PDP_CLIENT_SECRET || process.env.SUPER_PDP_SECRET_ID);
      const isEligibleDocType = ['invoice', 'credit_note', 'deposit'].includes(invoice.document_type);
      const tier = profile?.subscription_tier || 'free';
      const hasPdpAccess = profile?.is_trial_active || tier === 'pro' || tier === 'business';

      if (hasPdpCredentials && isEligibleDocType && hasPdpAccess) {
        // BUG 6: Skip PDP transmission for B2C invoices
        const invoiceClientType = invoice.client_type || invoice.client?.client_type;
        if (invoiceClientType === 'b2c') {
          console.log('[send-invoice] Facture B2C — transmission PDP ignorée');
        } else {
          const eligibility = isFacturXEligible(invoice, profile || {});

          if (eligibility.eligible) {
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

              pdpResult = { transmitted: true, superPdpId: result.superPdpId };
              console.log('[send-invoice] Facture transmise légalement. ID PDP:', result.superPdpId);

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

              pdpResult = { transmitted: false, error: result.error };
              console.warn('[send-invoice] Transmission PDP échouée:', result.error, retryable ? '(retry programmé)' : '(définitif)');
            }
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
