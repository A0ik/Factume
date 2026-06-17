'use client';

import { create } from 'zustand';
import { Invoice, InvoiceItem, DocumentType, VoiceUncertainField } from '@/types';
import { generateId } from '@/lib/utils';
import { mergeInvoiceItems } from '@/lib/voice-merge';

// ─── Types ──────────────────────────────────────────────

export interface DocumentSessionState {
  // ─── Session Identity ────────────────────────────────
  documentType: DocumentType;
  sessionId: string;

  // ─── Client Fields ───────────────────────────────────
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientSiret: string;
  clientVatNumber: string;
  clientType: 'b2b' | 'b2c' | null;

  // ─── Document Data ───────────────────────────────────
  items: Omit<InvoiceItem, 'total'>[];
  notes: string;
  discountPercent: number;
  issueDate: string;
  paymentDays: number;
  paymentTermId: string;
  templateId: number;

  // ─── Linked invoice (credit_note, deposit) ──────────
  linkedInvoiceId: string | null;
  depositPercent: number;

  // ─── AI Processing State ────────────────────────────
  isStreaming: boolean;
  isProcessingVoice: boolean;

  // ─── Doubt Resolution ────────────────────────────────
  pendingDoubts: VoiceUncertainField[];
  doubtResolutionCallback: ((corrections: Record<string, string | number>) => void) | null;

  // ─── UI State ────────────────────────────────────────
  saving: boolean;
  error: string;
  lastGenSource: 'voice' | 'ai' | null;

  // ─── Computed (getters via selectors) ────────────────
  subtotal: number;
  vatAmount: number;
  globalDiscountAmount: number;
  total: number;
  dueDate: string;

  // ─── Actions ─────────────────────────────────────────
  init: (docType: DocumentType, params?: InitParams) => void;
  updateField: <K extends keyof DocumentSessionState>(key: K, value: DocumentSessionState[K]) => void;
  updateItem: (id: string, field: string, value: string | number) => void;
  addItem: (preset?: Partial<Omit<InvoiceItem, 'id' | 'total'>>) => void;
  removeItem: (id: string) => void;
  /** Vide le contenu d'une ligne (description/qty/price/tva) en gardant sa position. */
  clearItem: (id: string) => void;
  /** Duplique une ligne (copie insérée juste après l'originale). */
  duplicateItem: (id: string) => void;
  moveItem: (id: string, direction: 'up' | 'down') => void;

  // ─── AI/Voice Result Application ─────────────────────
  applyAIParsedResult: (parsed: any, source: 'voice' | 'ai') => void;
  requestDoubtResolution: (
    doubts: VoiceUncertainField[],
    callback: (corrections: Record<string, string | number>) => void,
  ) => void;
  resolveDoubts: (corrections: Record<string, string | number>) => void;
  dismissDoubts: () => void;

  // ─── AI State ────────────────────────────────────────
  setStreaming: (value: boolean) => void;
  setProcessingVoice: (value: boolean) => void;

  // ─── UI ──────────────────────────────────────────────
  setSaving: (value: boolean) => void;
  setError: (value: string) => void;

  // ─── Undo ────────────────────────────────────────────
  undo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  redo: () => void;

  // ─── Lifecycle ───────────────────────────────────────
  reset: () => void;

  // ─── Edition ─────────────────────────────────────────
  /** Hydrate la session depuis une facture existante (mode édition). */
  hydrate: (invoice: Invoice) => void;
}

export interface InitParams {
  clientId?: string;
  clientName?: string;
  linkedInvoiceId?: string;
}

// ─── Snapshot Fields for Undo/Redo ─────────────────────

const SNAP_FIELDS = [
  'clientId', 'clientName', 'clientEmail', 'clientPhone',
  'clientAddress', 'clientCity', 'clientPostalCode', 'clientSiret', 'clientVatNumber',
  'items', 'notes', 'discountPercent', 'issueDate', 'paymentDays', 'paymentTermId',
  'linkedInvoiceId', 'depositPercent', 'templateId',
] as const;

type SnapField = typeof SNAP_FIELDS[number];
type Snapshot = Pick<DocumentSessionState, SnapField>;

// ─── Helpers ───────────────────────────────────────────

