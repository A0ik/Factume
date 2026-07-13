import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendReminderEmail } from '@/lib/reminders';

/**
 * ARGOS (CIBLE 5 — Relances) — Cron quotidien des relances automatiques.
 *  1. Marque 'overdue' les factures 'sent' dont l'échéance est passée + notifie l'utilisateur.
 *  2. POUR CHAQUE utilisateur ayant activé les relances (reminders_config.enabled = true),
 *     envoie automatiquement la relance au niveau atteint (J+3 / J+7 / J+15) si elle n'a
 *     pas déjà été envoyée à ce niveau (anti-doublon via reminders_log).
 * L'activation est manuelle (toggle dans le popup Relances de /documents).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayIso = now.toISOString();

  // 1. Factures envoyées dont l'échéance est passée → marquer overdue + notifier.
  const { data: newlyOverdue, error: overdueError } = await admin
    .from('invoices')
    .select('id, number, user_id, due_date, status')
    .eq('status', 'sent')
    .lt('due_date', todayIso);

  if (overdueError) {
    console.error('[cron/reminders] overdue fetch error:', overdueError);
    return NextResponse.json({ error: overdueError.message }, { status: 500 });
  }

  let markedOverdue = 0;
  for (const inv of newlyOverdue || []) {
    const { error: updateError } = await admin
      .from('invoices')
      .update({ status: 'overdue', updated_at: todayIso })
      .eq('id', inv.id);
    if (updateError) {
      console.error(`[cron/reminders] update error ${inv.id}:`, updateError);
      continue;
    }
    const dueDate = new Date(inv.due_date || todayIso);
    const daysLate = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const message = `Facture ${inv.number} en retard de ${daysLate} jour${daysLate > 1 ? 's' : ''}`;
    // ATHÉNA (C3) — on n'utilise QUE les colonnes canoniques de notifications
    // (title/message/type/read/link/created_at). Un insert avec `data: {...}` échouait
    // silencieusement car la colonne n'existe pas → la notif « en retard » ne
    // s'affichait JAMAIS (auto-relances qui semblent ne pas fonctionner).
    const { error: notifError } = await admin.from('notifications').insert({
      user_id: inv.user_id,
      type: 'overdue_invoice',
      title: 'Facture en retard',
      message,
      link: `/invoices/${inv.id}`,
      read: false,
      created_at: todayIso,
    });
    if (notifError) console.warn('[cron/reminders] notif insert error:', notifError.message);
    markedOverdue++;
  }

  // 2. Relances automatiques (utilisateurs ayant activé reminders_config.enabled).
  const { data: enabledConfigs } = await admin
    .from('reminders_config')
    .select('user_id, enabled, reminder_1_days, reminder_2_days, reminder_3_days, email_subject, email_message')
    .eq('enabled', true);

  const enabledUserIds = (enabledConfigs || []).map((c) => c.user_id).filter(Boolean);
  const configByUser = new Map((enabledConfigs || []).map((c) => [c.user_id, c]));

  let autoSent = 0;
  let autoSkipped = 0;
  let autoPendingEmail = 0;

  if (enabledUserIds.length > 0) {
    // Toutes les factures impayées (overdue) des utilisateurs ayant activé les relances.
    const { data: overdueInvoices } = await admin
      .from('invoices')
      .select('id, number, user_id, due_date, issue_date, total, status, client:clients(*)')
      .in('user_id', enabledUserIds)
      .in('status', ['sent', 'overdue']);

    if (overdueInvoices && overdueInvoices.length > 0) {
      const invoiceIds = overdueInvoices.map((i) => i.id);

      // Index des relances déjà envoyées par (invoice_id, level).
      const { data: logs } = await admin
        .from('reminders_log')
        .select('invoice_id, reminder_level, status')
        .in('invoice_id', invoiceIds)
        .eq('status', 'sent');

      const sentLevels = new Set<string>();
      for (const l of logs || []) {
        sentLevels.add(`${l.invoice_id}:${l.reminder_level}`);
      }

      // Profils par utilisateur (pour {company_name}).
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, company_name')
        .in('id', enabledUserIds);
      const profileByUser = new Map((profiles || []).map((p) => [p.id, p]));

      for (const invoice of overdueInvoices) {
        const config = configByUser.get(invoice.user_id);
        if (!config) continue;

        const dueDate = new Date(invoice.due_date || invoice.issue_date || todayIso);
        const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Niveau le plus élevé atteint (escalade).
        let targetLevel = 0;
        if (daysLate >= (config.reminder_3_days ?? 15)) targetLevel = 3;
        else if (daysLate >= (config.reminder_2_days ?? 7)) targetLevel = 2;
        else if (daysLate >= (config.reminder_1_days ?? 3)) targetLevel = 1;

        if (targetLevel === 0) { autoSkipped++; continue; }

        // Anti-doublon : déjà envoyé à ce niveau.
        if (sentLevels.has(`${invoice.id}:${targetLevel}`)) { autoSkipped++; continue; }

        const result = await sendReminderEmail({
          admin,
          userId: invoice.user_id,
          invoice,
          profile: profileByUser.get(invoice.user_id) || {},
          config,
          level: targetLevel,
          ip: 'cron',
          userAgent: 'factu-cron/1.0',
        });

        // ATHÉNA (C3) — un client sans email n'est plus un échec silencieux : la
        // relance est enregistrée (pending_email) + notifiée en in-app (idempotent
        // côté lib). On compte ces cas à part pour le reporting du cron.
        if (result.pendingEmail) autoPendingEmail++;
        else if (result.ok) autoSent++;
        else autoSkipped++;
      }
    }
  }

  return NextResponse.json({ markedOverdue, autoSent, autoSkipped, autoPendingEmail, processed: markedOverdue + autoSent });
}
