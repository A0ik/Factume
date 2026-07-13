'use client';

import { create } from 'zustand';
import { Invoice, InvoiceItem, DocumentType, VoiceUncertainField } from '@/types';
import { generateId } from '@/lib/utils';
import { mergeInvoiceItems } from '@/lib/voice-merge';
import { parseStoredTerm } from '@/lib/payment-terms';

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
  discountPercent: number;          // remise globale en % (saisie quand discountType='percent')
  discountType: 'percent' | 'amount'; // type de la remise globale saisie
  discountAmountInput: number;      // remise globale en € (saisie quand discountType='amount')
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
  lineDiscountAmount: number;
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

  // ─── Draft recovery (ATHÉNA C1#5 — anti-amnésie) ────
  /** Restaure un brouillon non enregistré pour ce type de document (true si restauré). */
  tryResumeDraft: (docType: DocumentType) => boolean;
  /** Efface le brouillon persisté (à appeler après création réussie). */
  clearDraft: () => void;

  // ─── Edition ─────────────────────────────────────────
  /** Hydrate la session depuis une facture existante (mode édition). */
  hydrate: (invoice: Invoice) => void;
}

export interface InitParams {
  clientId?: string;
  clientName?: string;
  // PROMETHEUS (CIBLE 8) — hydratation A→Z depuis la fiche client (flux /client →
  // « créer une facture »). Permet de pré-remplir toute la fiche en un seul init()
  // au lieu de dépendre d'un effet de remplissage différé.
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientPostalCode?: string;
  clientSiret?: string;
  clientVatNumber?: string;
  clientType?: 'b2b' | 'b2c';
  linkedInvoiceId?: string;
}

// ─── Snapshot Fields for Undo/Redo ─────────────────────

const SNAP_FIELDS = [
  'clientId', 'clientName', 'clientEmail', 'clientPhone',
  'clientAddress', 'clientCity', 'clientPostalCode', 'clientSiret', 'clientVatNumber',
  'items', 'notes', 'discountPercent', 'discountType', 'discountAmountInput',
  'issueDate', 'paymentDays', 'paymentTermId',
  'linkedInvoiceId', 'depositPercent', 'templateId',
] as const;

type SnapField = typeof SNAP_FIELDS[number];
type Snapshot = Pick<DocumentSessionState, SnapField>;

// ─── Helpers ───────────────────────────────────────────

function computeFromItems(
  items: Omit<InvoiceItem, 'total'>[],
  discountType: 'percent' | 'amount',
  discountPercent: number,
  discountAmountInput: number,
) {
  // Remise par ligne : € (discount_amount) prioritaire sur % (discount_percent).
  const lines = items.map((i: any) => {
    const gross = i.quantity * i.unit_price;
    let lineDisc = 0;
    if (i.discount_amount && i.discount_amount > 0) {
      lineDisc = Math.min(i.discount_amount, gross); // remise € plafonnée à la ligne
    } else if (i.discount_percent && i.discount_percent > 0) {
      lineDisc = gross * (i.discount_percent / 100);
    }
    return { gross, net: gross - lineDisc, lineDisc, vat_rate: i.vat_rate };
  });

  const subtotal = lines.reduce((s, l) => s + l.gross, 0); // sous-total HT brut
  const lineDiscountAmount = lines.reduce((s, l) => s + l.lineDisc, 0);
  const subtotalAfterLineDiscounts = lines.reduce((s, l) => s + l.net, 0);

  // Remise globale : € quand discountType='amount', sinon %.
  let globalDiscountAmount = 0;
  if (discountType === 'amount' && discountAmountInput > 0) {
    globalDiscountAmount = Math.min(discountAmountInput, subtotalAfterLineDiscounts);
  } else if (discountType === 'percent' && discountPercent > 0) {
    globalDiscountAmount = subtotalAfterLineDiscounts * (discountPercent / 100);
  }
  const discountedSubtotal = subtotalAfterLineDiscounts - globalDiscountAmount;

  // TVA — on répartit la remise globale € proportionnellement par ligne (justesse par bande).
  const vatAmount = lines.reduce((s, l) => {
    if (subtotalAfterLineDiscounts <= 0) return s;
    const share = globalDiscountAmount > 0
      ? (globalDiscountAmount * l.net) / subtotalAfterLineDiscounts
      : 0;
    return s + (l.net - share) * (l.vat_rate / 100);
  }, 0);

  const total = discountedSubtotal + vatAmount;

  return { subtotal, lineDiscountAmount, vatAmount, globalDiscountAmount, total };
}

function computeDueDate(issueDate: string, paymentDays: number): string {
  if (!issueDate || paymentDays === 0) return '';
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + paymentDays);
  return d.toISOString().split('T')[0];
}

