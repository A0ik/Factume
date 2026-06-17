'use client';
import React from 'react';
import { toast } from 'sonner';
import { use, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDateShort, getInitials, cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { Pencil, Trash2, FileText, Plus, Tag, MessageSquare, X, Globe, Copy, Check, Star, TrendingUp, Clock, Camera, ArrowLeft, Mail, Phone, MapPin, Building2, FileCheck, AlertCircle, Receipt, ShoppingBag, Truck } from 'lucide-react';
import DocPickerModal from '@/components/clients/DocPickerModal';
import type { ClientNote } from '@/types';
import MobileActionBar from '@/components/invoices/InvoiceMobileActionBar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
];

type TabKey = 'invoices' | 'expenses' | 'documents' | 'health';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'invoices', label: 'Factures', icon: Receipt },
  { key: 'expenses', label: 'Dépenses', icon: ShoppingBag },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'health', label: 'Santé', icon: Star },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, invoices, updateClient, deleteClient, loading: dataLoading } = useDataStore();
  const { user } = useAuthStore();

  // Modal toggles
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showNewDocument, setShowNewDocument] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<TabKey>('invoices');

  // Portal
  const [portalUrl, setPortalUrl] = useState('');
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Tags
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  // Notes
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Edit form
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', country: 'France', siret: '', vat_number: '',
  });

  const client = clients.find((c) => c.id === id);

  // Sync form when client loads/changes
  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        postal_code: client.postal_code ?? '',
        country: client.country ?? 'France',
        siret: client.siret ?? '',
        vat_number: client.vat_number ?? '',
      });
    }
  }, [client?.id, client?.name, client?.email, client?.phone, client?.address,
      client?.city, client?.postal_code, client?.country, client?.siret, client?.vat_number]);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      setLoadingNotes(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('client_notes')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        if (!error && data) setNotes(data);
      } catch (e) {
        console.warn('Error fetching notes:', e);
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [id]);

  // Memoized computed data
  const clientInvoices = useMemo(() => invoices.filter((inv) => inv.client_id === id), [invoices, id]);
  // PHOENIX FIX (CRISE 4) : l'onglet « Documents » dupliquait « Factures » (il
  // utilisait clientInvoices). On sépare désormais : les « Documents » regroupent
  // les devis, avoirs, acomptes, commandes et bons de livraison (tout document_type
  // ≠ invoice), « Factures » reste les factures.
  const clientDocuments = useMemo(
    () => clientInvoices.filter((inv) => (inv as any).document_type && (inv as any).document_type !== 'invoice'),
    [clientInvoices],
  );
  // PHOENIX FIX (CRISE 4) : les dépenses ne sont PAS chargées dans useDataStore —
  // l'onglet affichait un faux « Aucune depense » trompeur. On garde un tableau vide
  // et un message honnête (cf. onglet expenses) en attendant le câblage de la source.
  const clientExpenses = useMemo(() => [] as any[], [id]);
  const totalRevenue = useMemo(() => clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0), [clientInvoices]);
  const clientTags = useMemo(() => client?.tags ?? [], [client?.tags]);

  const scoreData = useMemo(() => {
    try {
      const paidInvoices = clientInvoices.filter((i) => i.status === 'paid' && i.paid_at && i.due_date);
      const avgPaymentDays = paidInvoices.length > 0
        ? paidInvoices.reduce((s, inv) => {
            const paid = new Date(inv.paid_at!).getTime();
            const due = new Date(inv.due_date!).getTime();
            return s + Math.max(0, (paid - due) / (1000 * 60 * 60 * 24));
          }, 0) / paidInvoices.length
        : null;

      const nonDraftCount = clientInvoices.filter((i) => i.status !== 'draft').length;
      const paymentRate = clientInvoices.length > 0 && nonDraftCount > 0
        ? (clientInvoices.filter((i) => i.status === 'paid').length / nonDraftCount) * 100
        : null;

      let clientScore: number | null = null;
      if (nonDraftCount > 0) {
        let score = 100;
        if (avgPaymentDays !== null) score -= Math.min(40, avgPaymentDays * 2);
        if (paymentRate !== null) score -= (100 - paymentRate) * 0.5;
        if (clientInvoices.some((i) => i.status === 'overdue')) score -= 15;
        clientScore = Math.max(0, Math.round(score));
      }

      const scoreColor = clientScore === null ? '' : clientScore >= 80 ? 'text-emerald-400' : clientScore >= 60 ? 'text-amber-400' : 'text-red-400';
      const scoreBarBg = clientScore === null ? '' : clientScore >= 80 ? 'bg-emerald-500' : clientScore >= 60 ? 'bg-amber-500' : 'bg-red-500';
      const scoreLabel = clientScore === null ? '' : clientScore >= 80 ? 'Excellent' : clientScore >= 60 ? 'Moyen' : 'Risque';

      return { clientScore, avgPaymentDays, paymentRate, scoreColor, scoreBarBg, scoreLabel };
    } catch {
      return { clientScore: null, avgPaymentDays: null, paymentRate: null, scoreColor: '', scoreBarBg: '', scoreLabel: '' };
    }
  }, [clientInvoices]);

  // Handlers
  const setField = useCallback((k: string, v: string) => setForm((f) => ({ ...f, [k]: v })), []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await updateClient(id, form); setShowEdit(false); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [id, form, updateClient]);

  const handleDelete = useCallback(async () => {
    await deleteClient(id);
    router.push('/clients');
  }, [id, deleteClient, router]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('L\'image ne doit pas dépasser 2 Mo.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image valide.'); return; }

    setUploadingLogo(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const filePath = `client-logos/${session.user.id}/${id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('client-logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(filePath);
      await updateClient(id, { logo_url: publicUrl });
      toast.success('Logo mis à jour !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du téléchargement');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }, [id, updateClient]);

  const handleAddTag = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const currentTags = client?.tags ?? [];
    if (currentTags.includes(trimmed)) { setTagInput(''); return; }
    setSavingTags(true);
    try { await updateClient(id, { tags: [...currentTags, trimmed] }); }
    catch (e: any) { toast.error(e.message); }
    finally { setSavingTags(false); setTagInput(''); }
  }, [id, client?.tags, updateClient]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    const currentTags = client?.tags ?? [];
    setSavingTags(true);
    try { await updateClient(id, { tags: currentTags.filter((t) => t !== tag) }); }
    catch (e: any) { toast.error(e.message); }
    finally { setSavingTags(false); }
  }, [id, client?.tags, updateClient]);

  const handleAddNote = useCallback(async () => {
    const content = noteInput.trim();
    if (!content || !user) return;
    setAddingNote(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('client_notes')
        .insert({ client_id: id, user_id: user.id, content })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setNotes((prev) => [data, ...prev]);
      setNoteInput('');
      toast.success('Note ajoutée');
    } catch (e: any) { toast.error(e.message || 'Erreur lors de l\'ajout'); }
    finally { setAddingNote(false); }
  }, [id, user, noteInput]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await getSupabaseClient().from('client_notes').delete().eq('id', noteId);
      if (error) throw new Error(error.message);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) { toast.error(e.message); }
  }, []);

  const handleGeneratePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Non authentifié');
      const res = await fetch('/api/client-portal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const url = `${window.location.origin}/client/${data.token}`;
      setPortalUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 3000);
    } catch (e: any) { toast.error(e.message); }
    finally { setPortalLoading(false); }
  }, [id]);

  // -------------------------------------------------------------------------
  // Loading & not-found guards (after all hooks)
  // -------------------------------------------------------------------------

  if (clients.length === 0 && dataLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement du client...</p>
      </div>
    </div>
  );

  if (!client) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={32} className="text-slate-500" />
      </div>
      <p className="text-slate-400 font-medium">Client introuvable</p>
      <p className="text-slate-500 text-sm mt-1">Ce client n'existe pas ou a été supprimé.</p>
      <Link href="/clients" className="mt-4 text-emerald-400 font-semibold text-sm hover:text-emerald-300 block transition-colors">Retour aux clients</Link>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const overdueCount = clientInvoices.filter((i) => i.status === 'overdue').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28 md:pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-slate-400 hover:text-gray-900 hover:border-gray-300 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{client.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Fiche client</p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <Button variant="secondary" size="sm" loading={portalLoading} icon={portalCopied ? <Check size={14} className="text-emerald-400" /> : <Globe size={14} />} onClick={handleGeneratePortal}>
            {portalCopied ? 'Copie !' : 'Portail'}
          </Button>
          <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Modifier
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setShowDelete(true)}>
            Supprimer
          </Button>
        </div>
      </motion.div>

      {/* Mobile back button */}
      <Link
        href="/clients"
        className="md:hidden inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} /> Retour
      </Link>

      {/* Client info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease }}
        className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
      >
        <div className="flex items-start gap-5">
          {/* Logo / avatar */}
          <div className="relative group flex-shrink-0">
            {client.logo_url ? (
              <img src={client.logo_url} alt={`Logo ${client.name}`} className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-gray-200 group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl md:text-2xl font-bold group-hover:scale-105 transition-transform duration-300">
                {getInitials(client.name)}
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-gray-100 border border-gray-300 text-slate-400 flex items-center justify-center hover:text-gray-900 hover:border-white/20 transition-colors disabled:opacity-50" title="Modifier le logo">
              {uploadingLogo ? <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Camera size={12} />}
            </button>
          </div>

          {/* Contact details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{client.name}</h2>
              {scoreData.clientScore !== null && (
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreData.clientScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : scoreData.clientScore >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {scoreData.clientScore}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300 truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{client.phone}</span>
                </div>
              )}
              {(client.address || client.city || client.postal_code) && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300 truncate">{[client.address, client.postal_code, client.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {client.siret && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{client.siret}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{clientInvoices.length}</p>
            <p className="text-xs text-slate-500">Factures</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-slate-500">CA encaissé</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : clientInvoices.filter((i) => i.status === 'sent').length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {overdueCount > 0 ? overdueCount : clientInvoices.filter((i) => i.status === 'sent').length}
            </p>
            <p className="text-xs text-slate-500">{overdueCount > 0 ? 'En retard' : 'En attente'}</p>
          </div>
        </div>
      </motion.div>

      {/* Portal URL banner */}
      <AnimatePresence>
        {portalUrl && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease }} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <Globe size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300 truncate flex-1 font-medium">{portalUrl}</p>
            <button onClick={() => { navigator.clipboard.writeText(portalUrl); setPortalCopied(true); setTimeout(() => setPortalCopied(false), 2000); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors flex-shrink-0">
              {portalCopied ? <Check size={14} /> : <Copy size={14} />}
              {portalCopied ? 'Copie' : 'Copier'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tags */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-slate-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {clientTags.length === 0 && (
            <p className="text-sm text-slate-500">Aucun tag. Ajoutez-en ci-dessous.</p>
          )}
          {clientTags.map((tag, i) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              disabled={savingTags}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors hover:opacity-80 ${TAG_COLORS[i % TAG_COLORS.length]}`}
              title="Cliquer pour supprimer"
            >
              {tag}
              <X size={12} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }}
            placeholder="Nouveau tag... (Entrée pour ajouter)"
            className="flex-1 px-4 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all text-gray-900 dark:text-white placeholder-slate-500"
          />
          <button onClick={() => handleAddTag(tagInput)} disabled={!tagInput.trim() || savingTags} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div>
        {/* Tab headers */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            {/* Invoices tab */}
            {activeTab === 'invoices' && (
              <motion.div key="invoices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease }}>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Factures</h3>
                    <button onClick={() => setShowNewDocument(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-400 transition-colors">
                      <Plus size={14} />Nouveau
                    </button>
                  </div>
                  {clientInvoices.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <Receipt size={28} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400">Aucune facture pour ce client</p>
                      <button onClick={() => setShowNewDocument(true)} className="mt-3 text-sm text-emerald-400 font-medium hover:text-emerald-300 transition-colors">Créer une facture</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {clientInvoices.map((inv, idx) => (
                        <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04, ease }}>
                          <Link href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-400 transition-colors">{inv.number}</p>
                              <p className="text-xs text-slate-500">{formatDateShort(inv.issue_date)}</p>
                            </div>
                            <div className="text-right flex-shrink-0 space-y-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                              <StatusBadge status={inv.status} />
                            </div>
                            <ArrowLeft size={14} className="text-gray-400 group-hover:text-emerald-400 rotate-180 transition-colors" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Expenses tab */}
            {activeTab === 'expenses' && (
              <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease }}>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Dépenses</h3>
                  </div>
                  {clientExpenses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <ShoppingBag size={28} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400">Le suivi des dépenses par client arrive bientôt.</p>
                      <p className="text-xs text-slate-500 mt-1">Retrouvez déjà toutes vos dépenses dans l'onglet Dépenses.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {clientExpenses.map((exp: any, idx: number) => (
                        <motion.div key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04, ease }} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.description || exp.category || 'Dépense'}</p>
                              <p className="text-xs text-slate-500">{formatDateShort(exp.date || exp.created_at)}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(exp.amount || 0)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Documents tab */}
            {activeTab === 'documents' && (
              <motion.div key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease }}>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Documents</h3>
                    <button onClick={() => setShowNewDocument(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-400 transition-colors">
                      <Plus size={14} />Nouveau
                    </button>
                  </div>
                  {clientDocuments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <FileText size={28} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400">Aucun document (devis, avoir, acompte) pour ce client</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {clientDocuments.map((inv, idx) => (
                        <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04, ease }}>
                          <Link href={`/invoices/${inv.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-400 transition-colors">{inv.number}</p>
                              <p className="text-xs text-slate-500">{formatDateShort(inv.issue_date)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                            </div>
                            <ArrowLeft size={14} className="text-gray-400 group-hover:text-emerald-400 rotate-180 transition-colors" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Health tab */}
            {activeTab === 'health' && (
              <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ ease }} className="space-y-4">
                {/* Score card */}
                {scoreData.clientScore !== null ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star size={18} className={scoreData.scoreColor} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Score de confiance</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-bold ${scoreData.scoreColor}`}>{scoreData.clientScore}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          scoreData.clientScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : scoreData.clientScore >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>{scoreData.scoreLabel}</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${scoreData.clientScore}%` }} transition={{ duration: 0.8, ease }} className={`absolute inset-y-0 left-0 rounded-full ${scoreData.scoreBarBg}`} />
                    </div>
                    <div className="flex gap-6 mt-4 text-xs text-slate-400">
                      {scoreData.avgPaymentDays !== null && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-500" />
                          Paiement moyen : <strong className="text-gray-900 dark:text-white">{Math.round(scoreData.avgPaymentDays)}j après échéance</strong>
                        </span>
                      )}
                      {scoreData.paymentRate !== null && (
                        <span className="flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-slate-500" />
                          Taux de paiement : <strong className="text-gray-900 dark:text-white">{Math.round(scoreData.paymentRate)}%</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                      <Star size={28} className="text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-400">Pas assez de données pour calculer le score</p>
                  </div>
                )}

                {/* Notes section */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-slate-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notes & suivi</h3>
                  </div>

                  <div className="space-y-3 mb-5">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Ajouter une note ou un suivi..."
                      rows={3}
                      className="w-full px-4 py-3 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all resize-none text-gray-900 dark:text-white placeholder-slate-500"
                    />
                    <Button onClick={handleAddNote} loading={addingNote} disabled={!noteInput.trim()} size="sm" icon={<Plus size={16} />}>
                      Ajouter une note
                    </Button>
                  </div>

                  {loadingNotes ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <MessageSquare size={24} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400">Aucune note pour ce client</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {notes.map((note, idx) => (
                          <motion.div key={note.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: idx * 0.04, ease }} className="group relative bg-gray-100 border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] font-medium text-slate-500">
                                {new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            <button onClick={() => handleDeleteNote(note.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all" title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* PHOENIX FIX (CRISE 4) : l'ancienne barre d'action mobile custom (fixed
          bottom-0) chevauchait la BottomTabBar globale (elle aussi bottom-0) ET
          doublonnait avec <MobileActionBar> ci-dessous (Modifier / Portail /
          Supprimer présents deux fois). On la retire — <MobileActionBar> est
          correctement positionné (bottom-[68px], au-dessus de la BottomTabBar) et
          reste le composant standard. Le retour mobile est assuré par la nav globale. */}

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client" size="lg">
        <form onSubmit={handleUpdate} className="space-y-3">
          <Input label="Nom *" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code postal" value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} />
            <Input label="Ville" value={form.city} onChange={(e) => setField('city', e.target.value)} className="col-span-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SIRET" value={form.siret} onChange={(e) => setField('siret', e.target.value)} />
            <Input label="N° TVA" value={form.vat_number} onChange={(e) => setField('vat_number', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce client">
        <p className="text-slate-400 mb-4">Êtes-vous sûr de vouloir supprimer <strong className="text-gray-900 dark:text-white">{client.name}</strong> ? Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>

      {/* New document modal */}
      <DocPickerModal open={showNewDocument} onClose={() => setShowNewDocument(false)} clientId={id} clientName={client.name} />

      {/* Mobile Floating Action Bar */}
      <MobileActionBar
        mode="custom"
        mainAction={{
          icon: Pencil,
          label: 'Modifier',
          onClick: () => setShowEdit(true),
        }}
        actions={[
          {
            icon: Globe,
            label: portalCopied ? 'Lien copié !' : 'Lien portail',
            onClick: handleGeneratePortal,
            description: 'Générer un lien d\'accès client',
          },
          {
            icon: Trash2,
            label: 'Supprimer',
            onClick: () => setShowDelete(true),
            description: 'Supprimer ce client',
            variant: 'danger',
          },
        ]}
      />
    </div>
  );
}
