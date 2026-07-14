'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useCrmStore } from '@/stores/crmStore';
import { useSubscription } from '@/hooks/useSubscription';
import { getSupabaseClient } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ImportClientsModal } from '@/components/ui/ImportClientsModal';
import DocPickerModal from '@/components/clients/DocPickerModal';
import BottomSheet from '@/components/layout/BottomSheet';
import QuickActionsSheet from '@/components/layout/QuickActionsSheet';
import KebabMenu from '@/components/ui/KebabMenu';
import { useLongPress } from '@/lib/use-long-press';
import {
  getInitials, downloadCSV, validateSiret, validateVatNumber, formatCurrency, cn,
} from '@/lib/utils';
import { CompanySearch } from '@/components/ui/CompanySearch';
import {
  Users, Package, Target, Plus, Search, Trash2, Phone, Mail, Download,
  MapPin, FileText, TrendingUp, ChevronRight, Sparkles, Grid3X3, List,
  ArrowUpRight, Check, X, Edit2, Hash, Copy, DollarSign,
  Wrench, ShoppingBag, Cpu, Archive as ArchiveIcon,
  ExternalLink, ArrowRight, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/* ------------------------------------------------------------------ */
/*  TAB DEFINITIONS                                                   */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'articles', label: 'Articles', icon: Package },
  { key: 'pipeline', label: 'Pipeline CRM', icon: Target },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/* ------------------------------------------------------------------ */
/*  AVATAR COLORS                                                     */
/* ------------------------------------------------------------------ */
const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-violet-600', 'bg-amber-500',
  'bg-rose-500', 'bg-pink-500', 'bg-cyan-600', 'bg-teal-600',
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

