'use client';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ImportClientsModal } from '@/components/ui/ImportClientsModal';
import DocPickerModal from '@/components/clients/DocPickerModal';
import BottomSheet from '@/components/layout/BottomSheet';
import {
  getInitials, downloadCSV, validateSiret, validateVatNumber, formatCurrency,
} from '@/lib/utils';
import { CompanySearch } from '@/components/ui/CompanySearch';
import {
  Plus, Search, Users, Trash2, Phone, Mail, Download,
  Building2, Globe, MapPin, FileText, TrendingUp, ChevronRight,
  Star, Sparkles, Grid3X3, List, LayoutGrid, ArrowUpRight,
  Eye, EyeOff, Filter, X, Calendar, DollarSign, Activity, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-amber-500',
  'bg-rose-500',
  'bg-pink-500',
  'bg-cyan-600',
  'bg-teal-600',
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE },
  },
};

/* ------------------------------------------------------------------ */
/*  Client creation form (shared between Modal and BottomSheet)       */
/* ------------------------------------------------------------------ */
function ClientForm({
  form,
  set,
  error,
  loading,
  onSubmit,
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
        <Input label="Telephone" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <Input label="Adresse" placeholder="123 rue de la Paix" value={form.address} onChange={(e) => set('address', e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Code postal" placeholder="75001" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
        <Input label="Ville" placeholder="Paris" value={form.city} onChange={(e) => set('city', e.target.value)} className="sm:col-span-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
        <Input label="N degre TVA intracommunautaire" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
      </div>
      <Input label="Site web" placeholder="https://exemple.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" loading={loading}>
          Creer le client
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Client Card                                                */
/* ------------------------------------------------------------------ */
function MobileClientCard({
  client,
  stats,
  idx,
  onDelete,
}: {
  client: any;
  stats: { count: number; revenue: number; pending: number };
  idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const router = useRouter();
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <>
      <Link href={`/clients/${client.id}`} className="block">
        <motion.div
          variants={staggerItem}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 cursor-pointer active:bg-slate-800/70 transition-colors"
        >
          {/* Top: avatar + name + delete */}
          <div className="flex items-start gap-3.5 mb-3">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                color,
              )}
            >
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{client.name}</p>
              {client.city && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="flex-shrink-0" />
                  {client.city}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Contact info */}
          {(client.email || client.phone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail size={11} className="flex-shrink-0" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} className="flex-shrink-0" />
                  {client.phone}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 text-xs">
              <FileText size={12} className="text-slate-400" />
              <span className="text-white font-medium">{stats.count}</span>
              <span className="text-slate-400">facture{stats.count !== 1 ? 's' : ''}</span>
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDocPickerOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <FileText size={12} />
              <span>+ Doc</span>
            </button>
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </motion.div>
      </Link>

      <DocPickerModal
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        clientId={client.id}
        clientName={client.name}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop Client Card (grid mode)                                   */
/* ------------------------------------------------------------------ */
function DesktopClientCardGrid({
  client,
  stats,
  idx,
  onDelete,
}: {
  client: any;
  stats: { count: number; revenue: number; pending: number };
  idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <>
      <Link href={`/clients/${client.id}`} className="block">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.04, ease: EASE }}
          whileHover={{ y: -2 }}
          className="group bg-slate-900 border border-white/5 rounded-2xl p-5 cursor-pointer hover:border-white/10 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start gap-3.5 mb-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                color,
              )}
            >
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate group-hover:text-emerald-400 transition-colors">
                {client.name}
              </h3>
              {client.email && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                  <Mail size={11} className="flex-shrink-0" />
                  {client.email}
                </p>
              )}
              {client.city && (
                <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                  <MapPin size={11} className="flex-shrink-0" />
                  {client.city}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(e);
              }}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2.5 rounded-xl bg-slate-800/60">
              <p className="text-white font-bold">{stats.count}</p>
              <p className="text-[10px] text-slate-400">Facture{stats.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 min-w-0">
              <p className="text-emerald-400 font-bold truncate">{formatCurrency(stats.revenue)}</p>
              <p className="text-[10px] text-slate-400">Encaisse</p>
            </div>
            {stats.pending > 0 ? (
              <div className="text-center p-2.5 rounded-xl bg-amber-500/10 min-w-0">
                <p className="text-amber-400 font-bold truncate">{formatCurrency(stats.pending)}</p>
                <p className="text-[10px] text-slate-400">En attente</p>
              </div>
            ) : (
              <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 min-w-0">
                <p className="text-emerald-400"><Check size={18} className="mx-auto" /></p>
                <p className="text-[10px] text-slate-400">A jour</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDocPickerOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <FileText size={12} />
              <span>+ Doc</span>
            </button>
            <ArrowUpRight size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
        </motion.div>
      </Link>

      <DocPickerModal
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        clientId={client.id}
        clientName={client.name}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop List Row                                                  */
/* ------------------------------------------------------------------ */
function DesktopClientRow({
  client,
  stats,
  idx,
  onDelete,
}: {
  client: any;
  stats: { count: number; revenue: number; pending: number };
  idx: number;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const router = useRouter();
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.03, ease: EASE }}
        className="hover:bg-white/[0.02] cursor-pointer transition-colors group border-b border-white/5 last:border-b-0"
        onClick={() => router.push(`/clients/${client.id}`)}
      >
        {/* Client */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                color,
              )}
            >
              {getInitials(client.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{client.name}</p>
              {client.city && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin size={9} />
                  {client.city}
                </p>
              )}
            </div>
          </div>
        </td>
        {/* Contact */}
        <td className="px-4 py-4 hidden md:table-cell">
          <div className="space-y-1">
            {client.email && (
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <Mail size={10} className="text-slate-500" />
                {client.email}
              </p>
            )}
            {client.phone && (
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <Phone size={10} className="text-slate-500" />
                {client.phone}
              </p>
            )}
          </div>
        </td>
        {/* Invoices */}
        <td className="px-4 py-4 text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
            {stats.count}
          </span>
        </td>
        {/* Revenue */}
        <td className="px-4 py-4 text-right">
          <p className="text-sm font-bold text-emerald-400 truncate">{formatCurrency(stats.revenue)}</p>
          {stats.pending > 0 && (
            <p className="text-xs text-amber-400 font-medium truncate">{formatCurrency(stats.pending)} en att.</p>
          )}
        </td>
        {/* Actions */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDocPickerOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <FileText size={12} />
              <span>+ Doc</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </div>
        </td>
      </motion.tr>

      <DocPickerModal
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        clientId={client.id}
        clientName={client.name}
      />
    </>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
export default function ClientsPage() {
  const router = useRouter();
  const { clients, invoices, createClient, bulkCreateClients, deleteClient } = useDataStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', country: 'France', siret: '', vat_number: '', website: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* ---- Memoized data ---- */
  const searchQuery = useMemo(() => search.toLowerCase(), [search]);

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          !searchQuery ||
          c.name.toLowerCase().includes(searchQuery) ||
          (c.email || '').toLowerCase().includes(searchQuery) ||
          (c.city || '').toLowerCase().includes(searchQuery),
      ),
    [clients, searchQuery],
  );

  const clientStatsMap = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; pending: number; lastInvoice: any }> = {};
    const byClient: Record<string, any[]> = {};
    invoices.forEach((inv) => {
      if (!inv.client_id) return;
      (byClient[inv.client_id] ??= []).push(inv);
    });
    Object.entries(byClient).forEach(([id, invs]) => {
      const revenue = invs.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
      const pending = invs.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
      const lastInvoice = [...invs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      map[id] = { count: invs.length, revenue, pending, lastInvoice };
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
    (id: string) => clientStatsMap[id] || { count: 0, revenue: 0, pending: 0, lastInvoice: null },
    [clientStatsMap],
  );

  /* ---- Handlers ---- */
  const handleExport = useCallback(() => {
    downloadCSV(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nom', 'Email', 'Telephone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'SIRET', 'N degre TVA'],
      clients.map((c) => [c.name, c.email, c.phone, c.address, c.postal_code, c.city, c.country, c.siret, c.vat_number]),
    );
  }, [clients]);

  const resetForm = useCallback(
    () =>
      setForm({
        name: '', email: '', phone: '', address: '', city: '',
        postal_code: '', country: 'France', siret: '', vat_number: '', website: '',
      }),
    [],
  );

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name) {
        setError('Le nom est requis');
        return;
      }
      if (form.siret && !validateSiret(form.siret)) {
        setError('SIRET invalide (14 chiffres requis)');
        return;
      }
      if (form.vat_number && !validateVatNumber(form.vat_number)) {
        setError('N degre TVA invalide (ex: FR12345678901)');
        return;
      }
      setLoading(true);
      setError('');
      try {
        await createClient(form as any);
        setShowModal(false);
        toast.success('Client cree avec succes');
        resetForm();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [form, createClient, resetForm],
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const client = clients.find((c) => c.id === id);
      toast('Supprimer ce client ?', {
        description: client?.name,
        action: {
          label: 'Supprimer',
          onClick: () =>
            deleteClient(id)
              .then(() => toast.success('Client supprime'))
              .catch((err: any) => toast.error(err.message)),
        },
      });
    },
    [clients, deleteClient],
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
    setError('');
    resetForm();
  }, [resetForm]);

  const formProps = { form, set, error, loading, onSubmit: handleCreate };

  return (
    <>
      <h1 className="sr-only">Clients - Factu.me</h1>
      <main aria-label="Gestion des clients">
        <div className="space-y-6 md:space-y-8">
          {/* ─── Header ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Clients</h2>
              <p className="text-sm text-slate-400 mt-1">
                {clients.length} client{clients.length !== 1 ? 's' : ''} enregistre{clients.length !== 1 ? 's' : ''}{' '}
                &middot; {activeClients.length} actif{activeClients.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {clients.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExport}
                  className="flex items-center gap-2 text-slate-300 hover:text-white bg-slate-800/50 border border-white/5 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-white/10 transition-colors"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Export</span>
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 bg-slate-800/50 border border-white/5 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:border-white/10 transition-colors"
              >
                <Sparkles size={15} />
                <span className="hidden sm:inline">Import IA</span>
              </motion.button>
              <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
                Nouveau client
              </Button>
            </div>
          </div>

          {/* ─── Stats (desktop only) ─── */}
          {clients.length > 0 && (
            <div className="hidden md:grid grid-cols-3 gap-4">
              {[
                {
                  title: 'Total clients',
                  value: clients.length,
                  sub: `${activeClients.length} avec factures`,
                  icon: Users,
                },
                {
                  title: 'CA encaisse',
                  value: formatCurrency(totalRevenue),
                  sub: 'toutes factures payees',
                  icon: TrendingUp,
                },
                {
                  title: 'Factures / client',
                  value:
                    activeClients.length > 0
                      ? (
                          invoices.filter((i) => activeClients.some((c) => c.id === i.client_id)).length /
                          activeClients.length
                        ).toFixed(1)
                      : '0',
                  sub: 'en moyenne',
                  icon: FileText,
                },
              ].map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06, ease: EASE }}
                  className="bg-slate-900 border border-white/5 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10">
                      <s.icon size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.title}</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ─── Search & View Toggle ─── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Rechercher par nom, email ou ville..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View toggle - desktop only */}
            <div className="hidden md:flex rounded-xl overflow-hidden bg-slate-800/50 border border-white/5 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
                )}
              >
                <Grid3X3 size={15} />
                <span>Grille</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
                )}
              >
                <List size={15} />
                <span>Liste</span>
              </button>
            </div>
          </div>

          {/* ─── Content ─── */}
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              /* ─── Empty State ─── */
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="text-center py-16 px-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center mx-auto mb-5">
                  <Users size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {search ? 'Aucun client trouve' : 'Votre carnet de clients vous attend'}
                </h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                  {search
                    ? "Essayez d'autres mots-cles ou verifiez l'orthographe"
                    : 'Commencez par ajouter votre premier client - il sera ensuite disponible en un clic lors de la creation de vos factures.'}
                </p>
                {!search && (
                  <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
                    Ajouter mon premier client
                  </Button>
                )}
              </motion.div>
            ) : (
              <>
                {/* ─── Mobile: Card List (always rendered on small screens) ─── */}
                <motion.div
                  key="mobile-cards"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="md:hidden space-y-3"
                >
                  {filtered.map((client, idx) => (
                    <MobileClientCard
                      key={client.id}
                      client={client}
                      stats={getClientStats(client.id)}
                      idx={idx}
                      onDelete={(e) => handleDelete(client.id, e)}
                    />
                  ))}

                  {/* Add card (mobile) */}
                  <motion.button
                    variants={staggerItem}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(true)}
                    className="w-full bg-slate-800/50 border border-white/5 border-dashed rounded-2xl p-5 flex items-center justify-center gap-3 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Plus size={20} className="text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium">Ajouter un client</span>
                  </motion.button>
                </motion.div>

                {/* ─── Desktop: Grid View ─── */}
                {viewMode === 'grid' && (
                  <motion.div
                    key="desktop-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {filtered.map((client, idx) => (
                      <DesktopClientCardGrid
                        key={client.id}
                        client={client}
                        stats={getClientStats(client.id)}
                        idx={idx}
                        onDelete={(e) => handleDelete(client.id, e)}
                      />
                    ))}

                    {/* Add card */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: filtered.length * 0.04, ease: EASE }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowModal(true)}
                      className="group h-full rounded-2xl border border-dashed border-white/10 hover:border-emerald-500/30 p-6 transition-colors flex flex-col items-center justify-center gap-3 min-h-[220px]"
                    >
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Plus size={24} className="text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
                          Ajouter un client
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Creer une fiche client</p>
                      </div>
                    </motion.button>
                  </motion.div>
                )}

                {/* ─── Desktop: List View ─── */}
                {viewMode === 'list' && (
                  <motion.div
                    key="desktop-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="hidden md:block bg-slate-900 border border-white/5 rounded-2xl overflow-hidden"
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="text-left px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                            Contact
                          </th>
                          <th className="text-center px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Factures
                          </th>
                          <th className="text-right px-4 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            CA encaisse
                          </th>
                          <th className="px-4 py-3.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((client, idx) => (
                          <DesktopClientRow
                            key={client.id}
                            client={client}
                            stats={getClientStats(client.id)}
                            idx={idx}
                            onDelete={(e) => handleDelete(client.id, e)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          {/* ─── Create Client: Desktop Modal ─── */}
          <Modal open={showModal} onClose={closeModal} title="Nouveau client" size="lg">
            <div className="hidden md:block">
              <ClientForm {...formProps} />
            </div>
          </Modal>

          {/* ─── Create Client: Mobile BottomSheet ─── */}
          <BottomSheet open={showModal} onClose={closeModal} title="Nouveau client">
            <div className="md:hidden">
              <ClientForm {...formProps} />
            </div>
          </BottomSheet>

          {/* ─── Import Modal ─── */}
          <ImportClientsModal
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={async (companies) => {
              await bulkCreateClients(
                companies.map((c) => ({
                  name: c.name,
                  email: c.email || '',
                  phone: c.phone || '',
                  address: c.address || '',
                  city: c.city || '',
                  postal_code: c.postal_code || '',
                  country: c.country || 'France',
                  siret: c.siret || '',
                  vat_number: c.vat_number || '',
                  website: c.website || '',
                } as any)),
              );
              toast.success(`${companies.length} client(s) importe(s)`);
            }}
          />
        </div>
      </main>
    </>
  );
}
