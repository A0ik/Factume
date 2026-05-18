'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import { Client, Invoice, InvoiceFormData, InvoiceStatus, DashboardStats, RecurringInvoice, UserProfile, InvoiceUpdateData } from '@/types';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface DataState {
  clients: Client[]; invoices: Invoice[]; recurringInvoices: RecurringInvoice[]; loading: boolean; stats: DashboardStats | null;
  fetchClients: () => Promise<void>; createClient: (data: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<Client>; bulkCreateClients: (items: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>[]) => Promise<Client[]>; updateClient: (id: string, data: Partial<Client>) => Promise<void>; deleteClient: (id: string) => Promise<void>;
  fetchInvoices: () => Promise<void>; createInvoice: (data: InvoiceFormData, profile: UserProfile, idempotencyId?: string) => Promise<Invoice>; updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>; updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>; deleteInvoice: (id: string) => Promise<void>; duplicateInvoice: (id: string, profile: UserProfile) => Promise<Invoice>; getNextInvoiceNumber: (prefix: string, count: number) => string;
  fetchRecurringInvoices: () => Promise<void>; createRecurringInvoice: (data: Omit<RecurringInvoice, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<RecurringInvoice>; updateRecurringInvoice: (id: string, data: Partial<RecurringInvoice>) => Promise<void>; deleteRecurringInvoice: (id: string) => Promise<void>;
  computeStats: () => void; clearData: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  clients: [], invoices: [], recurringInvoices: [], loading: false, stats: null,
  clearData: () => set({ clients: [], invoices: [], recurringInvoices: [], stats: null }),

  fetchClients: async () => {
    set({ loading: true });
    const timeout = new Promise<Client[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
    try {
      const data = await Promise.race([
        getSupabaseClient().from('clients').select('*').order('name'),
        timeout
      ]) as { data: Client[] };
      set({ clients: data.data || [] });
    } catch (error) {
      console.error('[fetchClients] Error:', error);
    } finally { set({ loading: false }); }
  },
  createClient: async (clientData) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('clients').insert({ ...clientData, user_id: user.id }).select().single();
    if (error) throw error;
    set((s) => ({ clients: [...s.clients, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data;
  },
  bulkCreateClients: async (items) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('clients').insert(items.map((c) => ({ ...c, user_id: user.id }))).select();
    if (error) throw error;
    set((s) => ({ clients: [...s.clients, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data || [];
  },
  updateClient: async (id, updates) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? data : c)) }));
  },
  deleteClient: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { error } = await getSupabaseClient().from('clients').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  },

  fetchInvoices: async () => {
    set({ loading: true });
    const timeout = new Promise<Invoice[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
    try {
      const data = await Promise.race([
        getSupabaseClient().from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false }),
        timeout
      ]) as { data: Invoice[] };
      set({ invoices: data.data || [] }); get().computeStats();
    } catch (error) {
      console.error('[fetchInvoices] Error:', error);
    } finally { set({ loading: false }); }
  },
  getNextInvoiceNumber: (prefix, n) => `${prefix}-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`,
  createInvoice: async (formData, profile, idempotencyId?: string) => {
    console.log('[createInvoice] START', { hasProfile: !!profile, profileId: profile?.id, idempotencyId });
    if (!profile?.id) {
      throw new Error('Profil utilisateur introuvable. Veuillez recharger la page.');
    }
    const userId = profile.id;

    const items = formData.items.map((item) => {
      const lineTotal = item.quantity * item.unit_price;
      const lineDisc = (item as any).discount_percent ? lineTotal * ((item as any).discount_percent / 100) : 0;
      return { ...item, id: generateId(), total: lineTotal - lineDisc };
    });
    const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const vatAmount = items.reduce((s, i) => s + i.total * (i.vat_rate / 100), 0);
    const docType = formData.document_type || 'invoice';
    const prefix = docType === 'quote' ? 'DEVIS' : docType === 'credit_note' ? 'AVOIR' : docType === 'purchase_order' ? 'BC' : docType === 'delivery_note' ? 'BL' : (profile.invoice_prefix || 'FACT');
    // Remise globale appliquee sur le HT apres remises par ligne, puis TVA recalculee
    const subtotalAfterLineDiscounts = items.reduce((s, i) => s + i.total, 0);
    const discountAmount = formData.discount_percent ? subtotalAfterLineDiscounts * (formData.discount_percent / 100) : 0;
    const discountedSubtotal = subtotalAfterLineDiscounts - discountAmount;
    const recalculatedVat = items.reduce((s, i) => {
      const afterGlobalDisc = i.total * (formData.discount_percent ? 1 - formData.discount_percent / 100 : 1);
      return s + afterGlobalDisc * (i.vat_rate / 100);
    }, 0);
    const finalIdempotencyId = idempotencyId || crypto.randomUUID();
    const finalTotal = discountedSubtotal + recalculatedVat;

    // Approche 1: Server-side API (fiable, pas de problème Web Locks)
    console.log('[createInvoice] Using server-side API route...');
    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: formData.client_id || null,
          client_name_override: formData.client_name_override || null,
          document_type: docType,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          items,
          subtotal: discountedSubtotal,
          vat_amount: recalculatedVat,
          discount_percent: formData.discount_percent || null,
          discount_amount: discountAmount || null,
          total: finalTotal,
          notes: formData.notes || null,
          prefix,
          linked_invoice_id: formData.linked_invoice_id || null,
          idempotency_id: finalIdempotencyId,
        }),
      });

      const result = await response.json();
      console.log('[createInvoice] Server API response:', { status: response.status, hasInvoice: !!result.invoice, error: result.error });

      if (!response.ok || result.error) {
        throw new Error(result.error || `Erreur serveur (${response.status})`);
      }

      const data = result.invoice;

      (async () => {
        try {
          const { data: freshProfile } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
          if (freshProfile) useAuthStore.getState().setProfile(freshProfile);
        } catch {}
      })();

      set((s) => ({ invoices: [data, ...s.invoices] }));
      get().computeStats();
      console.log('[createInvoice] SUCCESS via server API', data.id);
      return data;
    } catch (serverError: any) {
      console.warn('[createInvoice] Server API failed:', serverError?.message, '— trying direct RPC...');

      // Approche 2: Direct RPC (fallback)
      try {
        const { data: invoiceId, error: rpcError } = await getSupabaseClient()
          .rpc('create_invoice_atomique', {
            p_user_id: userId,
            p_client_id: formData.client_id || null,
            p_client_name_override: formData.client_name_override || null,
            p_document_type: docType,
            p_status: 'draft',
            p_issue_date: formData.issue_date,
            p_due_date: formData.due_date || null,
            p_items: items,
            p_subtotal: discountedSubtotal,
            p_vat_amount: recalculatedVat,
            p_discount_percent: formData.discount_percent || null,
            p_discount_amount: discountAmount || null,
            p_total: finalTotal,
            p_notes: formData.notes || null,
            p_prefix: prefix,
            p_linked_invoice_id: formData.linked_invoice_id || null,
            p_idempotency_id: finalIdempotencyId,
          });

        if (rpcError || !invoiceId) {
          throw new Error(rpcError?.message || 'Impossible de créer la facture');
        }

        const { data, error } = await getSupabaseClient()
          .from('invoices')
          .select('*, client:clients(*)')
          .eq('id', invoiceId)
          .single();

        if (error || !data) {
          throw new Error('Impossible de récupérer la facture créée');
        }

        (async () => {
          try {
            const { data: freshProfile } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
            if (freshProfile) useAuthStore.getState().setProfile(freshProfile);
          } catch {}
        })();

        set((s) => ({ invoices: [data, ...s.invoices] }));
        get().computeStats();
        console.log('[createInvoice] SUCCESS via direct RPC', data.id);
        return data;
      } catch (rpcError: any) {
        console.error('[createInvoice] Both methods failed. Server:', serverError?.message, 'RPC:', rpcError?.message);
        throw new Error(serverError?.message || rpcError?.message || 'Impossible de créer la facture');
      }
    }
  },
  updateInvoice: async (id, updates) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    let u: InvoiceUpdateData = { ...updates, updated_at: new Date().toISOString() } as InvoiceUpdateData;
    if (updates.items) {
      const items = updates.items.map((i) => {
        const lineTotal = i.quantity * i.unit_price;
        const lineDisc = (i as any).discount_percent ? lineTotal * ((i as any).discount_percent / 100) : 0;
        return { ...i, total: lineTotal - lineDisc };
      });
      const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
      const subtotalAfterLineDiscounts = items.reduce((s, i) => s + i.total, 0);
      const existing = get().invoices.find((inv) => inv.id === id);
      const discPct = updates.discount_percent ?? existing?.discount_percent ?? 0;
      const discAmt = discPct > 0 ? subtotalAfterLineDiscounts * (discPct / 100) : 0;
      const discountedSubtotal = subtotalAfterLineDiscounts - discAmt;
      const vat = items.reduce((s, i) => {
        const afterGlobalDisc = i.total * (discPct > 0 ? 1 - discPct / 100 : 1);
        return s + afterGlobalDisc * (i.vat_rate / 100);
      }, 0);
      u = { ...u, items, subtotal: discountedSubtotal, vat_amount: vat, discount_percent: discPct || null, discount_amount: discAmt || null, total: discountedSubtotal + vat };
    }
    const { data, error } = await getSupabaseClient().from('invoices').update(u).eq('id', id).eq('user_id', user.id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  updateInvoiceStatus: async (id, status) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const u: Partial<Invoice> & { updated_at: string; paid_at?: string; sent_at?: string } = { status, updated_at: new Date().toISOString() };
    if (status === 'paid') u.paid_at = new Date().toISOString();
    if (status === 'sent') u.sent_at = new Date().toISOString();
    const { data, error } = await getSupabaseClient().from('invoices').update(u).eq('id', id).eq('user_id', user.id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  deleteInvoice: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Non authentifié');

    // Récupérer le profil pour vérifier le plan
    const { data: profile } = await getSupabaseClient().from('profiles').select('subscription_tier, is_trial_active, monthly_invoice_count, invoice_month').eq('id', user.id).single();

    if (!profile) throw new Error('Profil introuvable');

    // Empêcher la suppression pour les utilisateurs gratuits et en essai
    const canDelete = profile.subscription_tier !== 'free' && !profile.is_trial_active;
    if (!canDelete) {
      if (profile.is_trial_active) {
        throw new Error('La suppression de documents n\'est pas disponible pendant l\'essai gratuit. Passez à un abonnement pour débloquer cette fonctionnalité.');
      }
      throw new Error('Les utilisateurs du plan gratuit ne peuvent pas supprimer de documents. Passez à un abonnement payant pour débloquer cette fonctionnalité.');
    }

    const { error } = await getSupabaseClient().from('invoices').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) })); get().computeStats();
  },
  duplicateInvoice: async (id, profile) => {
    const original = get().invoices.find((inv) => inv.id === id);
    if (!original) throw new Error('Facture introuvable');
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(); due.setDate(due.getDate() + 30);
    const docType = original.document_type || 'invoice';
    const prefix = docType === 'quote' ? 'DEVIS' : docType === 'credit_note' ? 'AVOIR' : docType === 'purchase_order' ? 'BC' : docType === 'delivery_note' ? 'BL' : (profile.invoice_prefix || 'FACT');

    // CRITIQUE: Utiliser la fonction atomique pour garantir l'unicité du numéro
    // Cela élimine toute race condition lors de la duplication
    const { data: invoiceId, error: rpcError } = await getSupabaseClient()
      .rpc('create_invoice_atomique', {
        p_user_id: user.id,
        p_client_id: original.client_id || null,
        p_client_name_override: original.client_name_override || null,
        p_document_type: docType,
        p_status: 'draft',
        p_issue_date: today,
        p_due_date: due.toISOString().split('T')[0],
        p_items: original.items,
        p_subtotal: original.subtotal,
        p_vat_amount: original.vat_amount,
        p_discount_percent: original.discount_percent || null,
        p_discount_amount: original.discount_amount || null,
        p_total: original.total,
        p_notes: original.notes || null,
        p_prefix: prefix,
        p_linked_invoice_id: null
      });

    if (rpcError || !invoiceId) {
      console.error('[duplicateInvoice] Atomic create error:', rpcError);
      throw new Error(rpcError?.message || 'Impossible de dupliquer la facture');
    }

    // Récupérer la facture créée
    const { data, error } = await getSupabaseClient()
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (error || !data) {
      console.error('[duplicateInvoice] Fetch error:', error);
      throw new Error('Impossible de récupérer la facture dupliquée');
    }

    set((s) => ({ invoices: [data, ...s.invoices] })); get().computeStats(); return data;
  },
  fetchRecurringInvoices: async () => {
    set({ loading: true });
    const timeout = new Promise<RecurringInvoice[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
    try {
      const data = await Promise.race([
        getSupabaseClient().from('recurring_invoices').select('*, client:clients(*)').order('next_run_date', { ascending: true }),
        timeout
      ]) as { data: RecurringInvoice[] };
      set({ recurringInvoices: data.data || [] });
    } catch (error) {
      console.error('[fetchRecurringInvoices] Error:', error);
    } finally { set({ loading: false }); }
  },
  createRecurringInvoice: async (recData) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('recurring_invoices').insert({ ...recData, user_id: user.id }).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ recurringInvoices: [...s.recurringInvoices, data] })); return data;
  },
  updateRecurringInvoice: async (id, updates) => {
    const { data, error } = await getSupabaseClient().from('recurring_invoices').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ recurringInvoices: s.recurringInvoices.map((r) => (r.id === id ? data : r)) }));
  },
  deleteRecurringInvoice: async (id) => {
    const { error } = await getSupabaseClient().from('recurring_invoices').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ recurringInvoices: s.recurringInvoices.filter((r) => r.id !== id) }));
  },
  computeStats: () => {
    const { invoices } = get();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filtrer uniquement les factures (pas les devis, avoirs, etc.)
    const actualInvoices = invoices.filter((i) =>
      !i.document_type || i.document_type === 'invoice'
    );

    const paid = actualInvoices.filter((i) => i.status === 'paid');
    const pending = actualInvoices.filter((i) => i.status === 'sent');
    const overdue = actualInvoices.filter((i) =>
      i.status === 'sent' && i.due_date && new Date(i.due_date) < now
    );

    // MRR basé sur la date de paiement (paid_at) et non la date de création
    const mrr = paid
      .filter((i) => i.paid_at && new Date(i.paid_at) >= startOfMonth)
      .reduce((s, i) => s + i.total, 0);

    set({
      stats: {
        mrr,
        pendingCount: pending.length,
        paidCount: paid.length,
        overdueCount: overdue.length,
        totalRevenue: paid.reduce((s, i) => s + i.total, 0),
        pendingRevenue: pending.reduce((s, i) => s + i.total, 0),
      },
    });
  },
}));
