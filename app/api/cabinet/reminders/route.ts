import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

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
      .select('id, status')
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

    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (err: any) {
    console.error('[reminders POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
