import { createAdminClient } from '@/lib/supabase-server';

/**
 * MONOLITH LOI 1+2 : Résolution serveur du cabinet actif.
 * Stratégie en cascade :
 * 1. Si activeCabinetId fourni → vérifier l'appartenance et retourner
 * 2. Sinon → lire profiles.active_cabinet_id en BDD
 * 3. Sinon → premier cabinet possédé
 * 4. Sinon → premier cabinet via membership
 * 5. Sinon → null (redirection création)
 */
export async function getCabinetForUser(userId: string, activeCabinetId?: string | null) {
  const admin = createAdminClient();

  // ── ÉTAPE 1 : Utiliser le cabinet actif explicite si fourni ──
  if (activeCabinetId) {
    // Vérifier que l'utilisateur est propriétaire OU membre
    const [owned, membership] = await Promise.all([
      admin.from('cabinets').select('*').eq('id', activeCabinetId).eq('owner_id', userId).maybeSingle(),
      admin.from('cabinet_members').select('cabinet_id, role').eq('cabinet_id', activeCabinetId).eq('user_id', userId).maybeSingle(),
    ]);

    if (owned.data) return owned.data;
    if (membership.data) {
      const { data } = await admin.from('cabinets').select('*').eq('id', membership.data.cabinet_id).single();
      if (data) return data;
    }
    // activeCabinetId invalide → fallback
  }

  // ── ÉTAPE 2 : Lire le cabinet actif depuis le profil BDD ──
  const { data: profile } = await admin
    .from('profiles')
    .select('active_cabinet_id')
    .eq('id', userId)
    .single();

  if (profile?.active_cabinet_id && profile.active_cabinet_id !== activeCabinetId) {
    const [owned, membership] = await Promise.all([
      admin.from('cabinets').select('*').eq('id', profile.active_cabinet_id).eq('owner_id', userId).maybeSingle(),
      admin.from('cabinet_members').select('cabinet_id, role').eq('cabinet_id', profile.active_cabinet_id).eq('user_id', userId).maybeSingle(),
    ]);

    if (owned.data) return owned.data;
    if (membership.data) {
      const { data } = await admin.from('cabinets').select('*').eq('id', membership.data.cabinet_id).single();
      if (data) return data;
    }
  }

  // ── ÉTAPE 3 : Premier cabinet possédé ──
  const { data: owned } = await admin
    .from('cabinets')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) return owned;

  // ── ÉTAPE 4 : Premier cabinet via membership ──
  const { data: membership } = await admin
    .from('cabinet_members')
    .select('cabinet_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
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
