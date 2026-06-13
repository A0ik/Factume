'use client';

/**
 * <InvoiceForm />
 * LOI 2 (Arbiter) — Create et Edit ne sont qu'UN seul composant.
 *   - invoice={null}  → CRÉATION  (createInvoice + modal B2B/B2C)
 *   - invoice={data}  → ÉDITION    (pré-rempli + updateInvoice + gardes-fous immuabilité LOI 8)
 *
 * L'UI (layout, micro, champs, design Clair/Obsidian) est STRICTEMENT IDENTIQUE
 * dans les deux cas. La voix passe l'État complet du formulaire (LOI 3) au recorder,
 * qui affiche la transcription AU-DESSUS du micro (LOI 4).
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Calendar from '@/components/ui/Calendar';
import PaymentTermsSelector from '@/components/ui/PaymentTermsSelector';
import FacturXWarnings from '@/components/ui/FacturXWarnings';
import { PDPValidator } from '@/components/ui/PDPValidator';
import { formatCurrency, generateId, cn } from '@/lib/utils';
import { mergeInvoiceItems } from '@/lib/voice-merge';
import { getSupabaseClient } from '@/lib/supabase';
import { Invoice, InvoiceItem, DocumentType } from '@/types';
import {
  Mic, Plus, Trash2, Zap, FileText, Clipboard,
  RefreshCw, ChevronUp, ChevronDown, Sparkles, Calendar as CalendarIcon,
  User, AlignLeft, Receipt, AlertCircle, CheckCircle2,
  ArrowLeft, ShoppingCart, Truck, Banknote, Wand2, Percent, X,
  Send, Loader2, Package, Search, Eye, Lock, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { PulseVoiceRecorder, VoiceAnalysisResult } from '@/components/ui/voice-recording';
import InvoiceMobileActionBar from '@/components/invoices/InvoiceMobileActionBar';
import ClientTypeModal from '@/components/invoices/ClientTypeModal';
import { useToast } from '@/components/ui/SuccessToast';

const VAT_RATES = [
  { value: '0', label: '0% — Exonéré' },
  { value: '2.1', label: '2.1% — Particulier' },
  { value: '5.5', label: '5.5% — Réduit' },
  { value: '10', label: '10% — Intermédiaire' },
  { value: '20', label: '20% — Normal' },
];

const DOC_TYPES = [
  { value: 'invoice', label: 'Facture', description: 'Document de facturation standard', icon: Receipt },
  { value: 'quote', label: 'Devis', description: 'Proposition commerciale', icon: Clipboard },
  { value: 'purchase_order', label: 'Bon de commande', description: "Commande d'achat officielle", icon: ShoppingCart },
  { value: 'delivery_note', label: 'Bon de livraison', description: 'Confirmation de livraison', icon: Truck },
  { value: 'credit_note', label: 'Avoir', description: 'Note de credit ou remboursement', icon: RefreshCw },
  { value: 'deposit', label: 'Acompte', description: "Facture d'acompte partielle", icon: Banknote },
] as const;

function getDocListPath(type: string): string {
  const map: Record<string, string> = {
    invoice: '/documents/factures',
    quote: '/documents/devis',
    credit_note: '/documents/avoirs',
    purchase_order: '/documents/commandes',
    delivery_note: '/documents/livraisons',
    deposit: '/documents/acomptes',
  };
  return map[type] ?? '/documents/factures';
}

function getDocNewPath(type: string): string {
  const map: Record<string, string> = {
    invoice: '/documents/factures/new',
    quote: '/documents/devis/new',
    credit_note: '/documents/avoirs/new',
    purchase_order: '/documents/commandes/new',
    delivery_note: '/documents/livraisons/new',
    deposit: '/documents/acomptes/new',
  };
  return map[type] ?? '/documents/factures/new';
}

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  vat_rate: number;
  category: string;
  reference: string;
  is_active: boolean;
  created_at: string;
}

export interface InvoiceFormProps {
  /** null/undefined = création. Objet = édition (pré-rempli). */
  invoice?: Invoice | null;
  /** Type de document en création (ignoré en édition où l'on garde invoice.document_type). */
  docType?: DocumentType;
  /** Pré-remplissage client en création (depuis ?clientId=…&clientName=…). */
  initialClientId?: string | null;
  initialClientName?: string;
}

