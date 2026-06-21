'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown,
  Building2, User, Search, Percent,
  CalendarDays, MessageSquare,
  Clock, CheckCircle2, Receipt, Package, ShieldCheck,
  Eraser, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { springFast, springSmooth } from '@/lib/motion';
import { CompanySearch } from '@/components/ui/CompanySearch';
import { useDocumentSessionStore } from '../documentSessionStore';
import { DOC_TYPE_CONFIGS } from '../config/documentTypeConfig';
import InlineDoubtCard from '../DoubtResolution/InlineDoubtCard';
import TemplateSelector from './TemplateSelector';
import PaymentTermsSelector from '@/components/ui/PaymentTermsSelector';
import FacturXWarnings from '@/components/ui/FacturXWarnings';
import { PDPValidator } from '@/components/ui/PDPValidator';
import { ProductCatalogModal } from '@/components/invoices/ProductCatalogModal';
import { Product } from '@/types';
import { toast } from 'sonner';

// ─── Section Wrapper with Micro Button ──────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}

function FormSection({ title, icon, children, defaultOpen = true, badge }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springFast}
      className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden"
    >
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="flex-1 text-left text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        {badge}
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={springFast}
        >
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>

      {/* Section content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSmooth}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Input Field ────────────────────────────────────────

interface InputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
  suffix?: string;
  className?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
  autoFocus?: boolean;
  /** Field key for doubt resolution matching */
  fieldKey?: string;
  /** Ref map to register this field for doubt anchoring */
  fieldRefMap?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  /** FLAW 3 FIX: Whether this field has a pending AI doubt (pulsing amber highlight) */
  hasDoubt?: boolean;
}

function FormInput({ label, value, onChange, placeholder, type = 'text', icon, required, suffix, className, inputMode, autoFocus, fieldKey, fieldRefMap, hasDoubt }: InputProps) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Register this field's ref for doubt resolution anchoring
  useEffect(() => {
    if (fieldKey && fieldRefMap && wrapperRef.current) {
      fieldRefMap.current.set(fieldKey, wrapperRef.current);
    }
  }, [fieldKey, fieldRefMap]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative space-y-1.5', className)}
    >
      {/* FLAW 3 FIX: AI Doubt highlight — pulsing amber ring (Loi: Visibility of System Status — NN/g Heuristic 1) */}
      <AnimatePresence>
        {hasDoubt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-1.5 rounded-xl border-2 border-amber-400/70 dark:border-amber-500/50 pointer-events-none z-10"
          />
        )}
      </AnimatePresence>
      <motion.div
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        <label className={cn(
          'text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors duration-200',
          focused ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300',
        )}>
          {icon}
          {label}
          {required && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            required={required}
            autoFocus={autoFocus}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl border text-sm transition-all duration-200',
              focused
                ? 'border-emerald-400 dark:border-emerald-500 bg-white dark:bg-white/[0.06] ring-2 ring-emerald-500/20 shadow-sm'
                : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04]',
              'text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none',
            )}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              {suffix}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Line Discount Control (% or €) ─────────────────────

interface LineDiscountControlProps {
  item: any;
  onChange: (field: string, value: number) => void;
}

/** Sélecteur de remise par ligne : bascule % / € + valeur. La remise € est
 *  prioritaire si présente. Mode persistant via champ actif. */
