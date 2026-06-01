'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, Plus, Search, FileText, CheckCircle, Clock, XCircle,
  Calendar, PenTool, Mail, Send, Loader2, SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import SwipeableCard from '@/components/layout/SwipeableCard';
import BottomSheet from '@/components/layout/BottomSheet';

type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

const statusConfig: Record<string, { color: string; dot: string; label: string; icon: any }> = {
  draft: { color: 'text-slate-400', dot: 'bg-slate-500', label: 'Brouillon', icon: FileText },
  sent: { color: 'text-blue-400', dot: 'bg-blue-500', label: 'Envoyé', icon: Send },
  accepted: { color: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Accepté', icon: CheckCircle },
  rejected: { color: 'text-red-400', dot: 'bg-red-500', label: 'Refusé', icon: XCircle },
  expired: { color: 'text-orange-400', dot: 'bg-orange-500', label: 'Expiré', icon: Clock },
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function DevisPage() {
  const router = useRouter();
  const { invoices, fetchInvoices, clients } = useDataStore();
  const { session } = useAuthStore();
  const sub = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDevis, setSelectedDevis] = useState<Set<string>>(new Set());
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const devis = invoices.filter((inv) => (inv.document_type || 'invoice') === 'quote');
  const filteredDevis = devis.filter((devi) => {
    const matchesSearch = searchQuery === '' ||
      devi.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (devi.client?.name || devi.client_name_override || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || devi.status === statusFilter);
  });

  const stats = {
    total: devis.length,
    accepted: devis.filter((d) => d.status === 'accepted').length,
    sent: devis.filter((d) => d.status === 'sent').length,
    expired: devis.filter((d) => d.status === 'expired').length,
    totalAmount: devis.reduce((sum, d) => sum + (d.total || 0), 0),
  };

  const handleSendEmail = (quote: any) => {
    setSelectedQuote(quote);
    setEmailAddress(quote.client?.email || '');
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!selectedQuote || !emailAddress.trim()) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: selectedQuote.id, email: emailAddress.trim(), profile: null }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Devis envoyé à ${emailAddress.trim()}`);
      setEmailModalOpen(false);
      setSelectedQuote(null);
      fetchInvoices();
    } catch { toast.error('Erreur'); } finally { setSendingEmail(false); }
  };

  const handleRequestSignature = async (quote: any) => {
    if (sub.isFree) { router.push('/paywall?plan=solo'); return; }
    setSelectedQuote(quote);
    setEmailAddress(quote.client?.email || '');
    setSignModalOpen(true);
  };

  const confirmRequestSignature = async () => {
    if (!selectedQuote || !session || !emailAddress.trim()) return;
    setSigning(true);
    try {
      const res = await fetch('/api/quote-signing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ quoteId: selectedQuote.id, clientEmail: emailAddress.trim(), clientName: selectedQuote.client?.name || selectedQuote.client_name_override || 'Client' }),
      });
      const data = await res.json();
      if (!res.ok) { if (data.retryable) toast.warning(data.error); else throw new Error(data.error); }
      else toast.success(data.alreadyExists ? 'Signature déjà en cours' : 'Demande envoyée');
      setSignModalOpen(false);
      setSelectedQuote(null);
      setEmailAddress('');
      fetchInvoices();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); } finally { setSigning(false); }
  };

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tout', count: stats.total },
    { key: 'accepted', label: 'Acceptés', count: stats.accepted },
    { key: 'sent', label: 'Envoyés', count: stats.sent },
    ...(stats.expired > 0 ? [{ key: 'expired' as StatusFilter, label: 'Expirés', count: stats.expired }] : []),
  ];

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Devis</h1>
          <Link href="/documents/devis/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors active:scale-95">
            <Plus size={18} /> <span className="hidden sm:inline">Nouveau</span>
          </Link>
        </div>
        <p className="text-sm text-slate-500 mb-6">{stats.total} devis · {stats.totalAmount.toFixed(2)} €</p>
      </motion.div>

      {/* Stats pills */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
        {[
          { label: 'Acceptés', value: stats.accepted, dot: 'bg-emerald-500' },
          { label: 'Envoyés', value: stats.sent, dot: 'bg-blue-500' },
          ...(stats.expired > 0 ? [{ label: 'Expirés', value: stats.expired, dot: 'bg-orange-500' }] : []),
        ].map(({ label, value, dot }) => (
          <div key={label} className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">{value}</span>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            type="text"
            placeholder="Rechercher un devis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all"
          />
          <button onClick={() => setShowFilters(!showFilters)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${showFilters ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </motion.div>

      {/* Status tabs */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }} className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-none">
        {statusTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === key ? 'bg-white/15 text-gray-900 dark:text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-gray-100'
            }`}
          >
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${statusFilter === key ? 'bg-gray-100' : 'bg-gray-50'}`}>{count}</span>
          </button>
        ))}
      </motion.div>

      {/* List */}
      {filteredDevis.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileCheck className="text-gray-400" size={28} />
          </div>
          <p className="text-sm text-slate-400">Aucun devis</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Créez votre premier devis</p>
          <Link href="/documents/devis/new" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-gray-900 dark:text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95">
            <Plus size={16} /> Créer
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Numéro</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDevis.map((devi) => {
                  const s = statusConfig[devi.status] || statusConfig.draft;
                  return (
                    <tr key={devi.id} className="hover:bg-gray-100 transition-colors">
                      <td className="px-5 py-3"><Link href={`/invoices/${devi.id}`} className="text-sm font-semibold text-purple-400 hover:underline">{devi.number || `DEV-${devi.id?.slice(0, 8)}`}</Link></td>
                      <td className="px-5 py-3 text-sm text-slate-300">{devi.client?.name || devi.client_name_override || ''}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{devi.issue_date ? new Date(devi.issue_date).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-5 py-3"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.color}`}><div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span></td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">{(devi.total || 0).toFixed(2)}€</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/invoices/${devi.id}`} className="p-2 rounded-lg text-slate-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"><FileCheck size={16} /></Link>
                          <button onClick={() => handleSendEmail(devi)} className="p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Send size={16} /></button>
                          <button onClick={() => handleRequestSignature(devi)} className={`p-2 rounded-lg transition-colors ${sub.isFree ? 'text-slate-700' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}><PenTool size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile cards */}
          <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="md:hidden space-y-2.5">
            {filteredDevis.map((devi) => {
              const s = statusConfig[devi.status] || statusConfig.draft;
              const clientName = devi.client?.name || devi.client_name_override || 'Client inconnu';
              const amount = (devi.total || 0).toFixed(2);
              const date = devi.issue_date ? new Date(devi.issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

              return (
                <motion.div key={devi.id} variants={listItemVariants}>
                  <SwipeableCard
                    onDelete={async () => {
                      try {
                        if (!session) return;
                        const res = await fetch(`/api/invoices/${devi.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
                        if (!res.ok) throw new Error();
                        toast.success('Devis supprimé');
                        fetchInvoices();
                      } catch { toast.error('Erreur'); }
                    }}
                  >
                    <Link href={`/invoices/${devi.id}`} className="block p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{clientName}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{devi.number || `DEV-${devi.id?.slice(0, 8)}`}</p>
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">{amount} €</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {date && <span className="text-xs text-slate-500">{date}</span>}
                          <button onClick={(e) => { e.preventDefault(); handleSendEmail(devi); }} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Send size={14} /></button>
                          <button onClick={(e) => { e.preventDefault(); handleRequestSignature(devi); }} className={`p-1.5 rounded-lg transition-colors ${sub.isFree ? 'text-slate-700' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}><PenTool size={14} /></button>
                        </div>
                      </div>
                    </Link>
                  </SwipeableCard>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* Email panel */}
      <BottomSheet open={emailModalOpen} onClose={() => { setEmailModalOpen(false); setSelectedQuote(null); }} title="Envoyer par e-mail">
        {selectedQuote && (
          <>
            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Send className="text-emerald-400" size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Devis n° {selectedQuote.number || `DEV-${selectedQuote.id?.slice(0, 8)}`}</p>
                <p className="text-xs text-slate-500">{(selectedQuote.total || 0).toFixed(2)} €</p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Adresse e-mail</label>
              <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="client@exemple.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEmailModalOpen(false); setSelectedQuote(null); }} disabled={sendingEmail} className="flex-1 px-4 py-3 bg-gray-100 text-slate-300 rounded-xl font-semibold transition-colors disabled:opacity-40 hover:bg-white/15">Annuler</button>
              <button onClick={confirmSendEmail} disabled={sendingEmail || !emailAddress.trim()} className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-emerald-400">
                {sendingEmail ? <><Loader2 size={16} className="animate-spin" />Envoi...</> : <><Send size={16} />Envoyer</>}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Signature panel */}
      <BottomSheet open={signModalOpen} onClose={() => { setSignModalOpen(false); setSelectedQuote(null); setEmailAddress(''); }} title="Demander la signature">
        {selectedQuote && (
          <>
            <div className="p-3 bg-gray-50 rounded-xl mb-5">
              <p className="text-xs text-slate-500">Client</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedQuote.client?.name || selectedQuote.client_name_override || '-'}</p>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Adresse e-mail</label>
              <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="client@exemple.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all" />
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
              <p className="text-xs text-blue-300">Un email sera envoyé au client avec un lien sécurisé pour signer ce devis.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSignModalOpen(false); setSelectedQuote(null); setEmailAddress(''); }} disabled={signing} className="flex-1 px-4 py-3 bg-gray-100 text-slate-300 rounded-xl font-semibold transition-colors disabled:opacity-40 hover:bg-white/15">Annuler</button>
              <button onClick={confirmRequestSignature} disabled={signing || !emailAddress.trim()} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-blue-400">
                {signing ? <><Loader2 size={16} className="animate-spin" />Envoi...</> : <><Mail size={16} />Envoyer</>}
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