export default function InvoiceForm({ invoice, docType: docTypeProp, initialClientId, initialClientName }: InvoiceFormProps) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { clients, invoices, createInvoice, updateInvoice } = useDataStore();
  const sub = useSubscription();
  const { showToast } = useToast();

  const isEdit = !!invoice;

  // ─── Mode ───
  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ─── Document type (lecture seule dans les deux cas → UI identique) ───
  const [docType, setDocType] = useState<DocumentType>(
    (invoice?.document_type as DocumentType) || docTypeProp || 'invoice',
  );

  // ─── AI ───
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // ─── Client ───
  const [clientName, setClientName] = useState(
    invoice?.client?.name || invoice?.client_name_override || initialClientName || '',
  );
  const [clientId, setClientId] = useState<string | null>(invoice?.client_id || initialClientId || null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);

  const [clientEmail, setClientEmail] = useState((invoice as any)?.client_email || invoice?.client?.email || '');
  const [clientPhone, setClientPhone] = useState((invoice as any)?.client_phone || invoice?.client?.phone || '');
  const [clientAddress, setClientAddress] = useState((invoice as any)?.client_address || invoice?.client?.address || '');
  const [clientCity, setClientCity] = useState((invoice as any)?.client_city || invoice?.client?.city || '');
  const [clientPostalCode, setClientPostalCode] = useState((invoice as any)?.client_postal_code || invoice?.client?.postal_code || '');
  const [clientSiret, setClientSiret] = useState(invoice?.client?.siret || '');
  const [clientVatNumber, setClientVatNumber] = useState(invoice?.client?.vat_number || '');

  // ─── Lignes ───
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>(
    invoice?.items?.length
      ? invoice.items.map((i) => ({
          id: i.id || generateId(),
          description: i.description || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
          vat_rate: i.vat_rate,
          ...(i.discount_percent != null ? { discount_percent: i.discount_percent } : {}),
        }))
      : [{ id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }],
  );

  // ─── Notes / détails ───
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [internalNotes, setInternalNotes] = useState((invoice as any)?.internal_notes || '');
  const [orderReference, setOrderReference] = useState((invoice as any)?.order_reference || '');
  const [orderNumber, setOrderNumber] = useState((invoice as any)?.order_number || '');
  const [legalMentions, setLegalMentions] = useState((invoice as any)?.legal_mentions || '');
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  // ─── Remise / dates ───
  const [discountPercent, setDiscountPercent] = useState(invoice?.discount_percent || 0);
  const initialIssueDate = invoice?.issue_date || new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(initialIssueDate);
  const initialDays = invoice?.due_date
    ? Math.round((new Date(invoice.due_date).getTime() - new Date(initialIssueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const [paymentDays, setPaymentDays] = useState<number>(initialDays);
  const [paymentTermId, setPaymentTermId] = useState<string>(
    ({ 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' } as Record<number, string>)[initialDays] ?? 'days30',
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [lastGenSource, setLastGenSource] = useState<'voice' | 'ai' | null>(null);

  // ─── B2B/B2C (création) ───
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);
  const [clientType, setClientType] = useState<'b2b' | 'b2c' | null>(
    (invoice as any)?.client_type || null,
  );
  const pendingIdRef = useRef<string | null>(null);

  // ─── Catalogue produits ───
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

  // Pré-remplir les détails client si client lié (création depuis page client)
  useEffect(() => {
    if (clientId) {
      const c = clients.find((cl) => cl.id === clientId);
      if (c) {
        setClientEmail(c.email || '');
        setClientPhone(c.phone || '');
        setClientAddress(c.address || '');
        setClientCity(c.city || '');
        setClientPostalCode(c.postal_code || '');
        setClientSiret(c.siret || '');
        setClientVatNumber(c.vat_number || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const suggestions = invoices
    .filter((inv) => inv.client && clientName.length >= 1)
    .map((inv) => inv.client)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => c.name.toLowerCase().includes(clientName.toLowerCase()))
    .slice(0, 5);

  // ─── Calculs (remise par ligne + remise globale) ───
  const lineItemSubtotals = items.map((i) => {
    const lineHT = i.quantity * i.unit_price;
    const lineDisc = (i as any).discount_percent ?? 0;
    return lineHT * (1 - lineDisc / 100);
  });
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const subtotalAfterLineDiscounts = lineItemSubtotals.reduce((s, v) => s + v, 0);
  const globalDiscountAmount = discountPercent > 0 ? subtotalAfterLineDiscounts * (discountPercent / 100) : 0;
  const discountedSubtotal = subtotalAfterLineDiscounts - globalDiscountAmount;
  const recalculatedVat = items.reduce((s, i, idx) => {
    const afterGlobalDisc = lineItemSubtotals[idx] * (discountPercent > 0 ? 1 - discountPercent / 100 : 1);
    return s + afterGlobalDisc * (i.vat_rate / 100);
  }, 0);
  const total = discountedSubtotal + recalculatedVat;
  const totalLineDiscount = subtotal - subtotalAfterLineDiscounts;

  const dueDate = (!issueDate || paymentDays === 0)
    ? ''
    : (() => {
        const d = new Date(issueDate);
        if (isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + paymentDays);
        return d.toISOString().split('T')[0];
      })();

  // ─── LOI 3 — État COMPLET du formulaire, passé à l'IA vocale ───
  const voiceFormContext = useMemo(
    () => ({
      document_type: docType,
      client_name: clientName || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      client_city: clientCity || null,
      client_postal_code: clientPostalCode || null,
      client_siret: clientSiret || null,
      client_vat_number: clientVatNumber || null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        vat_rate: i.vat_rate,
      })),
      notes: notes || null,
      discount_percent: discountPercent || null,
      due_days: paymentDays,
      issue_date: issueDate || null,
    }),
    [docType, clientName, clientEmail, clientPhone, clientAddress, clientCity, clientPostalCode, clientSiret, clientVatNumber, items, notes, discountPercent, paymentDays, issueDate],
  );

  // ─── Gardes-fous ÉDITION (LOI 8 — immuabilité légale) ───
  if (isEdit) {
    if (!sub.canEditInvoice) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Modification verrouillée</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            La modification est réservée aux abonnés payants. Passez à un plan Pro ou Business pour débloquer cette fonctionnalité.
          </p>
          <button onClick={() => router.push('/trial')} className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Voir les plans
          </button>
        </div>
      );
    }
    if (invoice?.status === 'accepted' && invoice?.signed_at && invoice?.document_type === 'quote') {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Devis signé</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Ce devis a été signé par le client et ne peut plus être modifié. La signature électronique a valeur légale.
          </p>
          <button onClick={() => router.push(`/invoices/${invoice.id}`)} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Retour au devis
          </button>
        </div>
      );
    }
    const IMMUTABLE = ['sent', 'paid', 'overdue', 'cancelled', 'refunded', 'partial', 'delivered', 'rejected'];
    if (invoice && IMMUTABLE.includes(invoice.status)) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Document non modifiable</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Ce document a le statut « {invoice.status} » et ne peut plus être modifié (Art. L.441-9 du Code de commerce). Créez un avoir si une correction est nécessaire.
          </p>
          <button onClick={() => router.push(`/invoices/${invoice.id}`)} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      );
    }
  }

  // ─── Handlers communs ───
  const applyParsed = (parsed: Partial<VoiceAnalysisResult> | null | undefined, source: 'voice' | 'ai') => {
    if (!parsed) return;
    if (parsed.client_name) {
      const searchTerm = parsed.client_name.toLowerCase();
      const matchingClient =
        clients.find((c) => c.name.toLowerCase() === searchTerm) ||
        clients.find((c) => c.name.toLowerCase().includes(searchTerm) || searchTerm.includes(c.name.toLowerCase()));
      if (matchingClient) {
        setClientId(matchingClient.id);
        setClientName(matchingClient.name);
        toast.success(`Client « ${matchingClient.name} » sélectionné`);
      } else {
        setClientName(parsed.client_name);
        setClientId(null);
      }
    }
    if (parsed.client_email) setClientEmail(parsed.client_email);
    if (parsed.client_phone) setClientPhone(parsed.client_phone);
    if (parsed.client_address) setClientAddress(parsed.client_address);
    if (parsed.client_city) setClientCity(parsed.client_city);
    if (parsed.client_postal_code) setClientPostalCode(parsed.client_postal_code);
    if (parsed.client_siret) setClientSiret(parsed.client_siret);
    if (parsed.client_vat_number) setClientVatNumber(parsed.client_vat_number);
    if (parsed.items?.length) {
      // LOI 3 (Arbiter) — FUSION au lieu d'écraser : re-parler/re-écrire modifie au lieu de supprimer.
      setItems((prev) =>
        mergeInvoiceItems(prev as any, parsed.items as any, (parsed as any).action).map((item) => ({
          id: generateId(),
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          vat_rate: Number(item.vat_rate) || 20,
        })),
      );
    }
    if (parsed.notes) setNotes(parsed.notes);
    if ((parsed as any).discount_percent != null && (parsed as any).discount_percent > 0) setDiscountPercent((parsed as any).discount_percent);
    if (parsed.due_days != null) {
      setPaymentDays(parsed.due_days);
      const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
      setPaymentTermId(termMap[parsed.due_days] || `custom-${parsed.due_days}`);
    }
    if (parsed.summary) toast.success(parsed.summary);
    setLastGenSource(source);
    setMode('manual');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!sub.canUseVoice) { router.push('/paywall'); return; }
    setAiLoading(true);
    setAiError('');
    const hasContent = items.some((i) => i.description || i.unit_price > 0);
    try {
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hasContent || isEdit ? `MODIFICATION DE DOCUMENT:\n${aiPrompt}` : aiPrompt,
          sector: profile?.sector,
          isEdit: hasContent || isEdit,
          existingItems: hasContent || isEdit ? items : undefined,
          formContext: voiceFormContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyParsed(data.parsed, 'ai');
      setAiPrompt('');
    } catch (e: any) {
      setAiError(e.message || 'Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleVoiceResult = (result: VoiceAnalysisResult) => applyParsed(result, 'voice');

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      if (field === 'quantity' || field === 'unit_price') {
        const val = Math.max(0, typeof value === 'string' ? parseFloat(value) || 0 : value);
        return { ...item, [field]: val };
      }
      return { ...item, [field]: value };
    }));
  };
  const addItem = () => setItems((prev) => [...prev, { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const moveItem = (id: string, dir: 'up' | 'down') => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const fetchProducts = async () => {
    if (!profile?.id) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await getSupabaseClient().from('products').select('*').eq('user_id', profile.id).eq('is_active', true).order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch {
      toast.error('Erreur lors du chargement du catalogue');
    } finally {
      setLoadingProducts(false);
    }
  };
  const openProductCatalog = (itemIndex: number) => {
    setCurrentItemIndex(itemIndex);
    setShowProductCatalog(true);
    if (products.length === 0) fetchProducts();
  };
  const selectProduct = (product: Product) => {
    if (currentItemIndex === null) return;
    const updatedItems = [...items];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      description: product.name + (product.description ? `\n${product.description}` : ''),
      unit_price: product.unit_price,
      vat_rate: product.vat_rate,
    };
    setItems(updatedItems);
    setShowProductCatalog(false);
    setCurrentItemIndex(null);
    setProductSearch('');
    toast.success('Produit importé depuis le catalogue');
  };
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.reference?.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // ─── Sauvegarde (branchée create / update) ───
  const doSaveCreate = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    if (!clientName && !items[0]?.description) {
      setError('Renseignez au moins un client ou une prestation.');
      savingRef.current = false; setSaving(false); return;
    }
    if (!items.some((i) => i.quantity > 0 && i.unit_price > 0)) {
      setError('Ajoutez au moins une prestation avec un montant.');
      savingRef.current = false; setSaving(false); return;
    }
    if (!profile?.id) {
      setError('Profil introuvable. Veuillez vous reconnecter.');
      savingRef.current = false; setSaving(false); return;
    }
    if (!pendingIdRef.current) pendingIdRef.current = crypto.randomUUID();
    const currentIdempotencyId = pendingIdRef.current;
    setError('');
    try {
      const newInvoice = await Promise.race([
        createInvoice({
          client_id: clientId || undefined,
          client_name_override: clientId ? undefined : clientName || undefined,
          document_type: docType,
          issue_date: issueDate,
          due_date: dueDate || undefined,
          items: items,
          notes: notes || undefined,
          discount_percent: discountPercent > 0 ? discountPercent : undefined,
          client_email: clientId ? undefined : clientEmail || undefined,
          client_phone: clientId ? undefined : clientPhone || undefined,
          client_address: clientId ? undefined : clientAddress || undefined,
          client_city: clientId ? undefined : clientCity || undefined,
          client_postal_code: clientId ? undefined : clientPostalCode || undefined,
          client_siret: clientId ? undefined : clientSiret || undefined,
          client_vat_number: clientId ? undefined : clientVatNumber || undefined,
          client_type: clientType || undefined,
        }, profile, currentIdempotencyId),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 15000)),
      ]);

      // Les champs « détails supplémentaires » ne sont pas gérés par la route de création ;
      // on les persiste via un UPDATE best-effort (parité fonctionnelle create/edit, sans perte de données).
      if (internalNotes || orderReference || orderNumber || legalMentions) {
        try {
          await updateInvoice(newInvoice.id, {
            internal_notes: internalNotes || undefined,
            order_reference: orderReference || undefined,
            order_number: orderNumber || undefined,
            legal_mentions: legalMentions || undefined,
          });
        } catch {
          // Non bloquant — le document est déjà créé.
        }
      }
      const isB2B = clientType === 'b2b';
      const pdpResult = (newInvoice as any)?._pdpTransmission;
      if (isB2B && pdpResult?.transmitted) {
        showToast({ icon: 'success', title: 'Facture B2B créée et transmise ✓', subtitle: `${clientName ? clientName + ' • ' : ''}Facture électronique envoyée via PDP` });
      } else if (isB2B && pdpResult?.error) {
        showToast({ icon: 'success', title: 'Facture créée — transmission en attente', subtitle: `${clientName ? clientName + ' • ' : ''}${pdpResult.error}` });
      } else if (isB2B) {
        showToast({ icon: 'success', title: 'Facture B2B créée !', subtitle: `${clientName ? clientName + ' • ' : ''}Transmission électronique en cours` });
      } else {
        showToast({ icon: 'success', title: 'Document créé avec succès !', subtitle: clientName ? `Pour ${clientName}` : undefined });
      }
      setTimeout(() => router.push(`/invoices/${newInvoice.id}`), 100);
    } catch (e: any) {
      if ((e as Error).message === '__timeout__') {
        toast.error('Délai dépassé — réessayez', { id: 'timeout-error' });
        setError('Le délai de création a été dépassé. Veuillez réessayer.');
      } else if ((e as Error).message?.includes('Limite de')) {
        toast.error('Limite atteinte !', { id: 'limit-error' });
        setError('Limite de documents atteinte.');
        setTimeout(() => router.push('/trial'), 1500);
      } else {
        setError(e.message || 'Erreur lors de la création.');
        toast.error(e.message || 'Erreur lors de la création', { id: 'create-error' });
      }
    } finally {
      savingRef.current = false; setSaving(false); pendingIdRef.current = null;
    }
  };

  const doSaveEdit = async () => {
    if (!invoice) return;
    if (savingRef.current) return;
    if (!clientName && !items[0]?.description) {
      setError('Renseignez au moins un client ou une prestation'); return;
    }
    savingRef.current = true; setSaving(true); setError('');
    try {
      await Promise.race([
        updateInvoice(invoice.id, {
          client_id: clientId || undefined,
          client_name_override: clientId ? undefined : clientName || undefined,
          document_type: docType,
          issue_date: issueDate,
          due_date: dueDate || undefined,
          items: items as InvoiceItem[],
          notes: notes || undefined,
          internal_notes: internalNotes || undefined,
          order_reference: orderReference || undefined,
          order_number: orderNumber || undefined,
          legal_mentions: legalMentions || undefined,
          discount_percent: discountPercent > 0 ? discountPercent : undefined,
          client_email: clientEmail || undefined,
          client_phone: clientPhone || undefined,
          client_address: clientAddress || undefined,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 7000)),
      ]);
      toast.success('Document modifié avec succès !');
      setSuccess(true);
      setTimeout(() => router.push(`/invoices/${invoice.id}`), 600);
    } catch (e: any) {
      if ((e as Error).message === '__timeout__') {
        setError('Délai dépassé — réessayez');
        toast.error('Délai dépassé — réessayez');
      } else {
        setError(e.message || 'Erreur lors de la modification');
      }
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  const handleSave = () => {
    if (isEdit) { doSaveEdit(); return; }
    if (!clientType) { setShowClientTypeModal(true); return; }
    doSaveCreate();
  };
  const handleClientTypeSelect = (type: 'b2b' | 'b2c') => {
    setClientType(type);
    setShowClientTypeModal(false);
    if (type === 'b2c') { setClientSiret(''); setClientVatNumber(''); }
    setTimeout(() => doSaveCreate(), 100);
  };

  const docConfig = DOC_TYPES.find((d) => d.value === docType) || DOC_TYPES[0];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8 lg:pb-8 pb-28">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] dark:bg-blue-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header — identique en create/edit */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => router.push(isEdit ? `/invoices/${invoice!.id}` : getDocListPath(docType))}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={17} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {isEdit ? `Modifier ${docConfig.label.toLowerCase()}` : `Nouvelle ${docConfig.label.toLowerCase()}`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {isEdit ? invoice!.number : 'Remplissez les informations ci-dessous pour créer votre document.'}
          </p>
        </div>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-ping" />
            {isEdit ? 'Modification' : 'Création'}…
          </span>
        )}
        {success && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <CheckCircle2 size={13} /> Sauvegardé
          </span>
        )}
      </motion.div>

      {/* Doc type selector — cliquable en CRÉATION (navigue vers le bon type), lecture seule en ÉDITION (LOI 2 : ne pas changer le type d'un doc existant) */}
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-2.5', isEdit && 'opacity-70 pointer-events-none')}>
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          const active = dt.value === docType;
          return (
            <button
              key={dt.value}
              type="button"
              disabled={isEdit || active}
              onClick={() => {
                if (!isEdit && !active) router.push(getDocNewPath(dt.value));
              }}
              className={cn(
                'relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 text-center transition-all',
                active
                  ? 'border-blue-500 bg-white dark:bg-slate-900 shadow-md shadow-black/5'
                  : 'border-gray-100 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-400',
                !isEdit && !active && 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/40 hover:scale-[1.02]',
                (isEdit || active) && 'cursor-default',
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', active ? 'bg-blue-500/10' : 'bg-gray-100 dark:bg-white/5')}>
                <Icon size={19} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
              </div>
              <div>
                <p className={cn('text-sm font-bold', active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400')}>{dt.label}</p>
                <p className={cn('text-[10px] mt-0.5 hidden sm:block', active ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600')}>{dt.description}</p>
              </div>
              {active && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          );
        })}
      </div>

      {/* Mode toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-1.5 bg-gray-100 dark:bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setMode('voice')} disabled={loading} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center', mode === 'voice' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-white/50')}>
          <Mic size={15} /><span className="hidden sm:inline">Dictée vocale</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setMode('ai')} disabled={loading} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center', mode === 'ai' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-white/50')}>
          <Wand2 size={15} /><span className="hidden sm:inline">{isEdit ? 'Modifier par IA' : 'Générer par IA'}</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setMode('manual')} disabled={loading} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center', mode === 'manual' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-white/50')}>
          <FileText size={15} /><span className="hidden sm:inline">Saisie manuelle</span>
        </motion.button>
      </motion.div>

      {/* Voice recorder — PulseVoiceRecorder (transcription AU-DESSUS du micro, LOI 4) + état complet (LOI 3) */}
      <AnimatePresence>
        {mode === 'voice' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 text-center space-y-5 shadow-sm">
            {!sub.canUseVoice && (
              <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} whileHover={{ scale: 1.02 }} onClick={() => router.push('/paywall')} className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3.5 sm:p-4 text-left hover:border-amber-300 transition-colors w-full">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Disponible avec Solo ou Pro</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">Dicttez votre document à voix haute, l'IA le remplit automatiquement</p>
                </div>
              </motion.button>
            )}
            <PulseVoiceRecorder
              onResult={handleVoiceResult}
              isPro={sub.canUseVoice}
              mode="invoice"
              existingItems={items}
              sector={profile?.sector || ''}
              formContext={voiceFormContext}
              onClose={() => setMode('manual')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI generator */}
      <AnimatePresence>
        {mode === 'ai' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wand2 size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{isEdit ? 'Décrivez vos modifications' : 'Décrivez votre document'}</h3>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                {isEdit
                  ? 'Ex: "Ajouter une ligne: Consultation 2h, TVA 20%" ou "Modifier le prix de la première ligne à 500€"'
                  : 'Ex: "Facture pour Entreprise XYZ pour développement web, 5 jours à 2000€ HT, TVA 20%"'}
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm resize-none bg-white dark:bg-gray-100 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                placeholder={isEdit ? 'Décrivez vos modifications en langage naturel…' : 'Décrivez votre document en langage naturel…'}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleAiGenerate(); }}
              />
              <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Cmd + Entrée pour générer</p>
            </div>
            {aiError && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
              </motion.div>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20">
              {aiLoading ? (<><Loader2 size={16} className="animate-spin" /> L'IA {isEdit ? 'modifie' : 'génère'} votre document…</>) : (<><Sparkles size={16} /> {isEdit ? 'Modifier avec l\'IA' : 'Générer avec l\'IA'}</>)}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual form */}
      <AnimatePresence>
        {mode === 'manual' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {/* Factur-X warnings */}
              <FacturXWarnings
                invoice={{
                  number: invoice?.number,
                  issue_date: issueDate,
                  due_date: dueDate || undefined,
                  document_type: docType,
                  client: clientId ? clients.find((c) => c.id === clientId) : undefined,
                  client_name_override: clientId ? undefined : clientName || undefined,
                  client_email: clientId ? undefined : clientEmail || undefined,
                  client_phone: clientId ? undefined : clientPhone || undefined,
                  client_address: clientId ? undefined : clientAddress || undefined,
                  client_city: clientId ? undefined : clientCity || undefined,
                  client_postal_code: clientId ? undefined : clientPostalCode || undefined,
                  client_siret: clientId ? undefined : clientSiret || undefined,
                  client_vat_number: clientId ? undefined : clientVatNumber || undefined,
                  items: items,
                }}
                profile={profile}
                variant="accordion"
              />

              {/* PDP Validator */}
              <PDPValidator
                invoice={{
                  number: invoice?.number,
                  issue_date: issueDate,
                  due_date: dueDate || undefined,
                  client: clientId ? clients.find((c) => c.id === clientId) : undefined,
                  client_name_override: clientId ? undefined : clientName || undefined,
                  client_siret: clientId ? undefined : clientSiret || undefined,
                  client_vat_number: clientId ? undefined : clientVatNumber || undefined,
                  client_address: clientId ? undefined : clientAddress || undefined,
                  client_city: clientId ? undefined : clientCity || undefined,
                  client_postal_code: clientId ? undefined : clientPostalCode || undefined,
                  items: items,
                }}
                profile={profile}
                mode="accordion"
              />

              {/* Generation success banner */}
              {lastGenSource && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {lastGenSource === 'ai' ? <Wand2 size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Mic size={16} className="text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{lastGenSource === 'ai' ? 'Document généré par IA' : 'Document dicté vocalement'}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-0.5">Vérifiez les informations ci-dessous et modifiez si besoin.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setMode(lastGenSource)} className="text-xs text-emerald-700 dark:text-emerald-500 font-semibold underline underline-offset-2 transition-colors">
                      {lastGenSource === 'ai' ? 'Modifier par IA →' : 'Re-dicter →'}
                    </button>
                    <button onClick={() => setLastGenSource(null)} className="p-1 rounded text-emerald-400 hover:text-emerald-600 transition-colors"><X size={13} /></button>
                  </div>
                </motion.div>
              )}

              {/* Client section */}
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm" style={{ overflow: 'visible', position: 'relative' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-100/50">
                  <User size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Client</h3>
                </div>
                <div className="p-4">
                  <div className="relative" style={{ zIndex: showSuggestions && suggestions.length > 0 ? 100 : 'auto' }}>
                    <Input placeholder="Nom du client ou de l'entreprise" value={clientName} onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-100 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                        {suggestions.map((c) => (
                          <button key={c.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3" onMouseDown={() => { setClientName(c.name); setClientId(c.id); setShowSuggestions(false); }}>
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 text-xs font-bold flex-shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                              {c.email && <p className="text-xs text-gray-400 dark:text-gray-500">{c.email}</p>}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  {clientId && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-2"><CheckCircle2 size={12} /> Client associé</p>
                  )}
                  {!clientId && (
                    <button type="button" onClick={() => setShowClientDetails(!showClientDetails)} className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 font-medium mt-3 flex items-center gap-1 transition-colors">
                      <motion.div animate={{ rotate: showClientDetails ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={12} /></motion.div>
                      {showClientDetails ? 'Masquer les détails' : "Ajouter plus d'informations"}
                    </button>
                  )}
                  {showClientDetails && !clientId && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-3 border-t border-gray-100 dark:border-white/10 pt-3">
                      <Input placeholder="Email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                      <Input placeholder="Téléphone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                      <Input placeholder="Adresse" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Code postal" value={clientPostalCode} onChange={(e) => setClientPostalCode(e.target.value)} />
                        <Input placeholder="Ville" value={clientCity} onChange={(e) => setClientCity(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="SIRET (14 chiffres)" value={clientSiret} onChange={(e) => setClientSiret(e.target.value)} maxLength={14} />
                        <Input placeholder="N° TVA (ex: FRXX123456789)" value={clientVatNumber} onChange={(e) => setClientVatNumber(e.target.value)} />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Dates section */}
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-100/50">
                  <CalendarIcon size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Dates</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-gray-500 font-medium block mb-1.5">Date d'émission</label>
                    <div className="relative">
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="bg-gray-50 dark:bg-gray-100 cursor-pointer" />
                      {showCalendar && (
                        <div className="absolute top-full right-0 z-30 mt-1">
                          <Calendar value={new Date(issueDate)} onChange={(date) => { setIssueDate(date.toISOString().split('T')[0]); setShowCalendar(false); }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <label className="text-[11px] text-gray-400 dark:text-gray-500 font-medium block mb-1.5">Conditions de paiement</label>
                  <PaymentTermsSelector termId={paymentTermId} value={paymentDays} onChange={(days, id) => { setPaymentDays(days); setPaymentTermId(id); }} issueDate={issueDate} />
                </div>
              </div>

              {/* Items section */}
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-100/50">
                  <AlignLeft size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Prestations</h3>
                  <span className="ml-auto text-[11px] text-gray-300 dark:text-gray-600 font-medium">{items.length} ligne{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-2">
                  {items.map((item, idx) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="group relative p-3 sm:p-4 bg-gray-50 dark:bg-gray-100/50 rounded-xl border border-gray-100 dark:border-white/5 hover:border-blue-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center">{idx + 1}</span>
                          {items.length > 1 && (
                            <div className="flex gap-0.5">
                              <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0} className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 disabled:opacity-30 transition-colors"><ChevronUp size={12} /></button>
                              <button onClick={() => moveItem(item.id, 'down')} disabled={idx === items.length - 1} className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 disabled:opacity-30 transition-colors"><ChevronDown size={12} /></button>
                            </div>
                          )}
                        </div>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item.id)} className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Input placeholder="Description de la prestation ou du produit" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="flex-1" />
                        <button onClick={() => openProductCatalog(idx)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap" title="Importer depuis le catalogue">
                          <Package size={14} /><span className="hidden sm:inline">Catalogue</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input type="number" label="Qté" min="0" step="0.5" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} />
                        <Input type="number" label="Prix unitaire HT" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))} />
                        <Select label="TVA" value={String(item.vat_rate)} onChange={(e) => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))} options={VAT_RATES} />
                      </div>
                      {((item as any).discount_percent ?? 0) > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Percent size={12} className="text-green-500 flex-shrink-0" />
                          <input type="number" min="0" max="100" step="1" value={(item as any).discount_percent ?? ''} onChange={(e) => updateItem(item.id, 'discount_percent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} placeholder="Remise %" className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-center bg-white dark:bg-gray-100 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-green-500/20" />
                          <span className="text-xs text-gray-400">%</span>
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">-{formatCurrency(item.quantity * item.unit_price * ((item as any).discount_percent ?? 0) / 100)}</span>
                          <button onClick={() => updateItem(item.id, 'discount_percent', 0)} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">Retirer</button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                            {(() => {
                              const lineDisc = (item as any).discount_percent ?? 0;
                              const lineHT = item.quantity * item.unit_price;
                              return <>{formatCurrency(lineHT)} HT{lineDisc > 0 && <span className="text-green-600 dark:text-green-400 ml-1">(-{lineDisc}%)</span>}{item.vat_rate > 0 && ` + ${item.vat_rate}% TVA`}</>;
                            })()}
                          </span>
                          {((item as any).discount_percent ?? 0) === 0 && (
                            <button onClick={() => updateItem(item.id, 'discount_percent', 10)} className="text-[10px] text-gray-400 hover:text-green-600 transition-colors flex items-center gap-0.5"><Percent size={10} /> Remise</button>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {(() => {
                            const lineDisc = (item as any).discount_percent ?? 0;
                            const lineHT = item.quantity * item.unit_price;
                            return formatCurrency(lineHT * (1 - lineDisc / 100) * (1 + item.vat_rate / 100));
                          })()} TTC
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-semibold transition-all">
                    <Plus size={15} /> Ajouter une ligne
                  </button>
                </div>
              </div>

              {/* Extra details (référence, mentions, notes internes) — présent en create ET edit (parité) */}
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                <button type="button" onClick={() => setShowExtraDetails(!showExtraDetails)} className="w-full flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-100/50 text-left">
                  <Receipt size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-1">Détails supplémentaires</h3>
                  <motion.div animate={{ rotate: showExtraDetails ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={15} className="text-gray-400" /></motion.div>
                </button>
                {showExtraDetails && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Référence commande</label>
                        <Input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} placeholder="CMD-2024-001" />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 font-medium block mb-1.5">N° bon de commande</label>
                        <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="BC-2024-001" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Mentions légales</label>
                      <Textarea value={legalMentions} onChange={(e) => setLegalMentions(e.target.value)} placeholder="Conditions générales de vente, pénalités de retard…" rows={2} />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Notes internes (masquées)</label>
                      <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Notes pour votre suivi interne…" rows={2} />
                      <p className="text-[11px] text-gray-300 mt-1">Ces notes ne seront pas affichées sur le document.</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Notes section */}
              <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-100/50">
                  <AlignLeft size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Notes & conditions</h3>
                </div>
                <div className="p-4">
                  <Textarea placeholder={profile?.payment_terms || 'Notes ou conditions de paiement…'} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  {profile?.payment_terms && !notes && (
                    <button onClick={() => setNotes(profile.payment_terms ?? '')} className="mt-2 text-xs text-blue-600 font-semibold hover:underline transition-colors">Utiliser mes conditions habituelles</button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: sticky summary */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6 space-y-3">
                {/* Global discount */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent size={15} className="text-gray-400 dark:text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Remise globale</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" max="100" step="0.5" value={discountPercent || ''} onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} placeholder="0" className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-center font-bold bg-white dark:bg-gray-100 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                    {discountPercent > 0 && <span className="text-sm font-bold text-green-600 dark:text-green-400">−{formatCurrency(globalDiscountAmount)}</span>}
                    {discountPercent > 0 && <button onClick={() => setDiscountPercent(0)} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">Retirer</button>}
                  </div>
                  {discountPercent === 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {[5, 10, 15, 20].map((p) => (
                        <button key={p} onClick={() => setDiscountPercent(p)} className="text-xs px-2 py-1 rounded-lg font-semibold transition-colors bg-gray-100 dark:bg-gray-100 text-gray-500 dark:text-gray-400 hover:bg-blue-500/10 hover:text-blue-600">{p}%</button>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Totals card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-slate-900 dark:to-slate-950 rounded-2xl text-white overflow-hidden shadow-xl">
                  <div className="px-5 py-4 border-b border-white/10">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Récapitulatif</p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{formatCurrency(total)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total TTC</p>
                  </div>
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Sous-total HT</span><span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span></div>
                    {totalLineDiscount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Remises/lignes</span><span className="font-semibold tabular-nums">−{formatCurrency(totalLineDiscount)}</span></div>}
                    {globalDiscountAmount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Remise globale {discountPercent}%</span><span className="font-semibold tabular-nums">−{formatCurrency(globalDiscountAmount)}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-gray-400">TVA</span><span className="font-semibold tabular-nums">{formatCurrency(recalculatedVat)}</span></div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between"><span className="text-white font-bold">Total TTC</span><span className="text-blue-400 font-black text-lg sm:text-xl tabular-nums">{formatCurrency(total)}</span></div>
                  </div>
                  {items.filter((i) => i.description || i.unit_price > 0).length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="h-px bg-white/10 mb-3" />
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lignes</p>
                      <div className="space-y-1.5">
                        {items.filter((i) => i.description || i.unit_price > 0).map((item, idx) => (
                          <div key={item.id} className="flex justify-between items-start gap-2">
                            <p className="text-xs text-gray-400 truncate flex-1">{item.description || `Ligne ${idx + 1}`}{(item as any).discount_percent > 0 && <span className="text-green-400 ml-1">(-{(item as any).discount_percent}%)</span>}</p>
                            <p className="text-xs text-white font-semibold tabular-nums flex-shrink-0">{formatCurrency(item.quantity * item.unit_price * (1 - ((item as any).discount_percent ?? 0) / 100) * (1 + item.vat_rate / 100))}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Info */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-4 space-y-2.5 shadow-sm">
                  <div className="flex justify-between text-xs"><span className="text-gray-400 dark:text-gray-500">Type</span><span className="font-semibold text-gray-700 dark:text-gray-300">{docConfig.label}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400 dark:text-gray-500">Client</span><span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{clientName || '—'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400 dark:text-gray-500">Échéance</span><span className="font-semibold text-gray-700 dark:text-gray-300">{dueDate ? new Date(dueDate).toLocaleDateString('fr-FR') : '—'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400 dark:text-gray-500">Lignes</span><span className="font-semibold text-gray-700 dark:text-gray-300">{items.length}</span></div>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl px-3 py-2.5">
                      <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <motion.button initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving} className={cn('w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl text-sm font-bold transition-all shadow-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/30', saving && 'cursor-not-allowed opacity-70')}>
                  {saving ? (<><Loader2 size={16} className="animate-spin" /> {isEdit ? 'Modification en cours…' : 'Création en cours…'}</>) : (<>{isEdit ? <Save size={17} /> : <FileText size={17} />}{isEdit ? 'Enregistrer les modifications' : 'Créer le document'}</>)}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Bar */}
      <InvoiceMobileActionBar onSave={handleSave} saving={saving} isEdit={isEdit} actions={[
        { icon: Eye, label: 'Prévisualiser', onClick: () => isEdit && invoice ? router.push(`/invoices/${invoice.id}`) : toast.info('Aperçu bientôt disponible'), description: 'Voir le document' },
        { icon: Send, label: 'Envoyer par email', onClick: () => toast.info('Envoi disponible après enregistrement'), description: 'Envoyer au client' },
      ]} />

      {/* Product Catalog Modal */}
      <AnimatePresence>
        {showProductCatalog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProductCatalog(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"><Package size={20} className="text-white" /></div>
                  <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Catalogue de produits</h3><p className="text-xs text-gray-500">Sélectionnez un produit à importer</p></div>
                </div>
                <button onClick={() => setShowProductCatalog(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><X size={20} className="text-gray-500" /></button>
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Rechercher par nom, référence, description…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={32} className="text-blue-500 animate-spin" /></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">{productSearch ? 'Aucun produit trouvé' : 'Votre catalogue est vide'}</p>
                    {!productSearch && <button onClick={() => { setShowProductCatalog(false); router.push('/products'); }} className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all">Créer des produits</button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <button key={product.id} onClick={() => selectProduct(product)} className="w-full p-4 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-gray-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 rounded-2xl transition-all text-left group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                              {product.reference && <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-semibold rounded-full">{product.reference}</span>}
                            </div>
                            {product.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{product.description}</p>}
                            <div className="flex items-center gap-3 text-xs text-gray-400"><span className="px-2 py-1 bg-white dark:bg-gray-100 rounded-lg">{product.unit}</span><span>TVA {product.vat_rate}%</span></div>
                          </div>
                          <div className="flex-shrink-0 text-right"><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.unit_price)}</p><p className="text-xs text-gray-400">HT/unité</p></div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Type Modal (création) */}
      {!isEdit && (
        <ClientTypeModal open={showClientTypeModal} onSelect={handleClientTypeSelect} clientName={clientName} />
      )}
    </div>
  );
}
