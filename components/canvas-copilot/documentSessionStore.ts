'use client';

import { create } from 'zustand';
import { InvoiceItem, DocumentType, VoiceUncertainField } from '@/types';
import { generateId } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'action';
  content: string;
  timestamp: number;
  /** For action messages — what the AI changed */
  action?: {
    type: 'added' | 'modified' | 'removed' | 'replaced';
    summary: string;
    fields?: string[];
  };
  /** For doubt resolution messages */
  doubts?: VoiceUncertainField[];
  /** Streaming partial content */
  isStreaming?: boolean;
}

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

  // ─── Linked invoice (credit_note, deposit) ──────────
  linkedInvoiceId: string | null;
  depositPercent: number;

  // ─── Copilot State ───────────────────────────────────
  messages: CopilotMessage[];
  isStreaming: boolean;
  isProcessingVoice: boolean;

  // ─── Doubt Resolution ────────────────────────────────
  pendingDoubts: VoiceUncertainField[];
  doubtResolutionCallback: ((corrections: Record<string, string | number>) => void) | null;

  // ─── UI State ────────────────────────────────────────
  saving: boolean;
  error: string;
  lastGenSource: 'voice' | 'ai' | null;
  /** Sections revealed by progressive disclosure */
  visibleSections: string[];
  /** Active mobile tab: 'copilot' | 'canvas' */
  mobileTab: 'copilot' | 'canvas';

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
  moveItem: (id: string, direction: 'up' | 'down') => void;

  // ─── AI/Voice Result Application ─────────────────────
  applyAIParsedResult: (parsed: any, source: 'voice' | 'ai') => void;
  requestDoubtResolution: (
    doubts: VoiceUncertainField[],
    callback: (corrections: Record<string, string | number>) => void,
  ) => void;
  resolveDoubts: (corrections: Record<string, string | number>) => void;
  dismissDoubts: () => void;

  // ─── Copilot Actions ─────────────────────────────────
  addMessage: (message: Omit<CopilotMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (value: boolean) => void;
  setProcessingVoice: (value: boolean) => void;

  // ─── Progressive Disclosure ──────────────────────────
  revealSection: (section: string) => void;

  // ─── UI ──────────────────────────────────────────────
  setMobileTab: (tab: 'copilot' | 'canvas') => void;
  setSaving: (value: boolean) => void;
  setError: (value: string) => void;

  // ─── Undo ────────────────────────────────────────────
  undo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  redo: () => void;

  // ─── Lifecycle ───────────────────────────────────────
  reset: () => void;
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
  'linkedInvoiceId', 'depositPercent',
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

const today = new Date().toISOString().split('T')[0];

const initialState = {
  documentType: 'invoice' as DocumentType,
  sessionId: generateId(),

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
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ] as Omit<InvoiceItem, 'total'>[],
  notes: '',
  discountPercent: 0,
  issueDate: today,
  paymentDays: 30,
  paymentTermId: 'days30',

  linkedInvoiceId: null,
  depositPercent: 0,

  messages: [] as CopilotMessage[],
  isStreaming: false,
  isProcessingVoice: false,

  pendingDoubts: [] as VoiceUncertainField[],
  doubtResolutionCallback: null,

  saving: false,
  error: '',
  lastGenSource: null as 'voice' | 'ai' | null,
  visibleSections: [] as string[],
  mobileTab: 'copilot' as 'copilot' | 'canvas',

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

    const computed = computeFromItems(initialState.items, 0);
    set({
      ...initialState,
      documentType: docType,
      sessionId: generateId(),
      clientId: params?.clientId || null,
      clientName: params?.clientName || '',
      linkedInvoiceId: params?.linkedInvoiceId || null,
      issueDate: new Date().toISOString().split('T')[0],
      ...computed,
      dueDate: computeDueDate(new Date().toISOString().split('T')[0], 30),
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

    // Items
    if (parsed?.items?.length) {
      updates.items = parsed.items.map((item: any) => ({
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

    // Add action message to copilot
    if (parsed?.summary) {
      get().addMessage({
        role: 'action',
        content: parsed.summary,
        action: {
          type: parsed.action || 'added',
          summary: parsed.summary,
          fields: Object.keys(updates).filter(k => k !== 'lastGenSource'),
        },
      });
    }

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

    get().addMessage({
      role: 'system',
      content: `J'ai un doute sur ${doubts.length} champ${doubts.length > 1 ? 's' : ''}. Pouvez-vous confirmer ?`,
      doubts,
    });
  },

  resolveDoubts: (corrections) => {
    const { doubtResolutionCallback } = get();
    if (doubtResolutionCallback) {
      doubtResolutionCallback(corrections);
    }
    set({ pendingDoubts: [], doubtResolutionCallback: null });

    get().addMessage({
      role: 'system',
      content: '✅ Confirmation prise en compte.',
    });
  },

  dismissDoubts: () => {
    set({ pendingDoubts: [], doubtResolutionCallback: null });
  },

  // ─── Copilot Messages ────────────────────────────────

  addMessage: (message) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        },
      ],
    }));
  },

  updateLastAssistantMessage: (content) => {
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content, isStreaming: false };
          break;
        }
      }
      return { messages: msgs };
    });
  },

  setStreaming: (value) => set({ isStreaming: value }),
  setProcessingVoice: (value) => set({ isProcessingVoice: value }),

  // ─── Progressive Disclosure ──────────────────────────

  revealSection: (section) => {
    set((state) => ({
      visibleSections: state.visibleSections.includes(section)
        ? state.visibleSections
        : [...state.visibleSections, section],
    }));
  },

  // ─── UI ──────────────────────────────────────────────

  setMobileTab: (tab) => set({ mobileTab: tab }),
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
      sessionId: generateId(),
      issueDate: new Date().toISOString().split('T')[0],
    });
  },
}));
