import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';

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

    // Verifier que le contrat appartient a l'utilisateur
    const { data: contract, error: contractError } = await admin
      .from(TABLE_MAP[contractType])
      .select('id, user_id, employee_email')
      .eq('id', contractId)
      .single();

    if (contractError || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }

    // Invalider les anciens tokens non signes pour ce contrat
    await admin
      .from('contract_signing_tokens')
      .delete()
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .is('signed_at', null);

    // Creer un nouveau token
    const { data: tokenData, error: tokenError } = await admin
      .from('contract_signing_tokens')
      .insert({
        contract_id: contractId,
        contract_type: contractType,
        user_id: user.id,
        employee_email: employeeEmail.trim(),
      })
      .select('token')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Erreur lors de la création du token' }, { status: 500 });
    }

    // Generer le PDF du contrat
    let attachment = undefined;
    try {
      const { data: fullContract } = await admin
        .from(TABLE_MAP[contractType])
        .select('*')
        .eq('id', contractId)
        .single();

      if (fullContract) {
        const pdfBytes = await generateContractPdfBuffer({ ...fullContract, contractType });
        attachment = [{
          content: Buffer.from(pdfBytes).toString('base64'),
          name: `Contrat_${CONTRACT_LABELS[contractType]}_${employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        }];
      }
    } catch (err) {
      console.error('Erreur generation PDF:', err);
    }

    // Construire le lien de signature
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
    const signingUrl = `${appUrl}/sign/${tokenData.token}`;
    const label = CONTRACT_LABELS[contractType] || 'Contrat';

    // Envoyer l'email via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 });
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@factu.me';
    const senderName = process.env.BREVO_SENDER_NAME || 'Factu.me';

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

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: employeeEmail.trim(), name: employeeName }],
        subject: `Demande de signature — Votre ${label}`,
        htmlContent,
        attachment,
      }),
    });

    if (!brevoRes.ok) {
      let errBody: { message?: string } = {};
      try { errBody = await brevoRes.json(); } catch { /* empty */ }
      return NextResponse.json({ error: errBody.message || 'Erreur Brevo' }, { status: brevoRes.status });
    }

    // Mettre a jour le statut du contrat
    await admin
      .from(TABLE_MAP[contractType])
      .update({ document_status: 'pending_signature', updated_at: new Date().toISOString() })
      .eq('id', contractId);

    return NextResponse.json({ success: true, token: tokenData.token });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
