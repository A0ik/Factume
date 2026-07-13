import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';

// ARGOS (CIBLE 5 — Relances) — Logique unique d'envoi d'une relance email.
// Utilisée par : /api/reminders/send (manuel unitaire), /api/reminders/batch-send
// (manuel multi-sélection), /api/cron/reminders (automatique). Une seule source de vérité
// pour le template, les variables {invoice_number}... et le log reminders_log.

export interface ReminderInvoice {
  id: string;
  user_id: string;
  number?: string | null;
  status?: string | null;
  total?: number | null;
  due_date?: string | null;
  issue_date?: string | null;
  // ARGOS — Supabase `client:clients(*)` renvoie un tableau ; on accepte les deux formes
  // (la normalisation array→objet se fait dans sendReminderEmail, ligne ~72).
  client?:
    | { name?: string | null; email?: string | null }
    | Array<{ name?: string | null; email?: string | null }>
    | null;
}

export interface ReminderProfile {
  company_name?: string | null;
}

export interface ReminderConfig {
  email_subject?: string | null;
  email_message?: string | null;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function daysOverdueFor(invoice: ReminderInvoice): number {
  const due = new Date(invoice.due_date || invoice.issue_date || Date.now());
  const today = new Date();
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export interface SendReminderResult {
  ok: boolean;
  error?: string;
  messageId?: string;
  emailTo?: string;
  skipped?: boolean;
  /** ATHÉNA (C3) — client sans email : relance enregistrée, envoi en attente d'email. */
  pendingEmail?: boolean;
}

/**
 * Construit et envoie une relance pour une facture, logge dans reminders_log,
 * et bascule le statut en 'overdue' (RPC atomique PAF). Best-effort sur la transition.
 */
export async function sendReminderEmail(params: {
  admin: SupabaseClient;
  userId: string;
  invoice: ReminderInvoice;
  profile: ReminderProfile;
  config: ReminderConfig | null;
  level: number;
  ip?: string;
  userAgent?: string;
}): Promise<SendReminderResult> {
  const { admin, userId, invoice, profile, config, level, ip, userAgent } = params;

  // Supabase `client:clients(*)` renvoie un TABLEAU ; on normalise en objet unique.
  const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client;

  // ATHÉNA (CIBLE 3) — Dégradation gracieuse B2C / client sans email.
  // Avant : `return { ok:false, skipped:true }` → blocage des relances (cron, manuel,
  // batch) dès qu'un client n'avait pas d'email, ce qui est LÉGITIME en B2C
  // (particulier) et fréquent en B2B. Désormais on enregistre la relance en
  // 'pending_email' + on notifie le propriétaire en in-app (table notifications)
  // pour qu'il complète l'email. Idempotent : on ne recrée pas de log/notif si une
  // relance 'pending_email' existe déjà pour cette facture (anti-spam quotidien du
  // cron). Dès que l'utilisateur ajoute l'email, la prochaine relance s'envoie.
  if (!client?.email) {
    const clientName = client?.name || '';
    const { data: existingPending } = await admin.from('reminders_log')
      .select('id')
      .eq('invoice_id', invoice.id)
      .eq('status', 'pending_email')
      .limit(1);

    if (!existingPending || existingPending.length === 0) {
      await admin.from('reminders_log').insert({
        invoice_id: invoice.id,
        user_id: userId,
        reminder_level: level,
        email_to: null,
        email_subject: null,
        status: 'pending_email',
        metadata: {
          reason: 'no_client_email',
          client_name: clientName,
          invoice_number: invoice.number || null,
        },
      });

      // Notif in-app au propriétaire (collecte d'email). On n'utilise QUE les
      // colonnes canoniques de public.notifications (title/message/type/read/
      // link/created_at) — la table n'a PAS de colonne `data` (un insert avec
      // `data` échouerait silencieusement). Le `link` pointe vers la facture.
      const { error: notifError } = await admin.from('notifications').insert({
        user_id: userId,
        type: 'reminder_pending_email',
        title: 'Relance en attente d’email',
        message: `Email manquant pour ${clientName || 'ce client'} — facture ${invoice.number || 'N/A'}. Ajoutez l’email du client sur sa fiche pour envoyer la relance.`,
        link: `/invoices/${invoice.id}`,
        read: false,
        created_at: new Date().toISOString(),
      });
      if (notifError) console.warn('[reminders] notif insert error:', notifError.message);
    }

    // Transition overdue best-effort (la facture est bien en retard, email ou pas).
    const { error: transitionError } = await admin.rpc('transition_invoice_status', {
      p_invoice_id: invoice.id,
      p_user_id: userId,
      p_new_status: 'overdue',
      p_ip_address: ip || 'unknown',
      p_user_agent: userAgent || '',
    });
    if (transitionError) {
      console.warn('[reminders] transition error (pending_email):', transitionError.message);
    }

    return { ok: true, pendingEmail: true };
  }

  const daysOverdue = Math.max(0, daysOverdueFor(invoice));
  const emailSubject = (config?.email_subject || 'Rappel: Facture {invoice_number} en retard')
    .replace('{invoice_number}', invoice.number || 'N/A')
    .replace('{client_name}', client.name || '');

  const emailMessage = (config?.email_message || '')
    .replace('{client_name}', client.name || '')
    .replace('{invoice_number}', invoice.number || 'N/A')
    .replace('{amount}', (invoice.total || 0).toFixed(2))
    .replace('{days_overdue}', daysOverdue.toString())
    .replace('{company_name}', profile.company_name || 'Mon entreprise');

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'Service email non configuré' };
  }

  const resend = new Resend(RESEND_API_KEY);
  const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
  const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `${senderName} <${senderEmail}>`,
    to: [client.email],
    subject: emailSubject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#EF4444;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:20px;">Rappel de paiement</h2>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Facture n° ${escapeHtml(invoice.number || '')}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;margin:0 0 24px;">Bonjour ${escapeHtml(client.name || '')},</p>
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
    await admin.from('reminders_log').insert({
      invoice_id: invoice.id,
      user_id: userId,
      reminder_level: level,
      email_to: client.email,
      email_subject: emailSubject,
      status: 'failed',
      error_message: emailError.message,
    });
    return { ok: false, error: emailError.message };
  }

  await admin.from('reminders_log').insert({
    invoice_id: invoice.id,
    user_id: userId,
    reminder_level: level,
    email_to: client.email,
    email_subject: emailSubject,
    status: 'sent',
    metadata: { message_id: emailData?.id },
  });

  // Transition overdue (best-effort, RPC atomique PAF).
  const { error: transitionError } = await admin.rpc('transition_invoice_status', {
    p_invoice_id: invoice.id,
    p_user_id: userId,
    p_new_status: 'overdue',
    p_ip_address: ip || 'unknown',
    p_user_agent: userAgent || '',
  });
  if (transitionError) {
    console.warn('[reminders] transition error:', transitionError.message);
  }

  return { ok: true, messageId: emailData?.id, emailTo: client.email };
}
