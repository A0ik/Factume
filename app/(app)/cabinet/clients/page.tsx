'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, Mail, CheckCircle, Clock, XCircle, Building2, X, Phone, MapPin, Hash, FileText, Search, Download } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { cn, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

interface ManualClientForm {
  company_name: string;
  siret: string;
  address: string;
  zip_code: string;
  city: string;
  phone: string;
  contact_email: string;
  contact_name: string;
  notes: string;
}

interface SirenResult {
  siren: string | null;
  siret: string | null;
  name: string | null;
  legal_form: string | null;
  address: string | null;
  naf_code: string | null;
  manager: string | null;
}

const EMPTY_FORM: ManualClientForm = {
  company_name: '', siret: '', address: '', zip_code: '', city: '',
  phone: '', contact_email: '', contact_name: '', notes: '',
};

type AddMode = 'invite' | 'manual';

export default function CabinetClientsPage() {
  const { clients, cabinet, fetchCabinet, inviteClient, loading } = useCabinetStore();
  const { profile, initialized } = useAuthStore();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState('');

  // Manual client
  const [addMode, setAddMode] = useState<AddMode>('invite');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<ManualClientForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // SIREN lookup
  const [sirenQuery, setSirenQuery] = useState('');
  const [sirenResults, setSirenResults] = useState<SirenResult[]>([]);
  const [sirenLoading, setSirenLoading] = useState(false);
  const [sirenOpen, setSirenOpen] = useState(false);

  useEffect(() => { if (initialized && profile) fetchCabinet(); }, [initialized, profile]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await inviteClient(email.trim());
      toast.success(`Invitation envoyee a ${email}`);
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };


  const handleSirenSearch = useCallback(async (query: string) => {
    setSirenQuery(query);
    if (query.trim().length < 2) {
      setSirenResults([]);
      setSirenOpen(false);
      return;
    }
    setSirenLoading(true);
    setSirenOpen(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/cabinet/siren-lookup?q=' + encodeURIComponent(query.trim()), {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      if (res.ok) {
        const data = await res.json();
        setSirenResults(data.results || []);
      }
    } catch {
      setSirenResults([]);
    } finally {
      setSirenLoading(false);
    }
  }, []);

  const handleSelectSiren = (result: SirenResult) => {
    setForm(prev => ({
      ...prev,
      company_name: result.name || prev.company_name,
      siret: result.siret || prev.siret,
      address: result.address ? result.address.split(',').slice(0, 1).join('').trim() : prev.address,
    }));
    setSirenOpen(false);
    setSirenQuery('');
    toast.success('Informations pre-remplies');
  };

  const handleFormChange = (field: keyof ManualClientForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateManual = async () => {
    if (!form.company_name.trim()) {
      toast.error('Le nom de l\'entreprise est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || 'Erreur lors de la creation');
      }

      toast.success('Client cree avec succes');
      setShowAddModal(false);
      setForm({ ...EMPTY_FORM });
      await fetchCabinet();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');
      toast.success('Client supprime');
      await fetchCabinet();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getClientName = (client: any) => {
    if (client.client_type === 'manual') return client.company_name || 'Client';
    return client.profile?.company_name || client.profile?.first_name || 'Client';
  };

  const getClientInitial = (client: any) => getClientName(client).charAt(0).toUpperCase();

  const getClientEmail = (client: any) => {
    if (client.client_type === 'manual') return client.contact_email || '';
    return client.profile?.email || '';
  };

  const filteredClients = clients.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      getClientName(c).toLowerCase().includes(q) ||
      getClientEmail(c).toLowerCase().includes(q) ||
      (c.siret || '').includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    active: { icon: CheckCircle, color: 'text-green-500', label: 'Actif' },
    pending: { icon: Clock, color: 'text-amber-500', label: 'En attente' },
    disconnected: { icon: XCircle, color: 'text-red-500', label: 'Deconnecte' },
  };

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Clients du cabinet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{clients.length} client(s)</p>
        </div>
        <button
          onClick={() => {
            if (filteredClients.length === 0) return;
            downloadXLSX(
              `cabinet-clients-${new Date().toISOString().slice(0, 10)}.xlsx`,
              [{
                name: 'Clients',
                headers: ['Nom', 'Email', 'SIRET', 'Statut', 'Ville', 'Type'],
                rows: filteredClients.map((c: any) => [
                  getClientName(c),
                  getClientEmail(c),
                  c.siret || '',
                  c.status || '',
                  c.city || '',
                  c.client_type === 'manual' ? 'Manuel' : 'Connecte',
                ]),
              }]
            );
            toast.success('Export Excel telecharge');
          }}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
          title="Exporter Excel"
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setAddMode('invite'); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-md"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, SIRET, ville..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      {/* Quick invite inline */}
      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Inviter un client</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Inviter
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Le client doit avoir un compte FACTU.ME avec cet email.</p>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10">
          <Building2 size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'Aucun client correspondant' : 'Aucun client pour le moment'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredClients.map((client: any) => {
              const isManual = client.client_type === 'manual';
              const status = statusConfig[client.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const name = getClientName(client);
              const emailVal = getClientEmail(client);

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <Link
                    href={client.status === 'active' ? `/cabinet/clients/${client.id}` : '#'}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border transition-all group',
                      client.status === 'active'
                        ? 'bg-white/60 dark:bg-slate-900/60 border-gray-200/60 dark:border-gray-700/30 hover:shadow-sm'
                        : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-70'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                      isManual
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    )}>
                      {getClientInitial(client)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</p>
                        {isManual && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                            Manuel
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {emailVal && <span className="truncate">{emailVal}</span>}
                        {isManual && client.city && (
                          <>
                            {emailVal && <span className="text-gray-300">·</span>}
                            <span className="truncate">{client.city}</span>
                          </>
                        )}
                        {isManual && client.siret && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="truncate font-mono">SIRET: {client.siret}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-1 text-xs font-medium', status.color)}>
                      <StatusIcon size={14} />
                      {status.label}
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteClient(client.id); }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-all"
                      title="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col max-w-lg"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ajouter un client</h2>
                    <p className="text-xs text-gray-400">Choisissez le mode d'ajout</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="flex border-b border-gray-100 dark:border-white/5 flex-shrink-0">
                {([
                  { key: 'manual' as AddMode, label: 'Creer une entreprise', icon: Building2 },
                  { key: 'invite' as AddMode, label: 'Inviter par email', icon: Mail },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAddMode(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px flex-1 justify-center',
                      addMode === tab.key
                        ? 'border-primary text-primary bg-white dark:bg-slate-900/50'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-5">
                {addMode === 'manual' ? (
                  <div className="space-y-4">
                    {/* SIREN Lookup */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Rechercher SIREN/SIRET
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={sirenQuery}
                          onChange={(e) => handleSirenSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Nom d'entreprise ou numero SIREN..."
                        />
                        {sirenLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                      </div>
                      {sirenOpen && sirenResults.length > 0 && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {sirenResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectSiren(r)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors"
                            >
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {r.siret && <span className="font-mono">{r.siret}</span>}
                                {r.legal_form && <span> · {r.legal_form}</span>}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Company name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Nom de l'entreprise <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.company_name}
                        onChange={(e) => handleFormChange('company_name', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Ex : Boulangerie Dupont SARL"
                      />
                    </div>

                    {/* SIRET */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">SIRET</label>
                      <div className="relative">
                        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={form.siret}
                          onChange={(e) => handleFormChange('siret', e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="123 456 789 00012"
                          maxLength={14}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Adresse</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => handleFormChange('address', e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="12 Rue de la Republique"
                        />
                      </div>
                    </div>

                    {/* CP + City */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Code postal</label>
                        <input
                          type="text"
                          value={form.zip_code}
                          onChange={(e) => handleFormChange('zip_code', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="75001"
                          maxLength={5}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Ville</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => handleFormChange('city', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Paris"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Telephone</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => handleFormChange('phone', e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="01 23 45 67 89"
                        />
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Contact</label>
                        <input
                          type="text"
                          value={form.contact_name}
                          onChange={(e) => handleFormChange('contact_name', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email contact</label>
                        <input
                          type="email"
                          value={form.contact_email}
                          onChange={(e) => handleFormChange('contact_email', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="jean@dupont.fr"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => handleFormChange('notes', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        rows={2}
                        placeholder="Informations complementaires..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Le client recevra une invitation pour se connecter a votre cabinet. Il doit avoir un compte FACTU.ME.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email du client</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="email@client.fr"
                          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={addMode === 'manual' ? handleCreateManual : handleInvite}
                  disabled={addMode === 'manual' ? (!form.company_name.trim() || saving) : (!email.trim() || inviting)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-md disabled:opacity-60 transition-all flex items-center gap-2"
                >
                  {(saving || inviting) ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {addMode === 'manual' ? 'Creer le client' : 'Envoyer l\'invitation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </CabinetGuard>
  );
}