function LineDiscountControl({ item, onChange }: LineDiscountControlProps) {
  const inferredMode: 'percent' | 'amount' = Number(item.discount_amount) > 0 ? 'amount' : 'percent';
  const [mode, setMode] = useState<'percent' | 'amount'>(inferredMode);
  // Resync quand l'item change extérieurement (hydratation, IA, undo).
  useEffect(() => { setMode(inferredMode); }, [Number(item.discount_amount) > 0]);

  const value = mode === 'amount' ? (item.discount_amount ?? '') : (item.discount_percent ?? '');

  const switchMode = (m: 'percent' | 'amount') => {
    if (m === mode) return;
    if (m === 'amount') onChange('discount_percent', 0);
    else onChange('discount_amount', 0);
    setMode(m);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Remise ligne
      </span>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => switchMode('percent')}
          className={cn(
            'px-2 py-1 text-[10px] font-bold transition-colors',
            mode === 'percent'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-50 dark:bg-white/[0.04] text-gray-400 hover:text-gray-600',
          )}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => switchMode('amount')}
          className={cn(
            'px-2 py-1 text-[10px] font-bold transition-colors',
            mode === 'amount'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-50 dark:bg-white/[0.04] text-gray-400 hover:text-gray-600',
          )}
        >
          €
        </button>
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={0}
        onChange={(e) => {
          const v = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
          onChange(mode === 'amount' ? 'discount_amount' : 'discount_percent', v);
        }}
        placeholder="0"
        className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

interface DocumentFormPanelProps {
  profile: any;
  isPro: boolean;
  onPaywall: () => void;
}

