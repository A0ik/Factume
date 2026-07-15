import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import {
  cabinetInvoiceToPdfInputs,
  resolveCabinetClientEmail,
  resolveCabinetClientName,
} from '@/lib/cabinet-pdf';
import { generatePdfBuffer } from '@/lib/pdf-server';
import { Resend } from 'resend';

export const maxDuration = 60;

/**
 * ASTRÉE (CIBLE 2b) — Envoi par email d'une facture d'honoraires cabinet.
 *
 * AVANT (cassé) : la route query `.from('invoices')` (table locataire) avec un UUID
 * `cabinet_invoices` → 404 systématique ; + appel à /api/emails/invoice qui
 * N'EXISTE PAS. Donc l'envoi ne partait jamais.
 *
 * MAINTENANT : query `cabinet_invoices` (scoped au cabinet), résout le destinataire
 * depuis `cabinet_clients`, génère le PDF via le moteur unifié, et envoie via Resend
 * avec le PDF en pièce jointe (miroir de /api/send-invoice).
 */

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCabinetInvoiceHtml(invoice: any, profile: any, senderName: string): string {
  const accent = profile?.accent_color || '#10b981';
  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0);
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';

  const itemRows = (invoice.items || []).map((item: any) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">${esc(item.description)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;text-align:center">${item.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#111827;text-align:right">${fmt(item.total)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="background:${accent};border-radius:16px 16px 0 0;padding:32px 40px">
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Facture d'honoraires</div>
          <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">${esc(invoice.number)}</div>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px 40px">
          <p style="font-size:15px;color:#374151;margin:0 0 8px">Bonjour ${esc(clientName)},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6">
            Veuillez trouver ci-joint votre facture d'honoraires de la part de <strong style="color:#111827">${esc(senderName)}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:left">Prestation</th>
                <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:center">Qté</th>
                <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;text-align:right">Total HT</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td></td><td width="240" style="padding:0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">Sous-total HT</td><td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">${fmt(invoice.subtotal)}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb">TVA</td><td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">${fmt(invoice.vat_amount)}</td></tr>
                <tr><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#fff;background:#111827;border-radius:8px 0 0 8px">Total TTC</td><td style="padding:12px 16px;font-size:20px;font-weight:900;color:${accent};background:#111827;border-radius:0 8px 8px 0;text-align:right">${fmt(invoice.total)}</td></tr>
              </table>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.6">Cordialement,<br/><strong style="color:#111827">${esc(senderName)}</strong></p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #e5e7eb">
          <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;line-height:1.7">Facture transmise via Factu.me${profile?.siret ? ` · SIRET : ${esc(profile.siret)}` : ''}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Cabinet non trouvé' }, { status: 404 });

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'ID facture manquant' }, { status: 400 });
    }

    // BONNE TABLE : cabinet_invoices, scoped au cabinet.
    const { data: ci, error } = await admin
      .from('cabinet_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('cabinet_id', cabinet.id)
      .maybeSingle();
    if (error || !ci) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Destinataire.
    let client = null;
    if (ci.client_id) {
      const { data: c } = await admin
        .from('cabinet_clients')
        .select('*, profile:profiles!client_user_id(id, email, company_name, first_name, last_name)')
        .eq('id', ci.client_id)
        .eq('cabinet_id', cabinet.id)
        .maybeSingle();
      client = c;
    }
    const recipientEmail = resolveCabinetClientEmail(client);
    if (!recipientEmail) {
      return NextResponse.json(
        { error: `Aucun email pour ${resolveCabinetClientName(client)}. Renseignez-le dans la fiche client.` },
        { status: 400 },
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 });
    }

    const { invoice, profile } = cabinetInvoiceToPdfInputs(ci, client, cabinet);
    const pdfBytes = await generatePdfBuffer(invoice, profile);
    const pdfBuffer = Buffer.from(pdfBytes);

    const senderName = cabinet.name || 'Cabinet';
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';

    const resend = new Resend(RESEND_API_KEY);
    const { error: resendError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [recipientEmail],
      replyTo: cabinet.email || senderEmail,
      subject: `Facture d'honoraires ${ci.number} — ${senderName}`,
      html: buildCabinetInvoiceHtml(invoice, profile, senderName),
      attachments: [{
        filename: `${(ci.number || invoiceId).replace(/[/\r\n"']/g, '-')}.pdf`,
        content: pdfBuffer,
      }],
    });

    if (resendError) {
      console.error('[cabinet-invoices-send] Resend error:', resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    // Marquer comme envoyée.
    await admin
      .from('cabinet_invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', ci.id);

    return NextResponse.json({ success: true, sentTo: recipientEmail });
  } catch (error: any) {
    console.error('[cabinet-invoices-send] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