/* ------------------------------------------------------------------ */
/*  PRODUCT CONSTANTS                                                 */
/* ------------------------------------------------------------------ */
const PRODUCT_CATEGORIES = [
  { value: 'service', label: 'Service', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  { value: 'product', label: 'Produit', icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  { value: 'software', label: 'Logiciel', icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10', dot: 'bg-purple-400' },
  { value: 'consulting', label: 'Conseil', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  { value: 'other', label: 'Autre', icon: ArchiveIcon, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
];

const PRODUCT_UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'kg', label: 'Kilogramme' },
  { value: 'km', label: 'Kilomètre' },
  { value: 'forfait', label: 'Forfait' },
];

const PRODUCT_VAT_RATES = [0, 5.5, 10, 20];

interface Product {
  id: string; user_id: string; name: string; description: string;
  unit_price: number; unit: string; vat_rate: number; category: string;
  reference: string; is_active: boolean; created_at: string;
}

const getCatStyle = (cat: string) => PRODUCT_CATEGORIES.find(c => c.value === cat) || PRODUCT_CATEGORIES[4];
const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

/* ================================================================== */
/*  CLIENT FORM (shared between Modal and BottomSheet)                */
/* ================================================================== */
function ClientForm({
  form, set, error, loading, onSubmit,
}: {
  form: Record<string, string>;
  set: (k: string, v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CompanySearch
        label="Nom *"
        value={form.name}
        onChange={(v) => set('name', v)}
        onSelect={(company) => {
          set('name', company.name);
          if (company.siret) set('siret', company.siret);
          if (company.address) set('address', company.address);
          if (company.postal_code) set('postal_code', company.postal_code);
          if (company.city) set('city', company.city);
          if (company.vat_number) set('vat_number', company.vat_number);
        }}
        placeholder="Rechercher par nom ou SIRET..."
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Email" type="email" placeholder="contact@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Téléphone" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <Input label="Adresse" placeholder="123 rue de la Paix" value={form.address} onChange={(e) => set('address', e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Code postal" placeholder="75001" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
        <Input label="Ville" placeholder="Paris" value={form.city} onChange={(e) => set('city', e.target.value)} className="sm:col-span-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
        <Input label="N° degré TVA intracommunautaire" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
      </div>
      <Input label="Site web" placeholder="https://exemple.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" loading={loading}>Créer le client</Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  MOBILE CLIENT CARD                                                */
/* ================================================================== */
function MobileClientCard({ client, stats, idx, onDelete }: {
  client: any; stats: { count: number; revenue: number; pending: number }; idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const lp = useLongPress(() => setShowQuickActions(true));
  // Le handler parent n'utilise l'événement que pour preventDefault/stopPropagation ;
  // on lui passe un événement synthétique pour le déclenchement depuis le sheet.
  const syntheticEvt = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;

  return (
    <>
      <Link href={`/clients/${client.id}`} className="block">
        <motion.div variants={staggerItem} whileTap={{ scale: 0.98 }}
          {...lp.bind()} onClickCapture={lp.onClickGuard}
          className="bg-muted/40 border border-border rounded-card p-5 cursor-pointer active:bg-muted/60 transition-colors">
          <div className="flex items-start gap-3.5 mb-3">
            <div className={cn('w-11 h-11 rounded-control flex items-center justify-center text-foreground font-bold text-sm flex-shrink-0', color)}>
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold truncate">{client.name}</p>
              {client.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="flex-shrink-0" />{client.city}
                </p>
              )}
            </div>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); }}
              className="touch-target p-2 rounded-control hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 flex items-center justify-center">
              <Trash2 size={18} />
            </button>
          </div>
          {(client.email || client.phone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
              {client.email && <span className="flex items-center gap-1"><Mail size={11} className="flex-shrink-0" />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-1"><Phone size={11} className="flex-shrink-0" />{client.phone}</span>}
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
              <FileText size={12} />
              <span className="font-medium">{stats.count}</span>
              <span>facture{stats.count !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs">
              <span className="text-emerald-400 font-semibold">{formatCurrency(stats.revenue)}</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs">
                <span className="text-amber-400 font-medium">{formatCurrency(stats.pending)} att.</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocPickerOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-control bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors">
              <FileText size={12} /><span>+ Doc</span>
            </button>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </motion.div>
      </Link>
      <DocPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} clientId={client.id} clientName={client.name} />
      <QuickActionsSheet
        open={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        title={client.name || 'Client'}
        actions={[
          { label: 'Voir la fiche', icon: Eye, onClick: () => router.push(`/clients/${client.id}`) },
          { label: 'Nouveau document', icon: FileText, onClick: () => setDocPickerOpen(true) },
          ...(client.phone
            ? [{ label: 'Appeler', icon: Phone, onClick: () => { window.location.href = `tel:${client.phone}` } }]
            : []),
          ...(client.email
            ? [{ label: 'Envoyer un email', icon: Mail, onClick: () => { window.location.href = `mailto:${client.email}` } }]
            : []),
          { label: 'Supprimer', icon: Trash2, onClick: () => onDelete(syntheticEvt), danger: true },
        ]}
      />
    </>
  );
}

/* ================================================================== */
/*  DESKTOP CLIENT CARD (grid)                                        */
/* ================================================================== */
function DesktopClientCardGrid({ client, stats, idx, onDelete }: {
  client: any; stats: { count: number; revenue: number; pending: number }; idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const syntheticEvt = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;

  return (
    <>
      <Link href={`/clients/${client.id}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.04, ease: EASE }}
          whileHover={{ y: -2 }}
          className="group bg-card border border-border rounded-card p-5 cursor-pointer hover:border-emerald-500/30 transition-colors">
          <div className="flex items-start gap-3.5 mb-4">
            <div className={cn('w-12 h-12 rounded-control flex items-center justify-center text-foreground font-bold text-sm flex-shrink-0', color)}>
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-semibold truncate group-hover:text-emerald-400 transition-colors">{client.name}</h3>
              {client.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate"><Mail size={11} className="flex-shrink-0" />{client.email}</p>
              )}
              {client.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin size={11} className="flex-shrink-0" />{client.city}</p>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
              <KebabMenu
                align="right"
                items={[
                  ...(client.phone ? [{ label: 'Appeler', icon: Phone, onClick: () => { window.location.href = `tel:${client.phone}` } }] : []),
                  ...(client.email ? [{ label: 'Email', icon: Mail, onClick: () => { window.location.href = `mailto:${client.email}` } }] : []),
                  { label: 'Nouveau document', icon: FileText, onClick: () => setDocPickerOpen(true) },
                  { label: 'Supprimer', icon: Trash2, onClick: () => onDelete(syntheticEvt), danger: true },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2.5 rounded-xl bg-blue-500/10">
              <p className="text-blue-400 font-bold">{stats.count}</p>
              <p className="text-xs text-blue-400/80">Facture{stats.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 min-w-0">
              <p className="text-emerald-400 font-bold truncate">{formatCurrency(stats.revenue)}</p>
              <p className="text-xs text-muted-foreground">Encaissé</p>
            </div>
            {stats.pending > 0 ? (
              <div className="text-center p-2.5 rounded-xl bg-amber-500/10 min-w-0">
                <p className="text-amber-400 font-bold truncate">{formatCurrency(stats.pending)}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            ) : (
              <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 min-w-0">
                <p className="text-emerald-400"><Check size={18} className="mx-auto" /></p>
                <p className="text-xs text-muted-foreground">A jour</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocPickerOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-control bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors">
              <FileText size={12} /><span>+ Doc</span>
            </button>
            <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-emerald-400 transition-colors" />
          </div>
        </motion.div>
      </Link>
      <DocPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} clientId={client.id} clientName={client.name} />
    </>
  );
}

/* ================================================================== */
/*  DESKTOP CLIENT ROW (list)                                         */
/* ================================================================== */
function DesktopClientRow({ client, stats, idx, onDelete }: {
  client: any; stats: { count: number; revenue: number; pending: number }; idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const router = useRouter();
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.03, ease: EASE }}
        className="hover:bg-muted/40 cursor-pointer transition-colors group border-b border-border last:border-b-0"
        onClick={() => router.push(`/clients/${client.id}`)}>
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-control flex items-center justify-center text-foreground font-bold text-sm flex-shrink-0', color)}>
              {getInitials(client.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
              {client.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={9} />{client.city}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-4 hidden md:table-cell">
          <div className="space-y-1">
            {client.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} className="text-muted-foreground" />{client.email}</p>}
            {client.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} className="text-muted-foreground" />{client.phone}</p>}
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">{stats.count}</span>
        </td>
        <td className="px-4 py-4 text-right">
          <p className="text-sm font-bold text-emerald-400 truncate">{formatCurrency(stats.revenue)}</p>
          {stats.pending > 0 && <p className="text-xs text-amber-400 font-medium truncate">{formatCurrency(stats.pending)} en att.</p>}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button onClick={(e) => { e.stopPropagation(); setDocPickerOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-control bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors">
              <FileText size={12} /><span>+ Doc</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              className="p-2 rounded-control hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-emerald-400 transition-colors" />
          </div>
        </td>
      </motion.tr>
      <DocPickerModal open={docPickerOpen} onClose={() => setDocPickerOpen(false)} clientId={client.id} clientName={client.name} />
    </>
  );
}

/* ================================================================== */
/*  PRODUCT CARD (grid)                                               */
/* ================================================================== */
function ProductCardGrid({ product, idx, onEdit, onDelete, onDuplicate }: {
  product: Product; idx: number;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
}) {
  const cat = getCatStyle(product.category);
  const Icon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE, delay: Math.min(idx * 0.03, 0.3) }}
      className="bg-muted/40 border border-border rounded-card overflow-hidden group hover:border-emerald-500/30 transition-colors">
      <div className="relative p-5">
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
          <span className="text-xs font-semibold text-muted-foreground">{cat.label}</span>
        </div>
        <div className={cn('w-12 h-12 rounded-control flex items-center justify-center mb-4 mt-2', cat.bg)}>
          <Icon size={20} className={cat.color} />
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight flex-1">{product.name}</h3>
            {!product.is_active && (
              <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">Inactif</span>
            )}
          </div>
          {product.reference && (
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1"><Hash size={10} />{product.reference}</p>
          )}
          {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
        </div>
        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <p className="text-xl font-bold text-foreground">{formatPrice(product.unit_price)}</p>
            <p className="text-xs text-muted-foreground">HT / {PRODUCT_UNITS.find((u) => u.value === product.unit)?.label} · TVA {product.vat_rate}%</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(product)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={14} /></button>
            <button onClick={() => onDuplicate(product)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-colors"><Copy size={14} /></button>
            <button onClick={() => onDelete(product.id)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  PRODUCT CARD (mobile)                                             */
/* ================================================================== */
function ProductCardMobile({ product, idx, onEdit, onDelete, onDuplicate }: {
  product: Product; idx: number;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
}) {
  const cat = getCatStyle(product.category);
  const Icon = cat.icon;
  const [showQuickActions, setShowQuickActions] = useState(false);
  const lp = useLongPress(() => setShowQuickActions(true));

  return (
    <>
    <motion.div
      {...lp.bind()}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE, delay: Math.min(idx * 0.04, 0.4) }}
      className="bg-muted/40 border border-border rounded-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', cat.bg)}>
            <Icon size={18} className={cat.color} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{product.name}</h3>
            {product.reference && <p className="text-xs text-muted-foreground font-mono">#{product.reference}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
          <span className="text-xs font-semibold text-muted-foreground">{cat.label}</span>
          {!product.is_active && (
            <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold ml-1">Inactif</span>
          )}
        </div>
      </div>
      {product.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <p className="text-lg font-bold text-foreground">{formatPrice(product.unit_price)}</p>
          <p className="text-xs text-muted-foreground">HT / {PRODUCT_UNITS.find((u) => u.value === product.unit)?.label} · TVA {product.vat_rate}%</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(product)} className="touch-target p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"><Edit2 size={16} /></button>
          <button onClick={() => onDuplicate(product)} className="touch-target p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-colors flex items-center justify-center"><Copy size={16} /></button>
          <button onClick={() => onDelete(product.id)} className="touch-target p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors flex items-center justify-center"><Trash2 size={16} /></button>
        </div>
      </div>
    </motion.div>

    <QuickActionsSheet
      open={showQuickActions}
      onClose={() => setShowQuickActions(false)}
      title={product.name || 'Article'}
      actions={[
        { label: 'Éditer', icon: Edit2, onClick: () => onEdit(product) },
        { label: 'Dupliquer', icon: Copy, onClick: () => onDuplicate(product) },
        { label: 'Supprimer', icon: Trash2, onClick: () => onDelete(product.id), danger: true },
      ]}
    />
    </>
  );
}

/* ================================================================== */
/*  MAIN CONTACTS PAGE                                                */
/* ================================================================== */
export default function ContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'clients');

  /* ── Clients state ── */
  const { clients, invoices, createClient, bulkCreateClients, deleteClient } = useDataStore();
  const [clientSearch, setClientSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const [clientViewMode, setClientViewMode] = useState<'grid' | 'list'>('grid');
  const [clientForm, setClientForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', country: 'France', siret: '', vat_number: '', website: '',
  });
  const clientSet = (k: string, v: string) => setClientForm((f) => ({ ...f, [k]: v }));

  /* ── Products state ── */
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', unit_price: '', unit: 'unit', vat_rate: '20', category: 'service', reference: '', is_active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const productSet = (k: string, v: any) => setProductForm((f) => ({ ...f, [k]: v }));

  /* ── CRM state ── */
  const { opportunities } = useCrmStore();
  const sub = useSubscription();

  /* ── Fetch products on mount ── */
  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) { setProducts([]); setProductsLoading(false); return; }
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) { if (error.code === '42P01') { setProducts([]); setProductsLoading(false); return; } throw error; }
      setProducts(data || []);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  /* ── Tab change handler ── */
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  /* ── Clients: memoized data ── */
  const clientSearchQuery = useMemo(() => clientSearch.toLowerCase(), [clientSearch]);

  const filteredClients = useMemo(
    () => clients.filter((c) =>
      !clientSearchQuery ||
      c.name.toLowerCase().includes(clientSearchQuery) ||
      (c.email || '').toLowerCase().includes(clientSearchQuery) ||
      (c.city || '').toLowerCase().includes(clientSearchQuery)
    ),
    [clients, clientSearchQuery],
  );

  const clientStatsMap = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; pending: number }> = {};
    const byClient: Record<string, any[]> = {};
    invoices.forEach((inv) => {
      if (!inv.client_id) return;
      (byClient[inv.client_id] ??= []).push(inv);
    });
    Object.entries(byClient).forEach(([id, invs]) => {
      const revenue = invs.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
      const pending = invs.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
      map[id] = { count: invs.length, revenue, pending };
    });
    return map;
  }, [invoices]);

  const totalRevenue = useMemo(
    () => invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    [invoices],
  );

  const activeClients = useMemo(
    () => clients.filter((c) => invoices.some((i) => i.client_id === c.id)),
    [clients, invoices],
  );

  const getClientStats = useCallback(
    (id: string) => clientStatsMap[id] || { count: 0, revenue: 0, pending: 0 },
    [clientStatsMap],
  );

  /* ── Products: memoized data ── */
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const totalActive = products.filter((p) => p.is_active).length;
  const avgPrice = products.length ? products.reduce((s, p) => s + p.unit_price, 0) / products.length : 0;

  /* ── Client handlers ── */
  const handleExport = useCallback(() => {
    downloadCSV(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nom', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'SIRET', 'N° degré TVA'],
      clients.map((c) => [c.name, c.email, c.phone, c.address, c.postal_code, c.city, c.country, c.siret, c.vat_number]),
    );
  }, [clients]);

  const resetClientForm = useCallback(() => setClientForm({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', country: 'France', siret: '', vat_number: '', website: '',
  }), []);

  const handleCreateClient = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) { setClientError('Le nom est requis'); return; }
    if (clientForm.siret && !validateSiret(clientForm.siret)) { setClientError('SIRET invalide (14 chiffres requis)'); return; }
    if (clientForm.vat_number && !validateVatNumber(clientForm.vat_number)) { setClientError('N° degré TVA invalide'); return; }
    setClientLoading(true); setClientError('');
    try {
      await createClient(clientForm as any);
      setShowClientModal(false);
      toast.success('Client créé avec succès');
      resetClientForm();
    } catch (e: any) { setClientError(e.message); } finally { setClientLoading(false); }
  }, [clientForm, createClient, resetClientForm]);

  const handleDeleteClient = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const client = clients.find((c) => c.id === id);
    toast('Supprimer ce client ?', {
      description: client?.name,
      action: { label: 'Supprimer', onClick: () => deleteClient(id).then(() => toast.success('Client supprimé')).catch((err: any) => toast.error(err.message)) },
    });
  }, [clients, deleteClient]);

  const closeClientModal = useCallback(() => { setShowClientModal(false); setClientError(''); resetClientForm(); }, [resetClientForm]);

  /* ── Product handlers ── */
  const openCreateProduct = () => {
    setProductForm({ name: '', description: '', unit_price: '', unit: 'unit', vat_rate: '20', category: 'service', reference: '', is_active: true });
    setEditingProductId(null);
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setProductForm({
      name: p.name, description: p.description || '', unit_price: String(p.unit_price),
      unit: p.unit, vat_rate: String(p.vat_rate), category: p.category,
      reference: p.reference || '', is_active: p.is_active,
    });
    setEditingProductId(p.id);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProduct(true);
    try {
      const payload = {
        name: productForm.name, description: productForm.description,
        unit_price: parseFloat(productForm.unit_price) || 0, unit: productForm.unit,
        vat_rate: parseFloat(productForm.vat_rate) || 0, category: productForm.category,
        reference: productForm.reference, is_active: productForm.is_active, user_id: user.id,
      };
      if (editingProductId) {
        const { data, error } = await getSupabaseClient().from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingProductId).select().single();
        if (error) throw error;
        setProducts((ps) => ps.map((p) => (p.id === editingProductId ? data : p)));
        toast.success('Produit mis à jour');
      } else {
        const { data, error } = await getSupabaseClient().from('products').insert(payload).select().single();
        if (error) throw error;
        setProducts((ps) => [...ps, data]);
        toast.success('Produit créé');
      }
      setShowProductModal(false);
    } catch (e: any) { toast.error(e.message); } finally { setSavingProduct(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await getSupabaseClient().from('products').delete().eq('id', id);
      setProducts((ps) => ps.filter((p) => p.id !== id));
      toast.success('Produit supprimé');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDuplicateProduct = async (p: Product) => {
    try {
      const { data, error } = await getSupabaseClient().from('products')
        .insert({ ...p, name: `${p.name} (copie)`, id: undefined, created_at: undefined, updated_at: undefined })
        .select().single();
      if (error) throw error;
      setProducts((ps) => [...ps, data]);
      toast.success('Produit dupliqué');
    } catch (e: any) { toast.error(e.message); }
  };

  /* ── CRM stats ── */
  const pipelineValue = useMemo(() => {
    const active = opportunities.filter(o => o.stage !== 'lost');
    return active.reduce((s, o) => s + o.value * o.probability / 100, 0);
  }, [opportunities]);

  const wonRevenue = useMemo(() => opportunities.filter(o => o.stage === 'won').reduce((s, o) => s + o.value, 0), [opportunities]);
  const wonCount = useMemo(() => opportunities.filter(o => o.stage === 'won').length, [opportunities]);
  const lostCount = useMemo(() => opportunities.filter(o => o.stage === 'lost').length, [opportunities]);
  const winRate = wonCount + lostCount > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;

  const clientFormProps = { form: clientForm, set: clientSet, error: clientError, loading: clientLoading, onSubmit: handleCreateClient };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <>
      <h1 className="sr-only">Contacts - Factu.me</h1>
      <main aria-label="Gestion des contacts">
        <div className="space-y-6 md:space-y-8">

          {/* ─── Header ─── */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Contacts
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Clients, articles et pipeline commercial en un seul endroit
            </p>
          </div>

          {/* ─── Segment Control ─── */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <motion.button
                    key={tab.key}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      'relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      isActive
                        ? 'text-gray-900 dark:text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-sm border border-gray-200 dark:border-white/10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <tab.icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ─── Tab Content ─── */}
          <AnimatePresence mode="wait">
            {/* ============================================================ */}
            {/*  CLIENTS TAB                                                 */}
            {/* ============================================================ */}
            {activeTab === 'clients' && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="space-y-6"
              >
                {/* Clients Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Clients</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {clients.length} client{clients.length !== 1 ? 's' : ''} · {activeClients.length} actif{activeClients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {clients.length > 0 && (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleExport}
                        className="flex items-center gap-2 text-slate-300 hover:text-gray-900 bg-gray-100 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors">
                        <Download size={15} /><span className="hidden sm:inline">Export</span>
                      </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowImportModal(true)}
                      className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-slate-300 hover:text-gray-900 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors">
                      <Sparkles size={15} /><span className="hidden sm:inline">Import IA</span>
                    </motion.button>
                    <Button icon={<Plus size={16} />} onClick={() => setShowClientModal(true)}>Nouveau client</Button>
                  </div>
                </div>

                {/* Clients Stats (desktop) */}
                {clients.length > 0 && (
                  <div className="hidden md:grid grid-cols-3 gap-4">
                    {[
                      { title: 'Total clients', value: clients.length, sub: `${activeClients.length} avec factures`, icon: Users },
                      { title: 'CA encaissé', value: formatCurrency(totalRevenue), sub: 'toutes factures payées', icon: TrendingUp },
                      { title: 'Factures / client', value: activeClients.length > 0 ? (invoices.filter((i) => activeClients.some((c) => c.id === i.client_id)).length / activeClients.length).toFixed(1) : '0', sub: 'en moyenne', icon: FileText },
                    ].map((s, i) => (
                      <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.06, ease: EASE }}
                        className="bg-card border border-border rounded-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2.5 rounded-control bg-emerald-500/10"><s.icon size={18} className="text-emerald-400" /></div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.title}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Client Search & View Toggle */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input placeholder="Rechercher par nom, email ou ville..." value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-11 pr-12 py-2.5 rounded-control bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors" />
                    {clientSearch && (
                      <button onClick={() => setClientSearch('')}
                        className="touch-target absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
                    )}
                  </div>
                  <div className="hidden md:flex rounded-xl overflow-hidden bg-gray-100 border border-gray-200 p-1">
                    <button onClick={() => setClientViewMode('grid')}
                      className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                        clientViewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-gray-900 hover:bg-gray-200')}>
                      <Grid3X3 size={15} /><span>Grille</span>
                    </button>
                    <button onClick={() => setClientViewMode('list')}
                      className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                        clientViewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-gray-900 hover:bg-gray-200')}>
                      <List size={15} /><span>Liste</span>
                    </button>
                  </div>
                </div>

                {/* Client Content */}
                <AnimatePresence mode="wait">
                  {filteredClients.length === 0 ? (
                    <motion.div key="empty-clients" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.3, ease: EASE }} className="text-center py-16 px-4">
                      <div className="w-16 h-16 rounded-card bg-muted/40 border border-border flex items-center justify-center mx-auto mb-5">
                        <Users size={28} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {clientSearch ? 'Aucun client trouvé' : 'Votre carnet de clients vous attend'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        {clientSearch ? "Essayez d'autres mots-clés" : 'Commencez par ajouter votre premier client.'}
                      </p>
                      {!clientSearch && (
                        <Button icon={<Plus size={16} />} onClick={() => setShowClientModal(true)}>Ajouter mon premier client</Button>
                      )}
                    </motion.div>
                  ) : (
                    <>
                      {/* Mobile */}
                      <motion.div key="mobile-clients" variants={staggerContainer} initial="hidden" animate="show" className="md:hidden space-y-3">
                        {filteredClients.map((client, idx) => (
                          <MobileClientCard key={client.id} client={client} stats={getClientStats(client.id)} idx={idx}
                            onDelete={(e) => handleDeleteClient(client.id, e)} />
                        ))}
                        <motion.button variants={staggerItem} whileTap={{ scale: 0.98 }} onClick={() => setShowClientModal(true)}
                          className="touch-target w-full bg-muted/40 border border-border border-dashed rounded-card p-5 flex items-center justify-center gap-3 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-colors">
                          <div className="w-10 h-10 rounded-control bg-emerald-500/10 flex items-center justify-center"><Plus size={20} className="text-emerald-400" /></div>
                          <span className="text-sm font-medium">Ajouter un client</span>
                        </motion.button>
                      </motion.div>

                      {/* Desktop Grid */}
                      {clientViewMode === 'grid' && (
                        <motion.div key="desktop-grid-clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }} className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredClients.map((client, idx) => (
                            <DesktopClientCardGrid key={client.id} client={client} stats={getClientStats(client.id)} idx={idx}
                              onDelete={(e) => handleDeleteClient(client.id, e)} />
                          ))}
                          <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: filteredClients.length * 0.04, ease: EASE }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setShowClientModal(true)}
                            className="group h-full rounded-card border border-dashed border-border hover:border-emerald-500/30 p-6 transition-colors flex flex-col items-center justify-center gap-3 min-h-[220px]">
                            <div className="w-14 h-14 rounded-control bg-emerald-500/10 flex items-center justify-center"><Plus size={24} className="text-emerald-400" /></div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-muted-foreground group-hover:text-emerald-400 transition-colors">Ajouter un client</p>
                              <p className="text-xs text-muted-foreground mt-1">Créer une fiche client</p>
                            </div>
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Desktop List */}
                      {clientViewMode === 'list' && (
                        <motion.div key="desktop-list-clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }} className="hidden md:block bg-card border border-border rounded-card overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                                <th className="text-left px-4 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Contact</th>
                                <th className="text-center px-4 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Factures</th>
                                <th className="text-right px-4 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">CA encaissé</th>
                                <th className="px-4 py-3.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {filteredClients.map((client, idx) => (
                                <DesktopClientRow key={client.id} client={client} stats={getClientStats(client.id)} idx={idx}
                                  onDelete={(e) => handleDeleteClient(client.id, e)} />
                              ))}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </>
                  )}
                </AnimatePresence>

                {/* Client Modals */}
                <Modal open={showClientModal} onClose={closeClientModal} title="Nouveau client" size="lg">
                  <div className="hidden md:block"><ClientForm {...clientFormProps} /></div>
                </Modal>
                <BottomSheet open={showClientModal} onClose={closeClientModal} title="Nouveau client">
                  <div className="md:hidden"><ClientForm {...clientFormProps} /></div>
                </BottomSheet>
                <ImportClientsModal
                  open={showImportModal} onClose={() => setShowImportModal(false)}
                  onImport={async (companies) => {
                    await bulkCreateClients(companies.map((c) => ({
                      name: c.name, email: c.email || '', phone: c.phone || '',
                      address: c.address || '', city: c.city || '', postal_code: c.postal_code || '',
                      country: c.country || 'France', siret: c.siret || '', vat_number: c.vat_number || '', website: c.website || '',
                    } as any)));
                    toast.success(`${companies.length} client(s) importé(s)`);
                  }}
                />
              </motion.div>
            )}

            {/* ============================================================ */}
            {/*  ARTICLES TAB                                                */}
            {/* ============================================================ */}
            {activeTab === 'articles' && (
              <motion.div
                key="articles"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="space-y-6"
              >
                {/* Articles Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Catalogue produits</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Gérez vos produits et services pour vos factures
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={openCreateProduct}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
                      <Plus size={16} />Nouveau produit
                    </button>
                  </div>
                </div>

                {/* Stats pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Total', value: products.length, dot: 'bg-white' },
                    { label: 'Actifs', value: totalActive, dot: 'bg-emerald-400' },
                    { label: 'Prix moy.', value: formatPrice(avgPrice), dot: 'bg-amber-400' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full">
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                      <span className="text-xs text-slate-500">{s.label}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Search + View Toggle */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input placeholder="Rechercher par nom, référence ou description..." value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-11 pr-12 py-2.5 rounded-control bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors" />
                    {productSearch && (
                      <button onClick={() => setProductSearch('')}
                        className="touch-target absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <button onClick={() => setProductViewMode('grid')}
                      className={cn('p-2 rounded-xl transition-all',
                        productViewMode === 'grid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-100 border border-gray-200 text-slate-500 hover:text-gray-900')}>
                      <Grid3X3 size={18} />
                    </button>
                    <button onClick={() => setProductViewMode('list')}
                      className={cn('p-2 rounded-xl transition-all',
                        productViewMode === 'list' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-100 border border-gray-200 text-slate-500 hover:text-gray-900')}>
                      <List size={18} />
                    </button>
                  </div>
                </div>

                {/* Product Content */}
                {productsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center space-y-4">
                      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-slate-500">Chargement des produits...</p>
                    </div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 rounded-card bg-muted/40 border border-border flex items-center justify-center mx-auto mb-4">
                      <Package size={28} className="text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      {productSearch ? 'Aucun résultat' : 'Aucun produit'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      {productSearch ? 'Modifiez votre recherche' : 'Créez votre premier produit ou service'}
                    </p>
                    {!productSearch && (
                      <button onClick={openCreateProduct}
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-control text-sm font-semibold transition-all">
                        <Plus size={18} />Créer un produit
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Grid */}
                    <div className="hidden md:block">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={productViewMode}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: EASE }}
                          className={cn(
                            productViewMode === 'grid'
                              ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                              : 'bg-card border border-border rounded-card overflow-hidden divide-y divide-border'
                          )}
                        >
                          {filteredProducts.map((product, idx) => (
                            productViewMode === 'grid' ? (
                              <ProductCardGrid key={product.id} product={product} idx={idx}
                                onEdit={openEditProduct} onDelete={handleDeleteProduct} onDuplicate={handleDuplicateProduct} />
                            ) : (
                              <div key={product.id} className="flex items-center gap-4 p-4 group hover:bg-muted/40 transition-colors">
                                {(() => { const cat = getCatStyle(product.category); const Icon = cat.icon; return (
                                  <>
                                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                                      <Icon size={18} className={cat.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-foreground text-sm">{product.name}</h3>
                                        {!product.is_active && <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Inactif</span>}
                                      </div>
                                      {product.reference && <p className="text-xs text-muted-foreground font-mono">#{product.reference}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-lg font-bold text-foreground">{formatPrice(product.unit_price)}</p>
                                      <p className="text-xs text-muted-foreground">HT · TVA {product.vat_rate}%</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openEditProduct(product)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={14} /></button>
                                      <button onClick={() => handleDuplicateProduct(product)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-colors"><Copy size={14} /></button>
                                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                  </>
                                  ); })()}
                              </div>
                            )
                          ))}
                          {productViewMode === 'grid' && (
                            <button onClick={openCreateProduct}
                              className="bg-muted/40 border border-dashed border-border rounded-card p-4 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group min-h-[220px]">
                              <div className="w-12 h-12 rounded-control bg-muted group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                                <Plus size={20} className="text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                              </div>
                              <span className="text-sm font-semibold text-muted-foreground group-hover:text-emerald-400 transition-colors">Ajouter un produit</span>
                            </button>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      {filteredProducts.map((product, idx) => (
                        <ProductCardMobile key={product.id} product={product} idx={idx}
                          onEdit={openEditProduct} onDelete={handleDeleteProduct} onDuplicate={handleDuplicateProduct} />
                      ))}
                      <button onClick={openCreateProduct}
                        className="touch-target w-full bg-muted/40 border border-dashed border-border rounded-card p-4 flex items-center justify-center gap-2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                        <Plus size={16} className="text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">Ajouter un produit</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Product Modal */}
                <AnimatePresence>
                  {showProductModal && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
                      onClick={(e) => { if (e.target === e.currentTarget) setShowProductModal(false); }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2, ease: EASE }}
                        className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden border border-border">
                        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                          <h2 className="text-xl font-bold text-foreground">{editingProductId ? 'Modifier' : 'Nouveau produit'}</h2>
                          <button onClick={() => setShowProductModal(false)} className="touch-target p-2 rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                          {/* Category */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">Catégorie</label>
                            <div className="grid grid-cols-2 gap-2">
                              {PRODUCT_CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isSelected = productForm.category === cat.value;
                                return (
                                  <button key={cat.value} type="button" onClick={() => productSet('category', cat.value)}
                                    className={cn('flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border transition-all',
                                      isSelected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-gray-200 bg-gray-100 text-slate-400 hover:text-gray-900 hover:border-gray-300')}>
                                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cat.bg)}>
                                      <Icon size={13} className={isSelected ? cat.color : 'text-slate-500'} />
                                    </div>
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {/* Name */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Nom *</label>
                            <input required value={productForm.name} onChange={(e) => productSet('name', e.target.value)}
                              placeholder="Ex : Développement web, Formation..."
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors" />
                          </div>
                          {/* Reference */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Référence</label>
                            <div className="relative">
                              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input value={productForm.reference} onChange={(e) => productSet('reference', e.target.value)}
                                placeholder="REF-001"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors" />
                            </div>
                          </div>
                          {/* Description */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Description</label>
                            <textarea value={productForm.description} onChange={(e) => productSet('description', e.target.value)}
                              placeholder="Description du produit ou service..." rows={3}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500/30 transition-colors" />
                          </div>
                          {/* Price + Unit */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Prix HT *</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">&euro;</span>
                                <input required type="number" min="0" step="0.01" value={productForm.unit_price}
                                  onChange={(e) => productSet('unit_price', e.target.value)} placeholder="0.00"
                                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Unité *</label>
                              <select value={productForm.unit} onChange={(e) => productSet('unit', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/30 transition-colors">
                                {PRODUCT_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                              </select>
                            </div>
                          </div>
                          {/* VAT */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Taux de TVA</label>
                            <div className="flex gap-2">
                              {PRODUCT_VAT_RATES.map((rate) => (
                                <button key={rate} type="button" onClick={() => productSet('vat_rate', String(rate))}
                                  className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                                    String(rate) === productForm.vat_rate ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-gray-200 bg-gray-100 text-slate-400 hover:text-gray-900')}>
                                  {rate}%
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Active toggle */}
                          <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">Produit actif</p>
                              <p className="text-xs text-slate-500">Visible lors de la création de facture</p>
                            </div>
                            <button type="button" onClick={() => productSet('is_active', !productForm.is_active)}
                              className={cn('w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0',
                                productForm.is_active ? 'bg-emerald-500' : 'bg-slate-700')}>
                              <span className={cn('absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-200',
                                productForm.is_active ? 'left-6' : 'left-1')} />
                            </button>
                          </div>
                        </form>
                        <div className="px-6 pb-6 flex gap-3">
                          <button type="button" onClick={() => setShowProductModal(false)}
                            className="flex-1 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold text-slate-400 hover:text-gray-900 hover:border-gray-300 transition-colors">
                            Annuler
                          </button>
                          <button onClick={handleSaveProduct} disabled={savingProduct}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all disabled:opacity-60">
                            {savingProduct ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={18} />{editingProductId ? 'Enregistrer' : 'Créer'}</>}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/*  PIPELINE TAB                                                */}
            {/* ============================================================ */}
            {activeTab === 'pipeline' && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="space-y-6"
              >
                {/* Pipeline Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline CRM</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {opportunities.length} deal{opportunities.length !== 1 ? 's' : ''} · {formatCurrency(pipelineValue)} pipeline pondéré
                    </p>
                  </div>
                </div>

                {/* CRM Stats */}
                {opportunities.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Pipeline pondéré', value: formatCurrency(pipelineValue), icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-600' },
                      { label: 'Revenu gagné', value: formatCurrency(wonRevenue), icon: TrendingUp, gradient: 'from-blue-500 to-indigo-500' },
                      { label: 'Taux de conversion', value: `${winRate}%`, icon: Target, gradient: 'from-violet-500 to-purple-500' },
                      { label: 'Deals gagnés', value: wonCount, icon: Check, gradient: 'from-amber-500 to-orange-500' },
                    ].map((stat, i) => (
                      <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.06, ease: EASE }}
                        className="bg-white border border-gray-200 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white', stat.gradient)}>
                            <stat.icon size={16} />
                          </div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* CTA to full CRM */}
                <div className="relative bg-white border border-gray-200 rounded-2xl p-8 md:p-12 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                      <Target size={28} className="text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Vue complète du Pipeline CRM
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                      Accédez au Kanban interactif avec drag-and-drop, gestion des tâches, suivi des activités et détail de chaque deal.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/crm')}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20">
                      <Eye size={18} />
                      Ouvrir le Pipeline CRM
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Quick pipeline preview */}
                {opportunities.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Derniers deals</h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {opportunities.slice(0, 5).map((opp, idx) => (
                        <motion.div
                          key={opp.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05, ease: EASE }}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push('/crm')}
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Target size={16} className="text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{opp.client_name}</p>
                            <p className="text-xs text-slate-400 truncate">{opp.title}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(opp.value)}</p>
                            <p className="text-xs text-slate-400">{opp.probability}% prob.</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                    {opportunities.length > 5 && (
                      <div className="px-5 py-3 border-t border-gray-200">
                        <button onClick={() => router.push('/crm')}
                          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                          Voir les {opportunities.length} deals <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </>
  );
}
