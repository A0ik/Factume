'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import { Client, Invoice, InvoiceFormData, InvoiceStatus, DashboardStats, RecurringInvoice, UserProfile, InvoiceUpdateData } from '@/types';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface DataState {
  clients: Client[]; invoices: Invoice[]; recurringInvoices: RecurringInvoice[]; loading: boolean; stats: DashboardStats | null; error: string | null;
  fetchClients: () => Promise<void>; createClient: (data: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<Client>; bulkCreateClients: (items: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>[]) => Promise<Client[]>; updateClient: (id: string, data: Partial<Client>) => Promise<void>; deleteClient: (id: string) => Promise<void>;
  fetchInvoices: () => Promise<void>; createInvoice: (data: InvoiceFormData, profile: UserProfile, idempotencyId?: string) => Promise<Invoice>; updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>; updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>; deleteInvoice: (id: string) => Promise<void>; duplicateInvoice: (id: string, profile: UserProfile) => Promise<Invoice>;
  fetchRecurringInvoices: () => Promise<void>; createRecurringInvoice: (data: Omit<RecurringInvoice, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<RecurringInvoice>; updateRecurringInvoice: (id: string, data: Partial<RecurringInvoice>) => Promise<void>; deleteRecurringInvoice: (id: string) => Promise<void>;
  updateInvoiceInList: (updated: any) => void;
  computeStats: () => void; clearData: () => void;
}

// Centimes-arithmetic helpers — avoid floating-point errors for money
function cents(value: number): number { return Math.round(value * 100); }
function fromCents(c: number): number { return c / 100; }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }

const IMMUTABLE_STATUSES: InvoiceStatus[] = ['sent', 'paid', 'overdue', 'accepted', 'refused', 'cancelled', 'refunded', 'rejected', 'delivered'];

