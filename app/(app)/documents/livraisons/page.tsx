'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
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
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import SwipeableCard from '@/components/layout/SwipeableCard';

type StatusFilter = 'all' | 'draft' | 'pending' | 'partial' | 'delivered' | 'cancelled';

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const statusConfig: Record<string, { dot: string; label: string }> = {
  draft: { dot: 'bg-slate-400', label: 'Brouillon' },
  pending: { dot: 'bg-blue-400', label: 'En attente' },
  partial: { dot: 'bg-amber-400', label: 'Partiel' },
  delivered: { dot: 'bg-emerald-400', label: 'Livré' },
  cancelled: { dot: 'bg-red-400', label: 'Annulé' },
};

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'pending', label: 'En attente' },
  { value: 'partial', label: 'Partiels' },
  { value: 'delivered', label: 'Livrés' },
  { value: 'cancelled', label: 'Annulés' },
];

export default function LivraisonsPage() {
  const { invoices, fetchInvoices } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedLivraisons, setSelectedLivraisons] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const livraisons = invoices.filter((inv) => (inv.document_type || 'invoice') === 'delivery_note');

  const filteredLivraisons = livraisons.filter((livraison) => {
    const matchesSearch =
      searchQuery === '' ||
      livraison.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (livraison.client?.name || livraison.client_name_override || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      livraison.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || livraison.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: livraisons.length,
    draft: livraisons.filter((l) => l.status === 'draft').length,
    pending: livraisons.filter((l) => l.status === 'pending').length,
    partial: livraisons.filter((l) => l.status === 'partial').length,
    delivered: livraisons.filter((l) => l.status === 'delivered').length,
    cancelled: livraisons.filter((l) => l.status === 'cancelled').length,
  };

  const handleSelectAll = () => {
    if (selectedLivraisons.size === filteredLivraisons.length) {
      setSelectedLivraisons(new Set());
    } else {
      setSelectedLivraisons(new Set(filteredLivraisons.map((l) => l.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedLivraisons);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLivraisons(newSelected);
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
            <h1 className="text-3xl font-bold tracking-tight text-white">Bons de livraison</h1>
            <p className="mt-1 text-sm text-slate-500">Gérez tous vos bons de livraison</p>
          </div>
          <Link
            href="/documents/livraisons/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Nouvelle livraison
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
            { label: 'En attente', value: stats.pending, dot: 'bg-blue-400' },
            { label: 'Partiels', value: stats.partial, dot: 'bg-amber-400' },
            { label: 'Livrés', value: stats.delivered, dot: 'bg-emerald-400' },
            { label: 'Annulés', value: stats.cancelled, dot: 'bg-red-400' },
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
        {selectedLivraisons.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, duration: 0.3 }}
            className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl mb-6"
          >
            <span className="text-sm text-white font-medium">
              {selectedLivraisons.size} livraison{selectedLivraisons.size > 1 ? 's' : ''} sélectionnée{selectedLivraisons.size > 1 ? 's' : ''}
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
          {filteredLivraisons.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filteredLivraisons.map((livraison, i) => (
                <motion.div
                  key={livraison.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ease, duration: 0.4, delay: i * 0.04 }}
                >
                  <SwipeableCard onDelete={() => {}} onMarkPaid={() => {}}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-white font-semibold truncate">
                            {livraison.client?.name || livraison.client_name_override || 'Client'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {livraison.number || `LIV-${livraison.id?.slice(0, 8)}`}
                          </p>
                        </div>
                        <StatusDot status={livraison.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">
                            {(livraison.total || 0).toFixed(2)}€
                          </span>
                          <span className="text-xs text-slate-500">
                            {livraison.issue_date ? new Date(livraison.issue_date).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/invoices/${livraison.id}`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/invoices/${livraison.id}/edit`}
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
                      checked={selectedLivraisons.size === filteredLivraisons.length && filteredLivraisons.length > 0}
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
                {filteredLivraisons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <EmptyState inline />
                    </td>
                  </tr>
                ) : (
                  filteredLivraisons.map((livraison) => (
                    <tr
                      key={livraison.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedLivraisons.has(livraison.id)}
                          onChange={() => handleSelectOne(livraison.id)}
                          className="w-4 h-4 rounded border-white/10 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-white">
                          {livraison.number || `LIV-${livraison.id?.slice(0, 8)}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {livraison.client?.name || livraison.client_name_override || ''}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {livraison.issue_date ? new Date(livraison.issue_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {livraison.due_date ? new Date(livraison.due_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDot status={livraison.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold text-white">
                        {(livraison.total || 0).toFixed(2)}€
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Link
                            href={`/invoices/${livraison.id}`}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/invoices/${livraison.id}/edit`}
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
        <Truck size={24} className="text-slate-500" />
      </div>
      <p className="text-sm text-slate-400 mb-1">Aucune livraison trouvée</p>
      <p className="text-xs text-slate-600 mb-4">Créez votre premier bon de livraison pour commencer</p>
      <Link
        href="/documents/livraisons/new"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={14} />
        Nouvelle livraison
      </Link>
    </div>
  );
}
