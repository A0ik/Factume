import { NextRequest, NextResponse } from 'next/server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // ARGOS (CIBLE 4) — Ferme le relais email ouvert : auth + rate-limit obligatoires
    // (cohérent avec /api/send-invoice). Avant, un anon pouvait envoyer un email depuis
    // factu.me vers n'importe quel destinataire avec un body contrôlé (phishing/spoofing).
    const rl = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429 });
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { to, contractType, employeeName, html, subject: customSubject, contractData } = await req.json();

    if (!to || !employeeName || !html) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // ARGOS (sécurité) — Ferme le relais : le destinataire doit être le salarié du contrat.
    // Empêche d'utiliser cette route pour envoyer un email vers une adresse arbitraire.
    const employeeEmail = (contractData as any)?.employee_email;
    if (employeeEmail && to.toLowerCase().trim() !== String(employeeEmail).toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Le destinataire doit correspondre au salarié du contrat." },
        { status: 400 },
      );
    }

    // SAGE (CIBLE 5) — LOI : aucun envoi de contrat (même un simple email, sans
    // demande de signature) tant que l'employeur n'a pas signé. Cohérent avec le
    // gate /api/contract-signing/create et le trigger DB enforce_contract_signatures.
    const employerSig = (contractData as any)?.employer_signature;
    if (!employerSig || (typeof employerSig === 'string' && employerSig.trim() === '')) {
      return NextResponse.json(
        {
          error: "L'employeur doit signer le contrat avant tout envoi. Signez dans la section prévisualisation, puis renvoyez.",
          code: 'EMPLOYER_SIGNATURE_REQUIRED',
        },
        { status: 400 },
      );
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré (BREVO_API_KEY manquante)' }, { status: 500 });
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact@sociql.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Factu.me';

    const contractLabels: Record<string, string> = {
      cdi: 'CDI',
      cdd: 'CDD',
      other: 'Contrat de travail',
    };
    const contractLabel = contractLabels[contractType] || contractType || 'Contrat';

    let attachments: Array<{ content: string; name: string }> = [];
    if (contractData) {
      try {
        const _contractData = { ...contractData, contractType: contractType.toLowerCase() };
        const pdfBytes = await generateContractPdfBuffer(_contractData);
        attachments = [{
          content: Buffer.from(pdfBytes).toString('base64'),
          name: `Contrat_${contractLabel}_${employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        }];
      } catch (err) {
        console.error('Erreur génération PDF contrat (envoi sans pièce jointe):', err);
      }
    }

    const subject = customSubject || `Votre ${contractLabel} — ${employeeName}`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: employeeName }],
        subject,
        htmlContent: html,
        attachment: attachments.length > 0 ? attachments : undefined,
      }),
    });

    if (!brevoRes.ok) {
      let errBody: { message?: string } = {};
      try { errBody = await brevoRes.json(); } catch { /* empty */ }
      const statusCode = brevoRes.status;
      const errorMsg = `Brevo ${statusCode}: ${errBody.message || 'Erreur inconnue'}`;
      console.error('[send-contract-email] Erreur Brevo:', errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const data = await brevoRes.json();
    return NextResponse.json({ success: true, messageId: data.messageId });

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
