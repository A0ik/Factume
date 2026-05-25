import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';
import { dbToContractTemplate } from '@/lib/labor-law/contract-data-utils';
import { sendContractNotification } from '@/lib/services/contract-notification-service';
import { Resend } from 'resend';

export const maxDuration = 60;

const TABLE_MAP: Record<string, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  other: 'Contrat de travail',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { signatureDataUrl, signerName } = await req.json();

    if (!signatureDataUrl || !signerName) {
      return NextResponse.json({ error: 'Signature et nom requis' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Valider le token
    const { data: tokenRecord } = await admin
      .from('contract_signing_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    if (tokenRecord.signed_at) {
      return NextResponse.json({ error: 'Déjà signé' }, { status: 400 });
    }

    const tableName = TABLE_MAP[tokenRecord.contract_type];
    if (!tableName) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    // Extraire l'IP du signataire
    const signerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // Inserer dans contract_signatures
    await admin.from('contract_signatures').insert({
      contract_id: tokenRecord.contract_id,
      contract_type: tokenRecord.contract_type,
      party: 'employee',
      signature_data: signatureDataUrl,
      signed_by_name: signerName,
      signer_ip: signerIp,
    });

    // Mettre a jour le contrat
    await admin
      .from(tableName)
      .update({
        employee_signature: signatureDataUrl,
        employee_signature_date: new Date().toISOString().split('T')[0],
        document_status: 'signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.contract_id);

    // Marquer le token comme utilise
    await admin
      .from('contract_signing_tokens')
      .update({ signed_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Envoyer notification in-app + push à l'employeur
    try {
      const { data: contract } = await admin
        .from(tableName)
        .select('contract_number, employee_first_name, employee_last_name')
        .eq('id', tokenRecord.contract_id)
        .single();

      if (contract) {
        await sendContractNotification({
          userId: tokenRecord.user_id,
          type: 'contract_signed',
          contractId: tokenRecord.contract_id,
          contractType: tokenRecord.contract_type,
          employeeName: `${contract.employee_first_name} ${contract.employee_last_name}`,
          contractNumber: contract.contract_number,
          metadata: { signedBy: signerName, signedAt: new Date().toISOString() },
        });
      }
    } catch (notifErr) {
      console.error('Erreur notification in-app:', notifErr);
      // Non-critical, continue with email
    }

    // Notifier l'employeur par email
    try {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, company_name, first_name, last_name')
        .eq('id', tokenRecord.user_id)
        .single();

      if (profile?.email) {
        // Generer le PDF signe
        const { data: fullContract } = await admin
          .from(tableName)
          .select('*')
          .eq('id', tokenRecord.contract_id)
          .single();

        let attachments: Array<{ filename: string; content: Buffer }> = [];
        if (fullContract) {
          try {
            const { data: userProfile } = await admin
              .from('profiles')
              .select('accent_color')
              .eq('id', tokenRecord.user_id)
              .single();

            const templateData = dbToContractTemplate(fullContract, tokenRecord.contract_type);
            if (userProfile?.accent_color) {
              templateData.accentColor = userProfile.accent_color;
            }
            const pdfBytes = await generateContractPdfBuffer(templateData);
            attachments = [{
              filename: `Contrat_signe_${CONTRACT_LABELS[tokenRecord.contract_type]}.pdf`,
              content: Buffer.from(pdfBytes),
            }];
          } catch { /* PDF generation failed, send without attachment */ }
        }

        const label = CONTRACT_LABELS[tokenRecord.contract_type] || 'Contrat';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY) {
          const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
          const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

          const resend = new Resend(RESEND_API_KEY);
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [profile.email],
            subject: `${label} signé par ${signerName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background:#1D9E75;padding:20px 24px;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;font-size:18px;">Contrat signé</h2>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
                  <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
                    <strong>${signerName}</strong> a signé le ${label} électroniquement.
                  </p>
                  <p style="font-size:13px;color:#666;margin:0;">
                    Le contrat signé est joint à cet email. Vous pouvez aussi le retrouver dans votre espace Factu.me.
                  </p>
                  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
                  <p style="font-size:11px;color:#aaa;margin:0;">Notification automatique — Factu.me</p>
                </div>
              </div>
            `,
            attachments: attachments.length > 0 ? attachments : undefined,
          });
        }
      }
    } catch (emailErr) {
      console.error('Erreur notification employeur:', emailErr);
    }

    // Envoyer une confirmation au salarié avec le contrat signé en PDF
    try {
      const employeeEmail = tokenRecord.employee_email;
      if (employeeEmail) {
        const { data: fullContract } = await admin
          .from(tableName)
          .select('*')
          .eq('id', tokenRecord.contract_id)
          .single();

        let employeeAttachments: Array<{ filename: string; content: Buffer }> = [];
        if (fullContract) {
          try {
            const { data: userProfile } = await admin
              .from('profiles')
              .select('accent_color')
              .eq('id', tokenRecord.user_id)
              .single();

            const templateData = dbToContractTemplate(fullContract, tokenRecord.contract_type);
            if (userProfile?.accent_color) {
              templateData.accentColor = userProfile.accent_color;
            }
            const pdfBytes = await generateContractPdfBuffer(templateData);
            employeeAttachments = [{
              filename: `Contrat_signe_${CONTRACT_LABELS[tokenRecord.contract_type]}.pdf`,
              content: Buffer.from(pdfBytes),
            }];
          } catch { /* PDF generation failed, send without attachment */ }
        }

        const label = CONTRACT_LABELS[tokenRecord.contract_type] || 'Contrat';
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY) {
          const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
          const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

          const resend = new Resend(RESEND_API_KEY);
          await resend.emails.send({
            from: `${senderName} <${senderEmail}>`,
            to: [employeeEmail],
            subject: `Votre ${label} signé`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background:#1D9E75;padding:20px 24px;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;font-size:18px;">Contrat signé avec succès</h2>
                </div>
                <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
                  <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Bonjour <strong>${signerName}</strong>,
                  </p>
                  <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
                    Votre ${label} a été signé électroniquement avec succès. Les deux parties ont apposé leur signature.
                  </p>
                  <p style="font-size:13px;color:#666;margin:0 0 16px;">
                    Vous trouverez le contrat signé en pièce jointe de cet email. Conservez-le précieusement.
                  </p>
                  <p style="font-size:12px;color:#888;margin:0;">
                    Signature horodatée le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                  </p>
                  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
                  <p style="font-size:11px;color:#aaa;margin:0;">Document généré par Factu.me — Signature électronique conforme eIDAS</p>
                </div>
              </div>
            `,
            attachments: employeeAttachments.length > 0 ? employeeAttachments : undefined,
          });
        }
      }
    } catch (empEmailErr) {
      console.error('Erreur notification salarié:', empEmailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
