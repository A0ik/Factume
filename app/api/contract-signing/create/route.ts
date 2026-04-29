import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';
import { dbToContractTemplate } from '@/lib/labor-law/contract-data-utils';
import { Resend } from 'resend';

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

// Helper pour logger les événements de signature
async function logSignatureEvent(
  admin: any,
  contractId: string,
  contractType: string,
  eventType: string,
  tokenId: string | null = null,
  metadata: Record<string, any> = {},
  req?: NextRequest
) {
  try {
    await admin.from('contract_signature_logs').insert({
      contract_id: contractId,
      contract_type: contractType,
      token_id: tokenId,
      event_type: eventType,
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent') || null,
      metadata,
    });
  } catch (err) {
    // Ne pas échouer si le log échoue
    console.error('Erreur log signature:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contractId, contractType, employeeEmail, employeeName } = await req.json();

    if (!contractId || !contractType || !employeeEmail || !employeeName) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    if (!TABLE_MAP[contractType]) {
      return NextResponse.json({ error: 'Type de contrat invalide' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verifier l'authentification via le header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verifier que le contrat appartient a l'utilisateur et récupérer toutes les données
    const { data: contract, error: contractError } = await admin
      .from(TABLE_MAP[contractType])
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }

    // IMPORTANT : Vérifier que l'employeur a signé avant d'envoyer au salarié
    if (!contract.employer_signature) {
      return NextResponse.json({
        error: 'L\'employeur doit signer le contrat avant de l\'envoyer au salarié. Veuillez signer dans la section prévisualisation.',
        code: 'EMPLOYER_SIGNATURE_REQUIRED'
      }, { status: 400 });
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours (token non expiré)
    const { data: existingToken } = await admin
      .from('contract_signing_tokens')
      .select('id, token, expires_at')
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .is('signed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingToken) {
      // Une demande est déjà en cours, on renvoie le même token
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
      const signingUrl = `${appUrl}/sign/${existingToken.token}`;
      const expiresAt = new Date(existingToken.expires_at);

      return NextResponse.json({
        success: true,
        token: existingToken.token,
        alreadyExists: true,
        signingUrl,
        expiresAt: expiresAt.toISOString(),
        message: 'Une demande de signature est déjà en cours pour ce contrat.'
      });
    }

    // Invalider les anciens tokens expirés pour ce contrat
    await admin
      .from('contract_signing_tokens')
      .delete()
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .lt('expires_at', new Date().toISOString());

    // Creer un nouveau token
    const { data: tokenData, error: tokenError } = await admin
      .from('contract_signing_tokens')
      .insert({
        contract_id: contractId,
        contract_type: contractType,
        user_id: user.id,
        employee_email: employeeEmail.trim(),
      })
      .select('token, id, expires_at')
      .single();

    if (tokenError || !tokenData) {
      await logSignatureEvent(admin, contractId, contractType, 'token_creation_failed', null, { error: tokenError?.message }, req);
      return NextResponse.json({ error: 'Erreur lors de la création du token' }, { status: 500 });
    }

    // Log la création du token
    await logSignatureEvent(admin, contractId, contractType, 'token_created', tokenData.id, { token: tokenData.token }, req);

    // Generer le PDF du contrat
    let attachment: Array<{ filename: string; content: Buffer }> = [];
    try {
      const templateData = dbToContractTemplate(contract, contractType);
      const pdfBytes = await generateContractPdfBuffer(templateData);
      attachment = [{
        filename: `Contrat_${CONTRACT_LABELS[contractType]}_${employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: Buffer.from(pdfBytes),
      }];
    } catch (err) {
      console.error('Erreur generation PDF:', err);
    }

    // Construire le lien de signature
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
    const signingUrl = `${appUrl}/sign/${tokenData.token}`;
    const label = CONTRACT_LABELS[contractType] || 'Contrat';

    // Envoyer l'email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 });
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
    const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#1D9E75;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:20px;">Demande de signature</h2>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${label} — ${employeeName}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="font-size:16px;margin:0 0 24px;">Vous avez reçu un <strong>${label}</strong> à signer électroniquement.</p>
          <a href="${signingUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Signer le contrat
          </a>
          <p style="font-size:13px;color:#888;margin:24px 0 0;">Ce lien est valide pendant 7 jours.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:12px;color:#aaa;margin:0;">Ce document a été envoyé via Factu.me</p>
        </div>
      </div>
    `;

    let emailSent = false;
    let emailError = null;

    try {
      const resend = new Resend(RESEND_API_KEY);
      const { data, error: resendError } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to: [employeeEmail.trim()],
        subject: `Demande de signature — Votre ${label}`,
        html: htmlContent,
        attachments: attachment.length > 0 ? attachment : undefined,
      });

      if (resendError) {
        emailError = resendError.message || 'Erreur Resend';
        await logSignatureEvent(admin, contractId, contractType, 'email_failed', tokenData.id, { error: emailError }, req);
      } else {
        emailSent = true;
        await logSignatureEvent(admin, contractId, contractType, 'email_sent', tokenData.id, { recipient: employeeEmail.trim(), messageId: data?.id }, req);
      }
    } catch (emailErr) {
      emailError = emailErr instanceof Error ? emailErr.message : 'Erreur inconnue';
      await logSignatureEvent(admin, contractId, contractType, 'email_failed', tokenData.id, { error: emailError }, req);
    }

    // Mettre a jour le statut du contrat uniquement si l'email a été envoyé
    if (emailSent) {
      await admin
        .from(TABLE_MAP[contractType])
        .update({ document_status: 'pending_signature', updated_at: new Date().toISOString() })
        .eq('id', contractId);

      return NextResponse.json({
        success: true,
        token: tokenData.token,
        alreadyExists: false,
        signingUrl,
        expiresAt: tokenData.expires_at,
      });
    } else {
      // Email non envoyé mais token créé - on informe l'utilisateur
      return NextResponse.json({
        success: false,
        token: tokenData.token,
        error: emailError,
        retryable: true,
        message: 'Le token a été créé mais l\'email n\'a pas pu être envoyé. Vous pouvez réessayer.'
      }, { status: 202 }); // Accepted but with warning
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
