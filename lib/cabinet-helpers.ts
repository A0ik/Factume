import { createAdminClient } from '@/lib/supabase-server';

export async function getCabinetForUser(userId: string) {
  const admin = createAdminClient();

  const { data: owned } = await admin
    .from('cabinets')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (owned) return owned;

  const { data: membership } = await admin
    .from('cabinet_members')
    .select('cabinet_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) return null;

  const { data } = await admin
    .from('cabinets')
    .select('*')
    .eq('id', membership.cabinet_id)
    .single();

  return data;
}

export async function getCabinetClients(cabinetId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from('cabinet_clients')
    .select('*, profile:profiles!client_user_id(id, email, company_name, first_name, last_name)')
    .eq('cabinet_id', cabinetId)
    .order('invited_at', { ascending: false });

  return data || [];
}

export async function getClientAggregatedData(clientUserId: string) {
  const admin = createAdminClient();

  const [invoices, expenses, bankTx] = await Promise.all([
    admin.from('invoices').select('id, total, status, document_type, issue_date').eq('user_id', clientUserId).order('issue_date', { ascending: false }).limit(50),
    admin.from('expenses').select('id, amount, category, date').eq('user_id', clientUserId).order('date', { ascending: false }).limit(50),
    admin.from('bank_transactions').select('id, amount, transaction_date, label, status').eq('user_id', clientUserId).order('transaction_date', { ascending: false }).limit(50),
  ]);

  const totalRevenue = (invoices.data || []).filter((i) => i.document_type === 'invoice' && i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalExpenses = (expenses.data || []).reduce((s, e) => s + Number(e.amount), 0);
  const pendingInvoices = (invoices.data || []).filter((i) => i.status === 'sent' || i.status === 'overdue').length;
  const overdueInvoices = (invoices.data || []).filter((i) => i.status === 'overdue').length;
  const unreconciledTx = (bankTx.data || []).filter((t) => t.status === 'unreconciled').length;

  return {
    invoices: invoices.data || [],
    expenses: expenses.data || [],
    bankTransactions: bankTx.data || [],
    stats: {
      totalRevenue,
      totalExpenses,
      netBalance: totalRevenue - totalExpenses,
      totalInvoices: (invoices.data || []).length,
      totalExpensesCount: (expenses.data || []).length,
      pendingInvoices,
      overdueInvoices,
      unreconciledTransactions: unreconciledTx,
    },
  };
}