export default function DocumentFormPanel({
  profile,
  isPro,
  onPaywall,
}: DocumentFormPanelProps) {
  const store = useDocumentSessionStore();
  const {
    documentType,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    clientCity,
    clientPostalCode,
    clientSiret,
    clientVatNumber,
    clientType,
    items,
    notes,
    discountPercent,
    discountType,
    discountAmountInput,
    issueDate,
    paymentDays,
    paymentTermId,
    subtotal,
    vatAmount,
    globalDiscountAmount,
    lineDiscountAmount,
    total,
    pendingDoubts,
    resolveDoubts,
    dismissDoubts,
    templateId,
    updateField,
    updateItem,
    addItem,
    removeItem,
    clearItem,
    duplicateItem,
    dueDate,
  } = store;

  const config = DOC_TYPE_CONFIGS[documentType];
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ─── Catalogue produits (modal partagé) ───────────────
  const [showCatalog, setShowCatalog] = useState(false);
  // null = ajout multiple (bulk) ; sinon id de la ligne à remplacer.
  const [catalogReplaceId, setCatalogReplaceId] = useState<string | null>(null);

  // FIXER (BUG 2) : description fidèle au catalogue, sans concaténer le nom.
  const productDesc = useCallback(
    (p: Product) => p.description?.trim() || p.name,
    [],
  );

  const openCatalogBulk = useCallback(() => {
    setCatalogReplaceId(null);
    setShowCatalog(true);
  }, []);

  const openCatalogReplace = useCallback((itemId: string) => {
    setCatalogReplaceId(itemId);
    setShowCatalog(true);
  }, []);

  const handleCatalogApply = useCallback((prods: Product[]) => {
    if (catalogReplaceId && prods.length === 1) {
      const p = prods[0];
      const desc = productDesc(p);
      updateItem(catalogReplaceId, 'description', desc);
      updateItem(catalogReplaceId, 'unit_price', p.unit_price);
      updateItem(catalogReplaceId, 'vat_rate', p.vat_rate);
      toast.success('Article importé depuis le catalogue');
    } else {
      const queue = [...prods];
      // Remplit la première ligne vide s'il y en a une.
      const firstEmpty = store.items.find((i) => !i.description && i.unit_price === 0);
      if (firstEmpty) {
        const p = queue.shift()!;
        updateItem(firstEmpty.id, 'description', productDesc(p));
        updateItem(firstEmpty.id, 'unit_price', p.unit_price);
        updateItem(firstEmpty.id, 'vat_rate', p.vat_rate);
      }
      for (const p of queue) {
        addItem({
          description: productDesc(p),
          quantity: 1,
          unit_price: p.unit_price,
          vat_rate: p.vat_rate,
        });
      }
      toast.success(`${prods.length} article${prods.length > 1 ? 's' : ''} ajouté${prods.length > 1 ? 's' : ''} depuis le catalogue`);
    }
    setShowCatalog(false);
    setCatalogReplaceId(null);
  }, [catalogReplaceId, store.items, updateItem, addItem, productDesc]);

  // ─── Objet facture pour la conformité (Factur-X / PDP) ───
  const complianceInvoice = useMemo(() => ({
    issue_date: issueDate,
    due_date: dueDate || undefined,
    document_type: documentType,
    client_name_override: clientName || undefined,
    client_email: clientEmail || undefined,
    client_phone: clientPhone || undefined,
    client_address: clientAddress || undefined,
    client_city: clientCity || undefined,
    client_postal_code: clientPostalCode || undefined,
    client_siret: clientSiret || undefined,
    client_vat_number: clientVatNumber || undefined,
    items,
  }), [issueDate, dueDate, documentType, clientName, clientEmail, clientPhone, clientAddress, clientCity, clientPostalCode, clientSiret, clientVatNumber, items]);

  // ─── Field Ref Map for Doubt Resolution ────────────
  const fieldRefMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // ─── Doubt Resolution ──────────────────────────────
  const handleDoubtConfirm = useCallback((doubt: typeof pendingDoubts[0], value: string | number) => {
    const corrections: Record<string, string | number> = { [doubt.field]: value };
    resolveDoubts(corrections);
  }, [resolveDoubts]);

  const handleDoubtCorrect = useCallback((doubt: typeof pendingDoubts[0], value: string | number) => {
    const corrections: Record<string, string | number> = { [doubt.field]: value };
    resolveDoubts(corrections);
  }, [resolveDoubts]);

  const handleDoubtDismiss = useCallback((doubt: typeof pendingDoubts[0]) => {
    // Dismiss just this one doubt
    const corrections: Record<string, string | number> = { [doubt.field]: doubt.current_value ?? '' };
    resolveDoubts(corrections);
  }, [resolveDoubts]);

  // ─── FLAW 3: Doubt Highlight Helper ─────────────────
  // Used to add pulsing amber rings around fields with pending AI doubts
  const hasDoubtFor = useCallback((fieldKey: string) =>
    pendingDoubts.some(d => d.field === fieldKey),
    [pendingDoubts]
  );

  // ─── Line item helpers ──────────────────────────────
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const lineTotal = (item: typeof items[0]) => {
    const gross = item.quantity * item.unit_price;
    const it = item as any;
    // Remise ligne : € (discount_amount) prioritaire sur % (discount_percent).
    const discAmount = Number(it.discount_amount) > 0 ? Math.min(Number(it.discount_amount), gross) : 0;
    const discPct = Number(it.discount_percent) > 0 ? gross * (Number(it.discount_percent) / 100) : 0;
    return gross - (discAmount || discPct);
  };

  // ─── Client Type Badge ──────────────────────────────
  const clientTypeBadge = clientType ? (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        clientType === 'b2b'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      )}
    >
      {clientType === 'b2b' ? <Building2 size={10} /> : <User size={10} />}
      {clientType === 'b2b' ? 'B2B' : 'B2C'}
    </motion.div>
  ) : null;

  return (
    <div className="flex flex-col">
      {/* ─── Form Content ────────────────────
          CIBLE 2 FIX : le scroll est géré par le parent (CanvasCopilotLayout,
          desktop :191 / mobile :225). Retrait du double scroll imbriqué qui
          cassait les ancres de scroll + le momentum. */}
      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* ═══════════ CLIENT SECTION ═══════════ */}
        <FormSection
          title="Client"
          icon={<User size={14} className="text-blue-500" />}
          badge={clientTypeBadge}
          defaultOpen={true}
        >
          {/* Client type selector */}
          <div className="flex gap-2 mb-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => updateField('clientType', 'b2b')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                clientType === 'b2b'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-gray-300',
              )}
            >
              <Building2 size={14} />
              Entreprise
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => updateField('clientType', 'b2c')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                clientType === 'b2c'
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-gray-300',
              )}
            >
              <User size={14} />
              Particulier
            </motion.button>
          </div>

          <div className="space-y-3">
            {/* FLAW 2 FIX: clientType drives B2C/B2B search behavior */}
            <CompanySearch
              value={clientName}
              onChange={(v) => updateField('clientName', v)}
              onSelect={(company) => {
                updateField('clientName', company.name);
                updateField('clientSiret', company.siret);
                updateField('clientVatNumber', company.vat_number);
                updateField('clientAddress', company.address);
                updateField('clientCity', company.city);
                updateField('clientPostalCode', company.postal_code);
                updateField('clientType', 'b2b');
              }}
              label="Nom du client"
              placeholder={clientType === 'b2c' ? 'Prénom et nom du client' : 'Nom, SIRET ou raison sociale'}
              required
              clientType={clientType}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Email"
                value={clientEmail}
                onChange={(v) => updateField('clientEmail', v)}
                placeholder="email@example.com"
                type="email"
                inputMode="email"
                fieldKey="client_email"
                fieldRefMap={fieldRefMap}
              />
              <FormInput
                label="Téléphone"
                value={clientPhone}
                onChange={(v) => updateField('clientPhone', v)}
                placeholder="06 12 34 56 78"
                type="tel"
                inputMode="tel"
                fieldKey="client_phone"
                fieldRefMap={fieldRefMap}
              />
            </div>

            {/* SIRET — B2B only, or optional for B2C */}
            <AnimatePresence>
              {clientType === 'b2b' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSmooth}
                >
                  <div className="space-y-3">
                    <FormInput
                      label="SIRET"
                      value={clientSiret}
                      onChange={(v) => updateField('clientSiret', v)}
                      placeholder="123 456 789 01234"
                      required={clientType === 'b2b'}
                      icon={<Building2 size={10} className="text-emerald-500" />}
                      fieldKey="client_siret"
                      fieldRefMap={fieldRefMap}
                    />
                    <FormInput
                      label="N° TVA"
                      value={clientVatNumber}
                      onChange={(v) => updateField('clientVatNumber', v)}
                      placeholder="FR 12 345678901"
                      fieldKey="client_vat_number"
                      fieldRefMap={fieldRefMap}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced address — progressive disclosure */}
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform', advancedOpen && 'rotate-180')} />
              Adresse et détails
            </button>

            <AnimatePresence>
              {advancedOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSmooth}
                  className="space-y-3"
                >
                  <FormInput
                    label="Adresse"
                    value={clientAddress}
                    onChange={(v) => updateField('clientAddress', v)}
                    placeholder="Numéro et rue"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <FormInput
                      label="Code postal"
                      value={clientPostalCode}
                      onChange={(v) => updateField('clientPostalCode', v)}
                      placeholder="75001"
                      inputMode="numeric"
                    />
                    <FormInput
                      label="Ville"
                      value={clientCity}
                      onChange={(v) => updateField('clientCity', v)}
                      placeholder="Paris"
                      className="col-span-2"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* B2B compliance indicator */}
            {clientType === 'b2b' && clientSiret && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
              >
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Facturation électronique PDP activée pour ce client B2B
                </span>
              </motion.div>
            )}
          </div>
        </FormSection>

        {/* ═══════════ LINE ITEMS SECTION ═══════════ */}
        <FormSection
          title="Lignes"
          icon={<Receipt size={14} className="text-emerald-500" />}
          badge={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openCatalogBulk(); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Ajouter plusieurs articles depuis le catalogue"
              >
                <Package size={12} /> Catalogue
              </button>
              <span className="text-[10px] font-bold text-gray-400">
                {items.length} ligne{items.length > 1 ? 's' : ''}
              </span>
            </div>
          }
          defaultOpen={true}
        >
          <div className="space-y-3">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={springFast}
                className="relative bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.06] p-3 space-y-2.5"
              >
                {/* Line number + description */}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 mt-3 flex-shrink-0 w-4">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <FormInput
                      label="Description"
                      value={item.description}
                      onChange={(v) => updateItem(item.id, 'description', v)}
                      placeholder="Prestation ou produit"
                      fieldKey={`items[${idx}].description`}
                      fieldRefMap={fieldRefMap}
                      hasDoubt={hasDoubtFor(`items[${idx}].description`)}
                    />
                  </div>
                  <div className="mt-6 flex items-center gap-0.5 flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => openCatalogReplace(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                      title="Importer depuis le catalogue"
                    >
                      <Package size={13} />
                    </motion.button>
                    {/* CIBLE 1 — Vider la ligne : présent sur TOUTES les lignes (reset du contenu) */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => clearItem(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                      title="Vider la ligne"
                    >
                      <Eraser size={13} />
                    </motion.button>
                    {/* CIBLE 1 — Dupliquer la ligne : first-class (pattern Cushion 2026), sur TOUTES les lignes */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => duplicateItem(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                      title="Dupliquer la ligne"
                    >
                      <Copy size={13} />
                    </motion.button>
                    {/* Supprimer : masqué sur la 1re ligne (invariant ≥ 1 ligne garanti par removeItem) */}
                    {items.length > 1 && (
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Qty, Price, TVA */}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <FormInput
                    label="Qté"
                    value={item.quantity || ''}
                    onChange={(v) => updateItem(item.id, 'quantity', v)}
                    placeholder="1"
                    inputMode="numeric"
                    fieldKey={`items[${idx}].quantity`}
                    fieldRefMap={fieldRefMap}
                  />
                  <FormInput
                    label="Prix unit. HT"
                    value={item.unit_price || ''}
                    onChange={(v) => updateItem(item.id, 'unit_price', v)}
                    placeholder="0.00"
                    inputMode="numeric"
                    suffix="EUR"
                    fieldKey={`items[${idx}].unit_price`}
                    fieldRefMap={fieldRefMap}
                    hasDoubt={hasDoubtFor(`items[${idx}].unit_price`)}
                  />
                  <div className="space-y-1.5 pb-[1px]">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                      <Percent size={9} className="text-gray-400" />
                      TVA
                    </label>
                    <select
                      value={item.vat_rate}
                      onChange={(e) => updateItem(item.id, 'vat_rate', e.target.value)}
                      className="w-[72px] px-2 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer"
                    >
                      <option value={0}>0%</option>
                      <option value={5.5}>5.5%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>
                </div>

                {/* Remise ligne (% ou €) */}
                <LineDiscountControl
                  item={item}
                  onChange={(field, value) => updateItem(item.id, field, value)}
                />

                {/* Line total */}
                {item.unit_price > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end"
                  >
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {formatPrice(lineTotal(item))} EUR HT
                    </span>
                  </motion.div>
                )}
              </motion.div>
            ))}

          </div>
        </FormSection>

        {/* CIBLE 2 — « Ajouter une ligne » sticky : toujours visible & cliquable
            pendant la saisie. Sorti de la FormSection (overflow-hidden) pour que
            le sticky colle au viewport, pas à la card. backdrop-blur reste propre
            au-dessus des cards ET des zones blanches. */}
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pb-3 pt-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-gray-100 dark:border-white/[0.06]">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => addItem()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-control border-2 border-dashed border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2.5} />
            Ajouter une ligne
          </motion.button>
        </div>

        {/* ═══════════ TOTALS SECTION ═══════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springFast, delay: 0.1 }}
          className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Receipt size={14} className="text-emerald-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Totaux</span>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {/* Subtotal (brut) */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sous-total HT</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(subtotal)} €</span>
            </div>

            {/* Remises par ligne (somme) */}
            {lineDiscountAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex justify-between text-sm"
              >
                <span className="text-orange-500">Remises lignes</span>
                <span className="font-medium text-orange-500">−{formatPrice(lineDiscountAmount)} €</span>
              </motion.div>
            )}

            {/* Remise globale éditable (% ou €) */}
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">Remise globale</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => updateField('discountType', 'percent')}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold transition-colors',
                      discountType === 'percent'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-50 dark:bg-white/[0.04] text-gray-400 hover:text-gray-600',
                    )}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => updateField('discountType', 'amount')}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold transition-colors',
                      discountType === 'amount'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-50 dark:bg-white/[0.04] text-gray-400 hover:text-gray-600',
                    )}
                  >€</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={discountType === 'amount' ? (discountAmountInput || '') : (discountPercent || '')}
                  onChange={(e) => {
                    const v = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                    updateField(discountType === 'amount' ? 'discountAmountInput' : 'discountPercent', v);
                  }}
                  placeholder="0"
                  className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                {globalDiscountAmount > 0 && (
                  <span className="text-xs font-medium text-orange-500 whitespace-nowrap">−{formatPrice(globalDiscountAmount)} €</span>
                )}
              </div>
            </div>

            {/* VAT */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">TVA</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(vatAmount)} €</span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-white/[0.06] my-1" />

            {/* Total TTC — FLAW 5 FIX: HERO number with gradient accent (Chrométrie & Hiérarchie) */}
            <div className="flex justify-between items-center -mx-4 px-4 py-3 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-500/[0.08] dark:to-transparent rounded-b-2xl -mb-4">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Total TTC</span>
              <motion.span
                key={total}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springFast}
                className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight"
              >
                {formatPrice(total)} EUR
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* ═══════════ OPTIONS SECTION ═══════════ */}
        <FormSection
          title="Options"
          icon={<CalendarDays size={14} className="text-purple-500" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <TemplateSelector
              value={templateId}
              onChange={(id) => updateField('templateId', id)}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Date d'émission"
                value={issueDate}
                onChange={(v) => updateField('issueDate', v)}
                type="date"
                icon={<CalendarDays size={10} className="text-gray-400" />}
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={9} className="text-gray-400" />
                  Délai paiement
                </label>
                <PaymentTermsSelector
                  termId={paymentTermId}
                  value={paymentDays}
                  onChange={(days, id) => {
                    updateField('paymentDays', days);
                    updateField('paymentTermId', id);
                  }}
                  issueDate={issueDate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={9} className="text-gray-400" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Conditions, remarques..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all resize-none"
              />
            </div>
          </div>
        </FormSection>

        {/* ═══════════ CONFORMITÉ (Factur-X / PDP) ═══════════ */}
        <FormSection
          title="Conformité"
          icon={<ShieldCheck size={14} className="text-amber-500" />}
          defaultOpen={false}
          badge={clientType === 'b2b' ? (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">B2B</span>
          ) : undefined}
        >
          <div className="space-y-3">
            <FacturXWarnings
              invoice={complianceInvoice}
              profile={profile}
              variant="accordion"
            />
            <PDPValidator
              invoice={complianceInvoice}
              profile={profile}
              mode="accordion"
            />
          </div>
        </FormSection>
      </div>

      {/* ─── Inline Doubt Cards ────────────────────────── */}
      <AnimatePresence>
        {pendingDoubts.length > 0 && pendingDoubts.map((doubt) => {
          const targetRef = { current: fieldRefMap.current.get(doubt.field) || null };
          if (!targetRef.current) return null;
          return (
            <InlineDoubtCard
              key={doubt.field}
              doubt={doubt}
              targetRef={targetRef as React.RefObject<HTMLElement>}
              onConfirm={(val) => handleDoubtConfirm(doubt, val)}
              onCorrect={(val) => handleDoubtCorrect(doubt, val)}
              onDismiss={() => handleDoubtDismiss(doubt)}
            />
          );
        })}
      </AnimatePresence>

      {/* ─── Catalogue produits (modal partagé) ─── */}
      <ProductCatalogModal
        open={showCatalog}
        onClose={() => setShowCatalog(false)}
        onApply={handleCatalogApply}
        replaceMode={catalogReplaceId !== null}
        userId={profile?.id}
      />
    </div>
  );
}