// ─── Draft persistence (ATHÉNA C1#5 — anti-amnésie) ────
// Sauvegarde le CONTENU du formulaire (pas l'état transitoire) dans localStorage,
// debounced via la subscription en bas de module. Au montage « neutre » de la page
// de création (sans paramètres de préfill), tryResumeDraft() restaure le brouillon
// non enregistré — évite la perte en cas de refresh/navigation après dictée ou saisie.
const DRAFT_KEY = 'factu-document-session-draft-v1';
const DRAFT_FIELDS = [
  'documentType', 'clientId', 'clientName', 'clientEmail', 'clientPhone',
  'clientAddress', 'clientCity', 'clientPostalCode', 'clientSiret', 'clientVatNumber',
  'clientType', 'items', 'notes', 'discountPercent', 'discountType', 'discountAmountInput',
  'issueDate', 'paymentDays', 'paymentTermId', 'templateId',
  'linkedInvoiceId', 'depositPercent',
] as const;

function draftHasContent(snap: any): boolean {
  return !!(snap && Array.isArray(snap.items)
    && snap.items.some((it: any) =>
      (it.description && String(it.description).trim()) || Number(it.unit_price) > 0));
}

function loadDraftSnapshot(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return draftHasContent(parsed) ? parsed : null;
  } catch { return null; }
}

