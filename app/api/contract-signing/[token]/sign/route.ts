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

        let attachment = undefined;
        if (fullContract) {
          try {
            const pdfBytes = await generateContractPdfBuffer({ ...fullContract, contractType: tokenRecord.contract_type });
            attachment = [{
              content: Buffer.from(pdfBytes).toString('base64'),
              name: `Contrat_signe_${CONTRACT_LABELS[tokenRecord.contract_type]}.pdf`,
            }];
          } catch { /* PDF generation failed, send without attachment */ }
        }

        const label = CONTRACT_LABELS[tokenRecord.contract_type] || 'Contrat';
        const BREVO_API_KEY = process.env.BREVO_API_KEY;
        if (BREVO_API_KEY) {
          const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@factu.me';
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
            body: JSON.stringify({
              sender: { name: 'Factu.me', email: senderEmail },
              to: [{ email: profile.email }],
              subject: `${label} signé par ${signerName}`,
              htmlContent: `
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
              attachment,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error('Erreur notification employeur:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
