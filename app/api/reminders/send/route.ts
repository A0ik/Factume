import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId, reminderLevel = 1, confirmed = false } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId manquant' }, { status: 400 });
    }

    // LOI 3 : L'IA PROPOSE, L'HUMAIN DISPOSE
    // L'envoi d'une relance DOIT être explicitement confirmé par l'utilisateur.
    // Un email ne doit JAMAIS partir sans validation humaine (risque de relancer
    // une facture déjà payée, ton inadapté, détérioration relation commerciale).
    if (!confirmed) {
      return NextResponse.json({
        error: 'Confirmation requise',
        message: 'Vous devez confirmer l\'envoi de cette relance. Passez confirmed: true dans le body.',
        requiresConfirmation: true,
      }, { status: 400 });
    }

    // Récupérer la facture avec les infos client
    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Vérifier que l'utilisateur a le droit d'envoyer cette relance
    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier que la facture est en retard
    if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
      return NextResponse.json({ error: 'Cette facture n\'est pas en retard' }, { status: 400 });
    }

    // Récupérer la configuration des relances
    const { data: config } = await admin
      .from('reminders_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!invoice.client?.email) {
      return NextResponse.json({ error: 'Aucun email client associé' }, { status: 400 });
    }

    // Calculer le nombre de jours de retard
    const dueDate = new Date(invoice.due_date || invoice.issue_date);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Préparer le sujet et le message
    const emailSubject = (config?.email_subject || 'Rappel: Facture {invoice_number} en retard')
      .replace('{invoice_number}', invoice.number || 'N/A')
      .replace('{client_name}', invoice.client.name || '');

    const emailMessage = (config?.email_message || '')
      .replace('{client_name}', invoice.client.name || '')
      .replace('{invoice_number}', invoice.number || 'N/A')
      .replace('{amount}', (invoice.total || 0).toFixed(2))
      .replace('{days_overdue}', daysOverdue.toString())
      .replace('{company_name}', profile?.company_name || 'Mon entreprise');

    // Envoyer l'email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 });
    }

    const resend = new Resend(RESEND_API_KEY);
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
    const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [invoice.client.email],
      subject: emailSubject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <div style="background:#EF4444;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Rappel de paiement</h2>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Facture n° ${invoice.number}</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
            <p style="font-size:16px;margin:0 0 24px;">Bonjour ${invoice.client.name || ''},</p>

            <div style="background:#FEF2F2;padding:16px;border-radius:8px;margin:24px 0;border-left:4px solid #EF4444;">
              <p style="font-size:14px;color:#991B1B;margin:0;">
                <strong>Facture en retard de ${daysOverdue} jours</strong>
              </p>
              <p style="font-size:24px;font-weight:bold;color:#991B1B;margin:8px 0;">
                ${(invoice.total || 0).toFixed(2)}€
              </p>
            </div>

            <div style="margin:24px 0;">
              ${escapeHtml(emailMessage).replace(/\n/g, '<br>')}
            </div>

            <div style="text-align:center;margin:32px 0;">
              <p style="font-size:12px;color:#888;margin:0;">Cet email a été envoyé via Factu.me</p>
            </div>
          </div>
        </div>
      `,
    });

    if (emailError) {
      // Logger l'erreur
      await admin.from('reminders_log').insert({
        invoice_id: invoiceId,
        user_id: user.id,
        reminder_level: reminderLevel,
        email_to: invoice.client.email,
        email_subject: emailSubject,
        status: 'failed',
        error_message: emailError.message,
      });

      return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 });
    }

    // Logger la relance
    await admin.from('reminders_log').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      reminder_level: reminderLevel,
      email_to: invoice.client.email,
      email_subject: emailSubject,
      status: 'sent',
      metadata: { message_id: emailData?.id },
    });

    // Mettre à jour le statut via le RPC atomique (conforme PAF)
    const { error: transitionError } = await admin.rpc('transition_invoice_status', {
      p_invoice_id: invoiceId,
      p_user_id: user.id,
      p_new_status: 'overdue',
      p_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || '',
    });
    if (transitionError) {
      console.warn('[Reminders] Transition error:', transitionError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Relance envoyée avec succès',
      reminderLevel,
      emailTo: invoice.client.email,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