export const useDataStore = create<DataState>((set, get) => ({
  clients: [], invoices: [], recurringInvoices: [], loading: false, stats: null, error: null,
  clearData: () => set({ clients: [], invoices: [], recurringInvoices: [], stats: null, error: null }),

  fetchClients: async () => {
    set({ loading: true, error: null });
    const timeout = new Promise<Client[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
    try {
      const data = await Promise.race([
        getSupabaseClient().from('clients').select('*').order('name'),
        timeout
      ]) as { data: Client[] };
      set({ clients: data.data || [], error: null });
    } catch (error) {
      console.error('[fetchClients] Error:', error);
      set({ error: 'Impossible de charger vos clients. Vérifiez votre connexion.' });
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
    set({ loading: true, error: null });
    const timeout = new Promise<Invoice[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
    try {
      const data = await Promise.race([
        getSupabaseClient().from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false }),
        timeout
      ]) as { data: Invoice[] };
      set({ invoices: data.data || [], error: null }); get().computeStats();
    } catch (error) {
      console.error('[fetchInvoices] Error:', error);
      set({ error: 'Impossible de charger vos factures. Vérifiez votre connexion.' });
    } finally { set({ loading: false }); }
  },
  createInvoice: async (formData, profile, idempotencyId?: string) => {
    if (!profile?.id) {
      throw new Error('Profil utilisateur introuvable. Veuillez recharger la page.');
    }
    const userId = profile.id;

    // Input validation — reject malicious/absurd values early
    const MAX_ITEMS = 200;
    if (!formData.items || formData.items.length === 0) throw new Error('La facture doit contenir au moins une ligne.');
    if (formData.items.length > MAX_ITEMS) throw new Error(`Maximum ${MAX_ITEMS} lignes par facture.`);

    const items = formData.items.map((item, idx) => {
      // Validate each field
      if (!item.description || item.description.trim().length === 0) throw new Error(`Ligne ${idx + 1} : description requise.`);
      if (item.description.length > 500) throw new Error(`Ligne ${idx + 1} : description trop longue (max 500 caractères).`);
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 99999 || !Number.isFinite(item.quantity) || item.quantity < 0.01) throw new Error(`Ligne ${idx + 1} : quantité invalide (min 0.01, max 99999).`);
      if (typeof item.unit_price !== 'number' || item.unit_price < 0 || item.unit_price > 9999999) throw new Error(`Ligne ${idx + 1} : prix unitaire invalide.`);
      if (typeof item.vat_rate !== 'number' || item.vat_rate < 0 || item.vat_rate > 100) throw new Error(`Ligne ${idx + 1} : taux TVA invalide (0-100%).`);

      // Calculate line total in cents to avoid float errors
      const lineTotalCents = Math.round(cents(item.quantity) * cents(item.unit_price) / 100);
      const lineDiscPct = (item as any).discount_percent || 0;
      const lineDiscCents = lineDiscPct > 0 ? Math.round(lineTotalCents * cents(lineDiscPct) / 10000) : 0;
      const lineNetCents = lineTotalCents - lineDiscCents;
      return { ...item, id: generateId(), total: roundMoney(fromCents(lineNetCents)) };
    });

    // Subtotal after line discounts (in cents)
    const subtotalAfterLineDiscountsCents = items.reduce((s, i) => s + cents(i.total), 0);
    const discountPercent = formData.discount_percent || 0;
    const discountAmountCents = discountPercent > 0 ? Math.round(subtotalAfterLineDiscountsCents * cents(discountPercent) / 10000) : 0;
    const discountedSubtotalCents = subtotalAfterLineDiscountsCents - discountAmountCents;

    // TVA recalculated on each line's net after global discount
    const recalculatedVatCents = items.reduce((s, i) => {
      const lineNetCents = cents(i.total);
      const afterGlobalDiscCents = discountPercent > 0
        ? Math.round(lineNetCents * (10000 - cents(discountPercent)) / 10000)
        : lineNetCents;
      const lineVatCents = Math.round(afterGlobalDiscCents * cents(i.vat_rate) / 10000);
      return s + lineVatCents;
    }, 0);

    const finalTotalCents = discountedSubtotalCents + recalculatedVatCents;

    const docType = formData.document_type || 'invoice';
    const prefix = docType === 'quote' ? 'DEVIS' : docType === 'credit_note' ? 'AVOIR' : docType === 'purchase_order' ? 'BC' : docType === 'delivery_note' ? 'BL' : (profile.invoice_prefix || 'FACT');
    const finalIdempotencyId = idempotencyId || crypto.randomUUID();

    // Convert back from cents for storage
    const discountedSubtotal = roundMoney(fromCents(discountedSubtotalCents));
    const recalculatedVat = roundMoney(fromCents(recalculatedVatCents));
    const discountAmount = roundMoney(fromCents(discountAmountCents));
    const finalTotal = roundMoney(fromCents(finalTotalCents));

    // Approche 1: Server-side API (fiable, pas de problème Web Locks)
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
          client_type: formData.client_type || null,
        }),
      });

      // Handle rate limiting gracefully
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Trop de requêtes. Veuillez patienter ${retryAfter || 'quelques'} secondes puis réessayer.`);
      }

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || `Erreur serveur (${response.status})`);
      }

      const data = result.invoice;
      const pdpTransmission = result.pdpTransmission || null;

      (async () => {
        try {
          const { data: freshProfile } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
          if (freshProfile) useAuthStore.getState().setProfile(freshProfile);
        } catch {}
      })();

      // Mettre à jour la facture avec les infos PDP si transmise
      if (pdpTransmission?.transmitted && data) {
        data.pdp_status = 'transmitted';
        data.pdp_transmission_id = pdpTransmission.superPdpId;
        data.pdp_transmitted_at = new Date().toISOString();
      }

      set((s) => ({ invoices: [data, ...s.invoices] }));
      get().computeStats();
      // Attacher les infos PDP à l'invoice retournée pour que l'appelant puisse les utiliser
      (data as any)._pdpTransmission = pdpTransmission || null;
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
            p_client_type: formData.client_type || null,
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

    // Block modification if invoice is no longer a draft
    const existing = get().invoices.find((inv) => inv.id === id);
    if (existing && IMMUTABLE_STATUSES.includes(existing.status)) {
      throw new Error('Impossible de modifier une facture déjà émise. Créez un avoir ou dupliquez-la.');
    }

    let u: InvoiceUpdateData = { ...updates, updated_at: new Date().toISOString() } as InvoiceUpdateData;
    if (updates.items) {
      // Validate items
      if (updates.items.length > 200) throw new Error('Maximum 200 lignes par facture.');
      const items = updates.items.map((i) => {
        const lineTotalCents = Math.round(cents(i.quantity) * cents(i.unit_price) / 100);
        const lineDiscPct = (i as any).discount_percent || 0;
        const lineDiscCents = lineDiscPct > 0 ? Math.round(lineTotalCents * cents(lineDiscPct) / 10000) : 0;
        return { ...i, total: roundMoney(fromCents(lineTotalCents - lineDiscCents)) };
      });
      const subtotalAfterLineDiscountsCents = items.reduce((s, i) => s + cents(i.total), 0);
      const discPct = updates.discount_percent ?? existing?.discount_percent ?? 0;
      const discAmtCents = discPct > 0 ? Math.round(subtotalAfterLineDiscountsCents * cents(discPct) / 10000) : 0;
      const discountedSubtotalCents = subtotalAfterLineDiscountsCents - discAmtCents;
      const vatCents = items.reduce((s, i) => {
        const lineNetCents = cents(i.total);
        const afterGlobalDiscCents = discPct > 0
          ? Math.round(lineNetCents * (10000 - cents(discPct)) / 10000)
          : lineNetCents;
        return s + Math.round(afterGlobalDiscCents * cents(i.vat_rate) / 10000);
      }, 0);
      u = {
        ...u, items,
        subtotal: roundMoney(fromCents(discountedSubtotalCents)),
        vat_amount: roundMoney(fromCents(vatCents)),
        discount_percent: discPct || null,
        discount_amount: roundMoney(fromCents(discAmtCents)) || null,
        total: roundMoney(fromCents(discountedSubtotalCents + vatCents)),
      };
    }
    const { data, error } = await getSupabaseClient().from('invoices').update(u).eq('id', id).eq('user_id', user.id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  /** Update a single invoice in the local list (no DB write). Used after payment link creation etc. */
  updateInvoiceInList: (updated: any) => {
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv)) }));
    get().computeStats();
  },
  updateInvoiceStatus: async (id, status) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');

    // Route through server API to enforce VALID_TRANSITIONS (BUG-03 fix)
    const response = await fetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Erreur serveur' }));
      throw new Error(result.error || `Erreur (${response.status})`);
    }

    const data = await response.json();
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  deleteInvoice: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Non authentifié');

    // Block deletion of invoices that have been issued
    const invoice = get().invoices.find(inv => inv.id === id);
    if (invoice && ['sent', 'paid', 'overdue'].includes(invoice.status)) {
      throw new Error('Impossible de supprimer une facture déjà émise. Créez un avoir.');
    }

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
  duplicateInvoice: async (id, profile, targetDocType?: string) => {
    const original = get().invoices.find((inv) => inv.id === id);
    if (!original) throw new Error('Facture introuvable');
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(); due.setDate(due.getDate() + 30);
    const docType = targetDocType || original.document_type || 'invoice';
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
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('recurring_invoices').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ recurringInvoices: s.recurringInvoices.map((r) => (r.id === id ? data : r)) }));
  },
  deleteRecurringInvoice: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { error } = await getSupabaseClient().from('recurring_invoices').delete().eq('id', id).eq('user_id', user.id);
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
    // Include partially paid invoices in revenue tracking
    const partial = actualInvoices.filter((i) => i.status === 'partial');
    const partialRevenue = partial.reduce((s, i) => s + (i.amount_paid || 0), 0);

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
        totalRevenue: paid.reduce((s, i) => s + i.total, 0) + partialRevenue,
        pendingRevenue: pending.reduce((s, i) => s + i.total, 0),
      },
    });
  },
}));