function computeFromItems(items: Omit<InvoiceItem, 'total'>[], discountPercent: number) {
  const lineItemSubtotals = items.map((i) => {
    const lineHT = i.quantity * i.unit_price;
    const lineDisc = (i as any).discount_percent ?? 0;
    return lineHT * (1 - lineDisc / 100);
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const subtotalAfterLineDiscounts = lineItemSubtotals.reduce((s, v) => s + v, 0);
  const vatAmount = items.reduce((s, i, idx) => s + lineItemSubtotals[idx] * (i.vat_rate / 100), 0);
  const globalDiscountAmount = discountPercent > 0 ? subtotalAfterLineDiscounts * (discountPercent / 100) : 0;
  const discountedSubtotal = subtotalAfterLineDiscounts - globalDiscountAmount;
  const recalculatedVat = items.reduce((s, i, idx) => {
    const afterGlobalDisc = lineItemSubtotals[idx] * (discountPercent > 0 ? 1 - discountPercent / 100 : 1);
    return s + afterGlobalDisc * (i.vat_rate / 100);
  }, 0);
  const total = discountedSubtotal + recalculatedVat;

  return { subtotal, vatAmount: recalculatedVat, globalDiscountAmount, total };
}

function computeDueDate(issueDate: string, paymentDays: number): string {
  if (!issueDate || paymentDays === 0) return '';
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + paymentDays);
  return d.toISOString().split('T')[0];
}

// ─── History (Undo/Redo) ───────────────────────────────

const history = { past: [] as Snapshot[], future: [] as Snapshot[] };
const MAX_HISTORY = 40;

function takeSnapshot(state: DocumentSessionState): Snapshot {
  const snap: any = {};
  for (const key of SNAP_FIELDS) {
    (snap as any)[key] = key === 'items'
      ? JSON.parse(JSON.stringify(state.items))
      : state[key];
  }
  return snap as Snapshot;
}

// ─── Initial State ─────────────────────────────────────

/**
 * SSR-safe deterministic defaults.
 *
 * NOTE: `new Date()` at module scope would produce different values on the
 * server vs. client (different timezones or clock skew), causing a hydration
 * mismatch in Next.js 15 + React 19.  Instead we use a fixed placeholder
 * that is replaced on the client during the first `init()` call — which
 * happens inside a useEffect (client-only), so there's no mismatch.
 *
 * Similarly, `generateId()` is non-deterministic.  We use a fixed sentinel
 * and regenerate on first `init()`.
 */
const SAFE_DATE = '1970-01-01';
const SAFE_ID = '__initial__';

const initialState = {
  documentType: 'invoice' as DocumentType,
  sessionId: SAFE_ID,

  clientId: null,
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  clientCity: '',
  clientPostalCode: '',
  clientSiret: '',
  clientVatNumber: '',
  clientType: null,

  items: [
    { id: SAFE_ID, description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ] as Omit<InvoiceItem, 'total'>[],
  notes: '',
  discountPercent: 0,
  issueDate: SAFE_DATE,
  paymentDays: 30,
  paymentTermId: 'days30',
  templateId: 1,

  linkedInvoiceId: null,
  depositPercent: 0,

  isStreaming: false,
  isProcessingVoice: false,

  pendingDoubts: [] as VoiceUncertainField[],
  doubtResolutionCallback: null,

  saving: false,
  error: '',
  lastGenSource: null as 'voice' | 'ai' | null,

  subtotal: 0,
  vatAmount: 0,
  globalDiscountAmount: 0,
  total: 0,
  dueDate: '',
  canUndo: false,
  canRedo: false,
};

// ─── Store ─────────────────────────────────────────────

export const useDocumentSessionStore = create<DocumentSessionState>((set, get) => ({
  ...initialState,

  // ─── Init ─────────────────────────────────────────────

  init: (docType, params) => {
    const state = get();
    // Push current state to history before resetting
    if (state.items.some(i => i.description || i.unit_price > 0)) {
      history.past.push(takeSnapshot(state));
    }

    // Use real client-side values for items (not SSR-safe placeholders)
    const realToday = new Date().toISOString().split('T')[0];
    const realItems = [
      { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
    ] as Omit<InvoiceItem, 'total'>[];
    const computed = computeFromItems(realItems, 0);

    set({
      ...initialState,
      items: realItems,
      documentType: docType,
      sessionId: generateId(),
      clientId: params?.clientId || null,
      clientName: params?.clientName || '',
      linkedInvoiceId: params?.linkedInvoiceId || null,
      issueDate: realToday,
      ...computed,
      dueDate: computeDueDate(realToday, 30),
      canUndo: false,
      canRedo: false,
    });
    history.past = [];
    history.future = [];
  },

  // ─── Field Updates ────────────────────────────────────

  updateField: (key, value) => {
    const state = get();
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    set({ [key]: value } as any);
    // Recompute totals if relevant
    if (['items', 'discountPercent'].includes(key as string) || key === 'paymentDays' || key === 'issueDate') {
      const newState = get();
      const computed = computeFromItems(newState.items, newState.discountPercent);
      set({
        ...computed,
        dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
      });
    }
  },

  updateItem: (id, field, value) => {
    const state = get();
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    const newItems = state.items.map((item) => {
      if (item.id !== id) return item;
      if (field === 'quantity' || field === 'unit_price') {
        const val = Math.max(0, typeof value === 'string' ? parseFloat(value) || 0 : value);
        return { ...item, [field]: val };
      }
      return { ...item, [field]: value };
    });
    set({ items: newItems });
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set(computed);
  },

  addItem: (preset) => {
    const state = get();
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    const newItem: Omit<InvoiceItem, 'total'> = {
      id: generateId(),
      description: preset?.description || '',
      quantity: preset?.quantity || 1,
      unit_price: preset?.unit_price || 0,
      vat_rate: preset?.vat_rate || 20,
    };
    set({ items: [...state.items, newItem] });
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set(computed);
  },

  removeItem: (id) => {
    const state = get();
    if (state.items.length <= 1) return;
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    set({ items: state.items.filter((i) => i.id !== id) });
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set(computed);
  },

  clearItem: (id) => {
    const state = get();
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    set({
      items: state.items.map((i) =>
        i.id === id
          ? { ...i, description: '', quantity: 1, unit_price: 0, vat_rate: 20, discount_percent: undefined }
          : i,
      ),
    });
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set(computed);
  },

  duplicateItem: (id) => {
    const state = get();
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    const copy = { ...state.items[idx], id: generateId() };
    const next = [...state.items];
    next.splice(idx + 1, 0, copy);
    set({ items: next });
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set(computed);
  },

  moveItem: (id, direction) => {
    const state = get();
    const idx = state.items.findIndex((i) => i.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === state.items.length - 1) return;

    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    const next = [...state.items];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    set({ items: next });
  },

  // ─── AI/Voice Result Application ─────────────────────

  applyAIParsedResult: (parsed, source) => {
    const state = get();
    history.past.push(takeSnapshot(state));
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];

    const updates: Partial<DocumentSessionState> = { lastGenSource: source };

    // Client fields
    if (parsed?.client_name) updates.clientName = parsed.client_name;
    if (parsed?.client_email) updates.clientEmail = parsed.client_email;
    if (parsed?.client_phone) updates.clientPhone = parsed.client_phone;
    if (parsed?.client_address) updates.clientAddress = parsed.client_address;
    if (parsed?.client_city) updates.clientCity = parsed.client_city;
    if (parsed?.client_postal_code) updates.clientPostalCode = parsed.client_postal_code;
    if (parsed?.client_siret) updates.clientSiret = parsed.client_siret;
    if (parsed?.client_vat_number) updates.clientVatNumber = parsed.client_vat_number;

    // Items — LOI 3 (Arbiter) : on FUSIONNE au lieu d'écraser, pour que
    // re-parler/re-écrire modifie au lieu de supprimer les articles existants.
    if (parsed?.items?.length) {
      const merged = mergeInvoiceItems(state.items as any, parsed.items as any, parsed?.action);
      updates.items = merged.map((item: any) => ({
        id: generateId(),
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        vat_rate: Number(item.vat_rate) || 20,
      }));
    }

    // Other fields
    if (parsed?.notes) updates.notes = parsed.notes;
    if (parsed?.discount_percent) updates.discountPercent = parsed.discount_percent;
    if (parsed?.due_days != null) {
      updates.paymentDays = parsed.due_days;
      const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
      updates.paymentTermId = termMap[parsed.due_days] || `custom-${parsed.due_days}`;
    }

    set(updates as any);

    // Recompute totals
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set({
      ...computed,
      dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
    });

    // Handle uncertain fields
    if (parsed?.uncertain_fields?.length > 0) {
      get().requestDoubtResolution(parsed.uncertain_fields, (corrections) => {
        // Apply corrections
        const s = get();
        const correctedUpdates: any = {};
        for (const [field, value] of Object.entries(corrections)) {
          if (field.startsWith('items[')) {
            // Handle item corrections
            const match = field.match(/items\[(\d+)\]\.(.+)/);
            if (match) {
              const idx = parseInt(match[1]);
              const itemField = match[2];
              const newItems = [...s.items];
              if (newItems[idx]) {
                newItems[idx] = { ...newItems[idx], [itemField]: value };
                correctedUpdates.items = newItems;
              }
            }
          } else if (field === 'client_name') {
            correctedUpdates.clientName = String(value);
          } else if (field === 'discount_percent') {
            correctedUpdates.discountPercent = Number(value);
          }
          // Add more field mappings as needed
        }
        if (Object.keys(correctedUpdates).length > 0) {
          set(correctedUpdates);
          const latestState = get();
          const recomputed = computeFromItems(latestState.items, latestState.discountPercent);
          set(recomputed);
        }
      });
    }
  },

  // ─── Doubt Resolution ────────────────────────────────

  requestDoubtResolution: (doubts, callback) => {
    set({
      pendingDoubts: doubts,
      doubtResolutionCallback: callback,
    });
  },

  resolveDoubts: (corrections) => {
    const { doubtResolutionCallback } = get();
    if (doubtResolutionCallback) {
      doubtResolutionCallback(corrections);
    }
    set({ pendingDoubts: [], doubtResolutionCallback: null });
  },

  dismissDoubts: () => {
    set({ pendingDoubts: [], doubtResolutionCallback: null });
  },

  // ─── AI State ─────────────────────────────────────────

  setStreaming: (value) => set({ isStreaming: value }),
  setProcessingVoice: (value) => set({ isProcessingVoice: value }),

  // ─── UI ──────────────────────────────────────────────

  setSaving: (value) => set({ saving: value }),
  setError: (value) => set({ error: value }),

  // ─── Undo / Redo ─────────────────────────────────────

  undo: () => {
    if (history.past.length === 0) return;
    const state = get();
    history.future.push(takeSnapshot(state));
    const prev = history.past.pop()!;
    set({
      ...prev,
      canUndo: history.past.length > 0,
      canRedo: true,
    } as any);
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set({
      ...computed,
      dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
      canUndo: history.past.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    if (history.future.length === 0) return;
    const state = get();
    history.past.push(takeSnapshot(state));
    const next = history.future.pop()!;
    set({
      ...next,
      canUndo: true,
      canRedo: history.future.length > 0,
    } as any);
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountPercent);
    set({
      ...computed,
      dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
      canUndo: true,
      canRedo: history.future.length > 0,
    });
  },

  // ─── Lifecycle ───────────────────────────────────────

  reset: () => {
    history.past = [];
    history.future = [];
    set({
      ...initialState,
      items: [
        { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
      ] as Omit<InvoiceItem, 'total'>[],
      sessionId: generateId(),
      issueDate: new Date().toISOString().split('T')[0],
    });
  },

  // ─── Edition — hydratation depuis une facture existante ───
  hydrate: (invoice) => {
    const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
    const initialDays = invoice.due_date
      ? Math.max(0, Math.round((new Date(invoice.due_date).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };

    const rawItems = (invoice.items?.length ? invoice.items : []).map((i) => {
      const base: Omit<InvoiceItem, 'total'> = {
        id: generateId(),
        description: i.description || '',
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price ?? 0,
        vat_rate: i.vat_rate ?? 20,
      };
      if (i.discount_percent != null) (base as any).discount_percent = i.discount_percent;
      return base;
    });
    const items = rawItems.length > 0
      ? rawItems
      : [{ id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }] as Omit<InvoiceItem, 'total'>[];

    const discountPercent = invoice.discount_percent || 0;
    const computed = computeFromItems(items, discountPercent);

    set({
      ...initialState,
      documentType: (invoice.document_type as DocumentType) || 'invoice',
      sessionId: generateId(),
      clientId: invoice.client_id || null,
      clientName: invoice.client?.name || invoice.client_name_override || '',
      clientEmail: (invoice as any).client_email || invoice.client?.email || '',
      clientPhone: (invoice as any).client_phone || invoice.client?.phone || '',
      clientAddress: (invoice as any).client_address || invoice.client?.address || '',
      clientCity: (invoice as any).client_city || invoice.client?.city || '',
      clientPostalCode: (invoice as any).client_postal_code || invoice.client?.postal_code || '',
      clientSiret: invoice.client?.siret || '',
      clientVatNumber: invoice.client?.vat_number || '',
      clientType: (invoice as any).client_type || null,
      items,
      notes: invoice.notes || '',
      discountPercent,
      issueDate,
      paymentDays: initialDays,
      paymentTermId: termMap[initialDays] || `custom-${initialDays}`,
      linkedInvoiceId: invoice.linked_invoice_id || null,
      ...computed,
      dueDate: computeDueDate(issueDate, initialDays),
      canUndo: false,
      canRedo: false,
    });
    history.past = [];
    history.future = [];
  },
}));
