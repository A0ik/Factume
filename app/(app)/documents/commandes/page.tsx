'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Search,
  Download,
  Trash2,
  Eye,
  Edit,
  Copy,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import SwipeableCard from '@/components/layout/SwipeableCard';

type StatusFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'cancelled';

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const statusConfig: Record<string, { dot: string; label: string }> = {
  draft: { dot: 'bg-slate-400', label: 'Brouillon' },
  sent: { dot: 'bg-blue-400', label: 'Envoyé' },
  accepted: { dot: 'bg-emerald-400', label: 'Accepté' },
  rejected: { dot: 'bg-red-400', label: 'Refusé' },
  cancelled: { dot: 'bg-orange-400', label: 'Annulé' },
};

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'sent', label: 'Envoyés' },
  { value: 'accepted', label: 'Acceptés' },
  { value: 'rejected', label: 'Refusés' },
  { value: 'cancelled', label: 'Annulés' },
];

export default function CommandesPage() {
  const { invoices, fetchInvoices } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCommandes, setSelectedCommandes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const commandes = invoices.filter((inv) => (inv.document_type || 'invoice') === 'purchase_order');

  const filteredCommandes = commandes.filter((commande) => {
    const matchesSearch =
      searchQuery === '' ||
      commande.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (commande.client?.name || commande.client_name_override || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      commande.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || commande.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: commandes.length,
    draft: commandes.filter((c) => c.status === 'draft').length,
    sent: commandes.filter((c) => c.status === 'sent').length,
    accepted: commandes.filter((c) => c.status === 'accepted').length,
    rejected: commandes.filter((c) => c.status === 'rejected').length,
    cancelled: commandes.filter((c) => c.status === 'cancelled').length,
  };

  const handleSelectAll = () => {
    if (selectedCommandes.size === filteredCommandes.length) {
      setSelectedCommandes(new Set());
    } else {
      setSelectedCommandes(new Set(filteredCommandes.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedCommandes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommandes(newSelected);
  };

  const StatusDot = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] || statusConfig.draft;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className="text-xs text-slate-400">{cfg.label}</span>
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Bons de commande</h1>
            <p className="mt-1 text-sm text-slate-500">Gérez tous vos bons de commande clients</p>
          </div>
          <Link
            href="/documents/commandes/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Nouvelle commande
          </Link>
        </motion.div>

        {/* Stats pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, duration: 0.5, delay: 0.05 }}
          className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
        >
          {[
            { label: 'Total', value: stats.total, dot: 'bg-slate-400' },
            { label: 'Brouillons', value: stats.draft, dot: 'bg-slate-500' },
            { label: 'Envoyés', value: stats.sent, dot: 'bg-blue-400' },
            { label: 'Acceptés', value: stats.accepted, dot: 'bg-emerald-400' },
            { label: 'Refusés', value: stats.rejected, dot: 'bg-red-400' },
            { label: 'Annulés', value: stats.cancelled, dot: 'bg-orange-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-white/5 rounded-lg whitespace-nowrap shrink-0"
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-slate-400">{s.label}</span>
              <span className="text-xs font-semibold text-white">{s.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Search + Status tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, duration: 0.5, delay: 0.1 }}
          className="space-y-4 mb-6"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Rechercher par numéro, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-white/15 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Bulk Actions */}
        {selectedCommandes.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, duration: 0.3 }}
            className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl mb-6"
          >
            <span className="text-sm text-white font-medium">
              {selectedCommandes.size} commande{selectedCommandes.size > 1 ? 's' : ''} sélectionnée{selectedCommandes.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Download size={16} />
              </button>
              <button className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Mobile Cards */}
        <div className="md:hidden">
          {filteredCommandes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filteredCommandes.map((commande, i) => (
                <motion.div
                  key={commande.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ease, duration: 0.4, delay: i * 0.04 }}
                >
                  <SwipeableCard onDelete={() => {}} onMarkPaid={() => {}}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-white font-semibold truncate">
                            {commande.client?.name || commande.client_name_override || 'Client'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {commande.number || `CMD-${commande.id?.slice(0, 8)}`}
                          </p>
                        </div>
                        <StatusDot status={commande.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">
                            {(commande.total || 0).toFixed(2)}€
                          </span>
                          <span className="text-xs text-slate-500">
                            {commande.issue_date ? new Date(commande.issue_date).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/invoices/${commande.id}`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/invoices/${commande.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, duration: 0.5, delay: 0.15 }}
          className="hidden md:block bg-slate-900 border border-white/5 rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedCommandes.size === filteredCommandes.length && filteredCommandes.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/10 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Total HT
                  </th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCommandes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <EmptyState inline />
                    </td>
                  </tr>
                ) : (
                  filteredCommandes.map((commande) => (
                    <tr
                      key={commande.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedCommandes.has(commande.id)}
                          onChange={() => handleSelectOne(commande.id)}
                          className="w-4 h-4 rounded border-white/10 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-white">
                          {commande.number || `CMD-${commande.id?.slice(0, 8)}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {commande.client?.name || commande.client_name_override || ''}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {commande.issue_date ? new Date(commande.issue_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {commande.due_date ? new Date(commande.due_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDot status={commande.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold text-white">
                        {(commande.total || 0).toFixed(2)}€
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Link
                            href={`/invoices/${commande.id}`}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/invoices/${commande.id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Edit size={15} />
                          </Link>
                          <button className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <Copy size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function EmptyState({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'py-8' : 'flex flex-col items-center justify-center py-20'}>
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
        <ShoppingBag size={24} className="text-slate-500" />
      </div>
      <p className="text-sm text-slate-400 mb-1">Aucune commande trouvée</p>
      <p className="text-xs text-slate-600 mb-4">Créez votre premier bon de commande pour commencer</p>
      <Link
        href="/documents/commandes/new"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={14} />
        Nouvelle commande
      </Link>
    </div>
  );
}
