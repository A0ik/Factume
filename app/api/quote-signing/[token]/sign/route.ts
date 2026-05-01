import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import React from 'react';
import { PdfDocument } from '@/components/pdf-document';

// Helper pour logger les événements de signature
async function logQuoteSignatureEvent(
  admin: any,
  quoteId: string,
  eventType: string,
  tokenId: string,
  metadata: Record<string, any> = {},
  req?: NextRequest
) {
  try {
    await admin.from('quote_signature_logs').insert({
      quote_id: quoteId,
      token_id: tokenId,
      event_type: eventType,
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent') || null,
      metadata,
    });
  } catch (err) {
    console.error('Erreur log signature devis:', err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { signatureDataUrl, signerName } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    if (!signatureDataUrl || !signerName) {
      return NextResponse.json({ error: 'Données de signature manquantes' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Récupérer le token
    const { data: tokenRecord, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    // Vérifier si le token n'est pas expiré
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Log la signature
    await logQuoteSignatureEvent(
      admin,
      tokenRecord.quote_id,
      'quote_signed',
      tokenRecord.id,
      { signerName, signatureSize: signatureDataUrl.length },
      req
    );

    // Mettre à jour le token avec les infos de signature
    await admin
      .from('quote_signing_tokens')
      .update({
        signed_at: new Date().toISOString(),
        signer_name: signerName,
        signature_data_url: signatureDataUrl,
      })
      .eq('id', tokenRecord.id);

    // Mettre à jour le statut du devis
    await admin
      .from('invoices')
      .update({
        status: 'accepted', // Le devis est accepté une fois signé
        signed_at: new Date().toISOString(),
        signed_by: signerName,
        client_signature_url: signatureDataUrl,
      })
      .eq('id', tokenRecord.quote_id);

    // ═══════════════════════════════════════════════════════════════════════
    // ENVOI D'EMAIL DE NOTIFICATION À L'UTILISATEUR
    // ═══════════════════════════════════════════════════════════════════════

    try {
      // Récupérer les informations du devis avec le profil de l'utilisateur
      const { data: updatedQuote } = await admin
        .from('invoices')
        .select(`
          *,
          client:client_id(
            name,
            email
          )
        `)
        .eq('id', tokenRecord.quote_id)
        .single();

      if (!updatedQuote) {
        console.error('Devis non trouvé pour envoi email');
      } else {
        // Récupérer l'email de l'utilisateur depuis auth.users
        const { data: userData } = await admin.auth.admin.getUserById(tokenRecord.user_id);
        const userEmail = userData?.user?.email;

        if (!userEmail) {
          console.error('Email utilisateur non trouvé');
        } else {
          // Récupérer le profil de l'utilisateur
          const { data: userProfile } = await admin
            .from('profiles')
            .select('*')
            .eq('id', tokenRecord.user_id)
            .single();

          // Générer le PDF du devis signé
          let attachment: Array<{ filename: string; content: Buffer }> = [];
          try {
            const element = React.createElement(PdfDocument, { invoice: updatedQuote, profile: userProfile });
            const pdfBytes = await renderToBuffer(element as any);
            attachment = [{
              filename: `Devis_signe_${updatedQuote.number}_${signerName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
              content: Buffer.from(pdfBytes),
            }];
          } catch (pdfErr) {
            console.error('Erreur génération PDF signé:', pdfErr);
          }

          // Envoyer l'email de notification via Resend
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY) {
            const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
            const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

            const htmlContent = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background:#10b981;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                  <h2 style="color:#fff;margin:0;font-size:20px;">Devis signé !</h2>
                  <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Devis n° ${updatedQuote.number}</p>
                </div>
                <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
                  <p style="font-size:16px;margin:0 0 16px;">Bonjour <strong>${userProfile?.company_name || userEmail}</strong>,</p>

                  <p style="font-size:15px;margin:0 0 24px;color:#374151;">
                    Nous avons le plaisir de vous informer que votre devis a été signé par le client.
                  </p>

                  <div style="background:#f0fdf4;padding:20px;border-radius:12px;border:1px solid #bbf7d0;margin-bottom:24px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                      <div style="width:48px;height:48px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <p style="margin:0;font-size:16px;font-weight:bold;color:#065f46;">Signature confirmée</p>
                        <p style="margin:4px 0 0;font-size:13px;color:#047857;">Le client a signé électroniquement le devis</p>
                      </div>
                    </div>

                    <div style="text-align:left;">
                      <p style="font-size:13px;color:#6b7280;margin:0 0 6px;"><strong>Client :</strong> ${updatedQuote.client?.name || 'N/A'}</p>
                      <p style="font-size:13px;color:#6b7280;margin:0 0 6px;"><strong>Signé par :</strong> ${signerName}</p>
                      <p style="font-size:13px;color:#6b7280;margin:0;"><strong>Date de signature :</strong> ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:24px;">
                    <p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Montant du devis :</strong> ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(updatedQuote.total || 0)}</p>
                    <p style="font-size:14px;color:#374151;margin:0;"><strong>Numéro :</strong> ${updatedQuote.number}</p>
                  </div>

                  <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
                    Le devis signé est joint à cet email au format PDF. Vous pouvez maintenant transformer ce devis en facture si nécessaire.
                  </p>

                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me'}/invoices/${updatedQuote.id}" style="display:inline-block;background:#1f2937;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
                    Voir le devis signé
                  </a>

                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
                  <p style="font-size:12px;color:#aaa;margin:0;">Cet email a été envoyé via Factu.me • Signature électronique sécurisée eIDAS</p>
                </div>
              </div>
            `;

            try {
              const resend = new Resend(RESEND_API_KEY);
              await resend.emails.send({
                from: `${senderName} <${senderEmail}>`,
                to: [userEmail],
                subject: `✅ Devis signé — ${updatedQuote.number} par ${signerName}`,
                html: htmlContent,
                attachments: attachment.length > 0 ? attachment : undefined,
              });

              // Logger l'envoi de l'email de notification
              await logQuoteSignatureEvent(
                admin,
                tokenRecord.quote_id,
                'notification_email_sent',
                tokenRecord.id,
                { recipient: userEmail, notificationType: 'signature_confirmation' },
                req
              );
            } catch (resendErr) {
              console.error('Erreur Resend notification:', resendErr);
            }
          }
        }
      }
    } catch (emailErr) {
      console.error('Erreur envoi notification signature:', emailErr);
      // Ne pas échouer la requête si l'email de notification échoue
    }

    return NextResponse.json({
      success: true,
      message: 'Devis signé avec succès'
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