function persistDraftSnapshot(state: DocumentSessionState) {
  if (typeof window === 'undefined') return;
  if (!draftHasContent(state)) return; // ne pas écraser un brouillon avec un form vide
  try {
    const snap: any = {};
    for (const k of DRAFT_FIELDS) {
      (snap as any)[k] = k === 'items'
        ? JSON.parse(JSON.stringify(state.items))
        : (state as any)[k];
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
  } catch { /* quota / mode privé */ }
}

function clearDraftSnapshot() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
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
  discountType: 'percent' as 'percent' | 'amount',
  discountAmountInput: 0,
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
  lineDiscountAmount: 0,
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
    const computed = computeFromItems(realItems, 'percent', 0, 0);

    set({
      ...initialState,
      items: realItems,
      documentType: docType,
      sessionId: generateId(),
      clientId: params?.clientId || null,
      clientName: params?.clientName || '',
      // CIBLE 8 — hydratation complète de la fiche client passée à init().
      clientEmail: params?.clientEmail || '',
      clientPhone: params?.clientPhone || '',
      clientAddress: params?.clientAddress || '',
      clientCity: params?.clientCity || '',
      clientPostalCode: params?.clientPostalCode || '',
      clientSiret: params?.clientSiret || '',
      clientVatNumber: params?.clientVatNumber || '',
      clientType: params?.clientType || null,
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
    if (['items', 'discountPercent', 'discountType', 'discountAmountInput'].includes(key as string) || key === 'paymentDays' || key === 'issueDate') {
      const newState = get();
      const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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

    // CIBLE 3 (AEGIS) — on câble enfin le client_type détecté côté serveur.
    // Auparavant ce champ était calculé puis JETÉ : l'utilisateur devait basculer
    // manuellement le toggle B2B/B2C. On ne déduit que si un client est présent.
    if (parsed?.client_name) {
      if (parsed?.client_type === 'business') updates.clientType = 'b2b';
      else if (parsed?.client_type === 'individual' || parsed?.is_b2c === true) updates.clientType = 'b2c';
    }

    // Items — LOI 3 (Arbiter) : on FUSIONNE au lieu d'écraser, pour que
    // re-parler/re-écrire modifie au lieu de supprimer les articles existants.
    if (parsed?.items?.length) {
      const merged = mergeInvoiceItems(state.items as any, parsed.items as any, parsed?.action);
      updates.items = merged.map((item: any) => {
        const line: any = {
          id: generateId(),
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          vat_rate: Number(item.vat_rate) || 20,
        };
        // Préserve la remise ligne (% ou €) renvoyée par l'IA / déjà présente.
        if (item.discount_amount && Number(item.discount_amount) > 0) {
          line.discount_amount = Number(item.discount_amount);
        } else if (item.discount_percent && Number(item.discount_percent) > 0) {
          line.discount_percent = Number(item.discount_percent);
        } else if (item.discount_percent != null || item.discount_amount != null) {
          // explicite 0 → on neutralise
          delete line.discount_percent;
          delete line.discount_amount;
        }
        return line;
      });
    }

    // Other fields
    if (parsed?.notes) updates.notes = parsed.notes;
    // AXIOM (CIBLE 1) — EXCLUSION MUTUELLE anti double-discount. Une remise ne
    // peut pas être à la fois sur la ligne ET globale. Quand l'utilisateur dit
    // « création de société 200 HT, remise 10 euros », l'IA peut émettre
    // simultanément items[].discount_amount=10 ET discount_amount global=10 →
    // soustraction double (20€). Si une ligne porte déjà une remise, on
    // neutralise le global (priorité à la remise ligne la plus précise).
    const itemsForDiscountCheck = updates.items ?? state.items ?? [];
    const hasLineDiscount = itemsForDiscountCheck.some(
      (it: any) => Number(it.discount_amount) > 0 || Number(it.discount_percent) > 0
    );

    if (hasLineDiscount) {
      updates.discountType = 'percent';
      updates.discountPercent = 0;
      updates.discountAmountInput = 0;
    } else if (parsed?.discount_type === 'amount' || (parsed?.discount_amount && Number(parsed.discount_amount) > 0 && !parsed.discount_percent)) {
      updates.discountType = 'amount';
      updates.discountAmountInput = Number(parsed.discount_amount) || 0;
      updates.discountPercent = 0;
    } else if (parsed?.discount_percent && Number(parsed.discount_percent) > 0) {
      updates.discountType = 'percent';
      updates.discountPercent = Number(parsed.discount_percent);
      updates.discountAmountInput = 0;
    }
    if (parsed?.due_days != null) {
      updates.paymentDays = parsed.due_days;
      const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
      updates.paymentTermId = termMap[parsed.due_days] || `custom-${parsed.due_days}`;
    }

    set(updates as any);

    // Recompute totals
    const newState = get();
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
    set({
      ...computed,
      dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
    });

    // CIBLE 4 (AEGIS) — Handle uncertain fields + safety net : si l'IA signale
    // une faible CONFiance sans préciser de champ, on synthétise une demande de
    // vérification pour qu'un pop-up remonte TOUJOURS quand elle hésite.
    let voiceDoubts = parsed?.uncertain_fields ?? [];
    if (voiceDoubts.length === 0 && parsed?.confidence === 'low' && (parsed?.items?.length || parsed?.client_name)) {
      const field = parsed?.client_name ? 'client_name' : 'items[0].unit_price';
      const current = parsed?.client_name ?? (parsed?.items?.[0]?.unit_price ?? null);
      voiceDoubts = [{
        field,
        current_value: current as any,
        reason: "Confiance faible de l'IA sur cette dictée — merci de vérifier le montant et le client.",
        suggestion: current as any,
      }];
    }
    if (voiceDoubts.length > 0) {
      get().requestDoubtResolution(voiceDoubts as any, (corrections) => {
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
          const recomputed = computeFromItems(latestState.items, latestState.discountType, latestState.discountPercent, latestState.discountAmountInput);
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
    const { doubtResolutionCallback, pendingDoubts, documentType } = get() as any;
    if (doubtResolutionCallback) {
      doubtResolutionCallback(corrections);
    }
    // CIBLE 2 — Persiste les corrections de l'utilisateur (gap : le chemin canvas
    // VoiceOneShot n'écrivait jamais en base, seul PulseVoiceRecorder le faisait).
    // Ces corrections seront réappliquées GLOBALEMENT par la couche STT déterministe
    // (applyDeterministicCorrection) lors des prochaines dictées.
    try {
      for (const [fieldPath, newValue] of Object.entries(corrections)) {
        const doubt = (pendingDoubts || []).find((d: any) => d.field === fieldPath);
        const original = doubt?.current_value ?? '';
        const corrected = String(newValue ?? '').trim();
        if (original && corrected && String(original) !== corrected) {
          fetch('/api/voice-corrections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              field: fieldPath,
              original_value: String(original),
              corrected_value: corrected,
              context: documentType || 'invoice',
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // Non-critical, silently fail
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
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
    const computed = computeFromItems(newState.items, newState.discountType, newState.discountPercent, newState.discountAmountInput);
    set({
      ...computed,
      dueDate: computeDueDate(newState.issueDate, newState.paymentDays),
      canUndo: true,
      canRedo: history.future.length > 0,
    });
  },

  // ─── Lifecycle ───────────────────────────────────────

  reset: () => {
    clearDraftSnapshot();
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

  // ─── Draft recovery (ATHÉNA C1#5 — anti-amnésie) ────────────────────
  tryResumeDraft: (docType) => {
    const draft = loadDraftSnapshot();
    if (!draft) return false;
    // Ne reprend que pour le MÊME type de document (sinon init vierge).
    if (draft.documentType && draft.documentType !== docType) return false;
    const items = (Array.isArray(draft.items) && draft.items.length > 0
      ? JSON.parse(JSON.stringify(draft.items))
      : [{ id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]
    ) as Omit<InvoiceItem, 'total'>[];
    const discountType = (draft.discountType === 'amount' ? 'amount' : 'percent') as 'percent' | 'amount';
    const discountPercent = Number(draft.discountPercent) || 0;
    const discountAmountInput = Number(draft.discountAmountInput) || 0;
    const issueDate = (typeof draft.issueDate === 'string' && draft.issueDate && draft.issueDate !== SAFE_DATE)
      ? draft.issueDate
      : new Date().toISOString().split('T')[0];
    const paymentDays = Number(draft.paymentDays) || 30;
    const computed = computeFromItems(items, discountType, discountPercent, discountAmountInput);
    set({
      ...initialState,
      documentType: docType,
      sessionId: generateId(),
      clientId: draft.clientId ?? null,
      clientName: draft.clientName ?? '',
      clientEmail: draft.clientEmail ?? '',
      clientPhone: draft.clientPhone ?? '',
      clientAddress: draft.clientAddress ?? '',
      clientCity: draft.clientCity ?? '',
      clientPostalCode: draft.clientPostalCode ?? '',
      clientSiret: draft.clientSiret ?? '',
      clientVatNumber: draft.clientVatNumber ?? '',
      clientType: draft.clientType ?? null,
      items,
      notes: draft.notes ?? '',
      discountPercent,
      discountType,
      discountAmountInput,
      issueDate,
      paymentDays,
      paymentTermId: draft.paymentTermId ?? 'days30',
      templateId: Number(draft.templateId) || 1,
      linkedInvoiceId: draft.linkedInvoiceId ?? null,
      depositPercent: Number(draft.depositPercent) || 0,
      ...computed,
      dueDate: computeDueDate(issueDate, paymentDays),
      canUndo: false,
      canRedo: false,
    } as any);
    history.past = [];
    history.future = [];
    return true;
  },

  clearDraft: () => {
    clearDraftSnapshot();
  },

  // ─── Edition — hydratation depuis une facture existante ───
  hydrate: (invoice) => {
    const issueDate = invoice.issue_date || new Date().toISOString().split('T')[0];
    // PROMETHEUS (CIBLE 1) — résolveur unique (lib/payment-terms.ts). Le terme
    // persisté est désormais le termId sémantique (reception / days15 / … /
    // end_of_month / custom-N). Repli sur l'écart due_date→issue_date pour les
    // vieilles factures (colonne payment_terms absente avant la migration
    // 20260620000005), puis sur 30 jours.
    const rawTerms = (invoice as any).payment_terms;
    let parsed: { days: number; termId: string };
    if (rawTerms != null && String(rawTerms).trim() !== '') {
      parsed = parseStoredTerm(rawTerms);
    } else if (invoice.due_date) {
      const days = Math.max(0, Math.round((new Date(invoice.due_date).getTime() - new Date(issueDate).getTime()) / (1000 * 60 * 60 * 24)));
      parsed = parseStoredTerm(String(days));
    } else {
      parsed = parseStoredTerm(null);
    }

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
    const discountType: 'percent' | 'amount' =
      (invoice as any).discount_type === 'amount' ? 'amount' : 'percent';
    // En mode 'amount', la valeur saisie est le montant € (discount_amount).
    const discountAmountInput = discountType === 'amount'
      ? (Number(invoice.discount_amount) || 0)
      : 0;
    const computed = computeFromItems(items, discountType, discountPercent, discountAmountInput);

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
      // OVERLORD (CIBLE 6) — fallback sur la colonne plate (client libre/non lié) :
      // sans ça, SIRET/TVA s'effondrent à '' à la réouverture d'édition et sont
      // écrasés (perdus) à la prochaine sauvegarde. Coherent avec address/email.
      clientSiret: (invoice as any).client_siret || invoice.client?.siret || '',
      clientVatNumber: (invoice as any).client_vat_number || invoice.client?.vat_number || '',
      clientType: (invoice as any).client_type || null,
      items,
      notes: invoice.notes || '',
      discountPercent,
      discountType,
      discountAmountInput,
      issueDate,
      paymentDays: parsed.days,
      paymentTermId: parsed.termId,
      linkedInvoiceId: invoice.linked_invoice_id || null,
      ...computed,
      dueDate: computeDueDate(issueDate, parsed.days),
      canUndo: false,
      canRedo: false,
    });
    history.past = [];
    history.future = [];
  },
}));

// ATHÉNA (C1#5) — auto-save debounced du brouillon (anti-amnésie). Se déclenche
// sur tout changement d'état côté client ; persistDraftSnapshot ignore les forms vides.
let __draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
useDocumentSessionStore.subscribe((state) => {
  if (__draftSaveTimer) clearTimeout(__draftSaveTimer);
  __draftSaveTimer = setTimeout(() => persistDraftSnapshot(state as DocumentSessionState), 600);
});
