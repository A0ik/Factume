import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    // Fetch overdue or past-due sent invoices for this cabinet
    const today = new Date().toISOString().split('T')[0];

    const { data: invoices, error: invoicesError } = await admin
      .from('cabinet_invoices')
      .select('*, client:cabinet_clients(id, profile:profiles!client_user_id(company_name, first_name, last_name))')
      .eq('cabinet_id', cabinet.id)
      .or(`status.eq.overdue,and(status.eq.sent,due_date.lt.${today})`)
      .order('due_date', { ascending: true });

    if (invoicesError) {
      console.error('[reminders GET] Invoices query error:', invoicesError);
      // Table might not exist yet
      if (invoicesError.code === '42P01') {
        return NextResponse.json({ invoices: [], summary: { total_overdue: 0, total_amount: 0, level_1_count: 0, level_2_count: 0, level_3_count: 0 } });
      }
      throw invoicesError;
    }

    // Fetch all reminders for these invoices
    const invoiceIds = (invoices || []).map((inv: any) => inv.id);

    let reminders: any[] = [];
    if (invoiceIds.length > 0) {
      const { data: remindersData, error: remindersError } = await admin
        .from('cabinet_reminders')
        .select('*')
        .eq('cabinet_id', cabinet.id)
        .in('invoice_id', invoiceIds)
        .order('sent_at', { ascending: true });

      if (remindersError) {
        console.error('[reminders GET] Reminders query error:', remindersError);
        if (remindersError.code === '42P01') {
          return NextResponse.json({ invoices: [], summary: { total_overdue: 0, total_amount: 0, level_1_count: 0, level_2_count: 0, level_3_count: 0 } });
        }
        throw remindersError;
      }
      reminders = remindersData || [];
    }

    // Group reminders by invoice_id
    const remindersByInvoice: Record<string, any[]> = {};
    for (const r of reminders) {
      if (!remindersByInvoice[r.invoice_id]) remindersByInvoice[r.invoice_id] = [];
      remindersByInvoice[r.invoice_id].push(r);
    }

    // Calculate days overdue and build flat invoice list
    const allOverdue: any[] = [];

    for (const inv of invoices || []) {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      if (!dueDate) continue;

      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue < 1) continue;

      const invReminders = remindersByInvoice[inv.id] || [];
      const maxLevel = invReminders.length > 0
        ? Math.max(...invReminders.map((r: any) => r.level || 0))
        : 0;

      allOverdue.push({
        id: inv.id,
        number: inv.number || '',
        client_name: inv.client?.profile?.company_name
          || [inv.client?.profile?.first_name, inv.client?.profile?.last_name].filter(Boolean).join(' ')
          || 'Client',
        client_email: inv.client?.profile?.email || undefined,
        total: inv.amount_ttc || inv.total || 0,
        due_date: inv.due_date,
        issue_date: inv.issue_date || '',
        days_overdue: daysOverdue,
        reminder_level: maxLevel as 0 | 1 | 2 | 3,
        last_reminder_date: invReminders.length > 0
          ? invReminders[invReminders.length - 1].sent_at || null
          : null,
      });
    }

    const level1 = allOverdue.filter((i) => i.days_overdue > 7).length;
    const level2 = allOverdue.filter((i) => i.days_overdue > 30).length;
    const level3 = allOverdue.filter((i) => i.days_overdue > 60).length;
    const totalAmount = allOverdue.reduce((sum, i) => sum + i.total, 0);

    return NextResponse.json({
      invoices: allOverdue,
      summary: {
        total_overdue: allOverdue.length,
        total_amount: totalAmount,
        level_1_count: level1,
        level_2_count: level2,
        level_3_count: level3,
      },
    });
  } catch (err: any) {
    console.error('[reminders GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { invoice_id, level, notes } = body;

    if (!invoice_id || !level) {
      return NextResponse.json(
        { error: 'invoice_id et level sont requis' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(level)) {
      return NextResponse.json(
        { error: 'Le level doit être 1, 2 ou 3' },
        { status: 400 }
      );
    }

    // Verify the invoice belongs to this cabinet
    const { data: invoice, error: invoiceError } = await admin
      .from('cabinet_invoices')
      .select('id, status, number, amount_ttc, due_date, issue_date, client_id')
      .eq('id', invoice_id)
      .eq('cabinet_id', cabinet.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    // Create the reminder record
    const { data: reminder, error: reminderError } = await admin
      .from('cabinet_reminders')
      .insert({
        cabinet_id: cabinet.id,
        invoice_id,
        level,
        sent_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (reminderError) {
      console.error('[reminders POST] Insert error:', reminderError);
      if (reminderError.code === '42P01') {
        return NextResponse.json(
          { error: 'Table des relances non configurée' },
          { status: 503 }
        );
      }
      throw reminderError;
    }

    // Update invoice status to 'overdue' if not already
    if (invoice.status !== 'overdue') {
      const { error: updateError } = await admin
        .from('cabinet_invoices')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .eq('id', invoice_id);

      if (updateError) {
        console.error('[reminders POST] Status update error:', updateError);
      }
    }

    // ARGOS (CIBLE 5) — Envoi réel de la relance par email. cabinet_invoices est un résumé
    // dénormalisé SANS l'email du débiteur final (client_id → cabinet_clients = le gérant).
    // La relance notifie donc le CLIENT DU CABINET (le gérant) que sa facture est en retard,
    // avec la note du comptable. C'est le seul ciblage correct avec ce schéma ; aucun email
    // ne part vers une mauvaise personne. Non bloquant si l'envoi échoue (l'audit reste créé).
    try {
      let clientEmail: string | null = null;
      let clientName = 'Client';
      if (invoice.client_id) {
        const { data: cabClient } = await admin
          .from('cabinet_clients')
          .select('profile:profiles!client_user_id(email, company_name, first_name, last_name)')
          .eq('id', invoice.client_id)
          .maybeSingle();
        const p = (cabClient as any)?.profile;
        clientEmail = p?.email || null;
        clientName = p?.company_name
          || [p?.first_name, p?.last_name].filter(Boolean).join(' ')
          || 'Client';
      }

      const { data: cabRow } = await admin
        .from('cabinets')
        .select('name')
        .eq('id', cabinet.id)
        .maybeSingle();
      const cabinetName = cabRow?.name || 'Votre cabinet comptable';

      const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY && clientEmail) {
        const daysOverdue = invoice.due_date
          ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000))
          : 0;
        const amountFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(invoice.amount_ttc) || 0);
        const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

        const resend = new Resend(RESEND_API_KEY);
        const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
        await resend.emails.send({
          from: `${cabinetName} <${senderEmail}>`,
          to: [clientEmail],
          subject: `Relance — Facture ${invoice.number || ''} en retard de ${daysOverdue} jour(s)`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
              <div style="background:#EF4444;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                <h2 style="color:#fff;margin:0;font-size:20px;">Relance de paiement</h2>
                <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Signalée par ${esc(cabinetName)}</p>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
                <p style="font-size:16px;margin:0 0 16px;">Bonjour ${esc(clientName)},</p>
                <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
                  Votre expert-comptable vous signale que la <strong>facture n° ${esc(invoice.number || '')}</strong>
                  d'un montant de <strong>${amountFmt}</strong> est en retard de <strong>${daysOverdue} jour(s)</strong>
                  (échéance : ${fmtDate(invoice.due_date)}).
                </p>
                ${notes ? `<div style="background:#FEF2F2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #EF4444;"><p style="font-size:13px;margin:0;"><strong>Note de votre comptable :</strong> ${esc(notes)}</p></div>` : ''}
                <p style="font-size:14px;color:#6b7280;margin:0;">Pensez à relancer votre client pour le règlement.</p>
                <p style="font-size:12px;color:#aaa;margin:24px 0 0;">Cet email a été envoyé via Factu.me — ${esc(cabinetName)}</p>
              </div>
            </div>
          `,
        });
      } else if (!clientEmail) {
        console.warn('[reminders POST] Aucun email client trouvé — relance enregistrée sans envoi.');
      }
    } catch (emailErr) {
      console.error('[reminders POST] Email send error:', emailErr);
      // Non bloquant : l'enregistrement de relance (audit) est déjà créé.
    }

    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (err: any) {
    console.error('[reminders POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
