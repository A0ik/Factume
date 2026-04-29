import { NextRequest, NextResponse } from 'next/server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { to, contractType, employeeName, html, subject: customSubject, contractData } = await req.json();

    if (!to || !employeeName || !html) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré (RESEND_API_KEY manquante)' }, { status: 500 });
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@factu.me';
    const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

    const contractLabels: Record<string, string> = {
      cdi: 'CDI',
      cdd: 'CDD',
      other: 'Contrat de travail',
    };
    const contractLabel = contractLabels[contractType] || contractType || 'Contrat';

    let attachments: Array<{ filename: string; content: Buffer }> = [];
    if (contractData) {
      try {
        const _contractData = { ...contractData, contractType: contractType.toLowerCase() };
        const pdfBytes = await generateContractPdfBuffer(_contractData);
        attachments = [{
          filename: `Contrat_${contractLabel}_${employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          content: Buffer.from(pdfBytes),
        }];
      } catch (err) {
        console.error('Erreur génération PDF contrat (envoi sans pièce jointe):', err);
      }
    }

    const resend = new Resend(RESEND_API_KEY);
    const { data, error: resendError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [to],
      subject: customSubject || `Votre ${contractLabel} — ${employeeName}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (resendError) {
      console.error('[send-contract-email] Erreur Resend:', resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
