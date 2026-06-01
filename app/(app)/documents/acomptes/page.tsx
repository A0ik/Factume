'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Percent,
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

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'cancelled' | 'refunded';

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const statusConfig: Record<string, { dot: string; label: string }> = {
  draft: { dot: 'bg-slate-400', label: 'Brouillon' },
  sent: { dot: 'bg-blue-400', label: 'Envoyé' },
  paid: { dot: 'bg-emerald-400', label: 'Payé' },
  cancelled: { dot: 'bg-red-400', label: 'Annulé' },
  refunded: { dot: 'bg-orange-400', label: 'Remboursé' },
};

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'sent', label: 'Envoyés' },
  { value: 'paid', label: 'Payés' },
  { value: 'cancelled', label: 'Annulés' },
  { value: 'refunded', label: 'Remboursés' },
];

export default function AcomptesPage() {
  const { invoices, fetchInvoices } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAcomptes, setSelectedAcomptes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const acomptes = invoices.filter((inv) => (inv.document_type || 'invoice') === 'deposit');

  const filteredAcomptes = acomptes.filter((acompte) => {
    const matchesSearch =
      searchQuery === '' ||
      acompte.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acompte.client?.name || acompte.client_name_override || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      acompte.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || acompte.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: acomptes.length,
    draft: acomptes.filter((a) => a.status === 'draft').length,
    sent: acomptes.filter((a) => a.status === 'sent').length,
    paid: acomptes.filter((a) => a.status === 'paid').length,
    cancelled: acomptes.filter((a) => a.status === 'cancelled').length,
    refunded: acomptes.filter((a) => a.status === 'refunded').length,
  };

  const handleSelectAll = () => {
    if (selectedAcomptes.size === filteredAcomptes.length) {
      setSelectedAcomptes(new Set());
    } else {
      setSelectedAcomptes(new Set(filteredAcomptes.map((a) => a.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedAcomptes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAcomptes(newSelected);
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Factures d&apos;acompte</h1>
            <p className="mt-1 text-sm text-slate-500">Gérez toutes vos factures d&apos;acompte</p>
          </div>
          <Link
            href="/documents/acomptes/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Nouvel acompte
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
            { label: 'Payés', value: stats.paid, dot: 'bg-emerald-400' },
            { label: 'Annulés', value: stats.cancelled, dot: 'bg-red-400' },
            { label: 'Remboursés', value: stats.refunded, dot: 'bg-orange-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg whitespace-nowrap shrink-0"
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-slate-400">{s.label}</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{s.value}</span>
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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
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
                    ? 'bg-white/15 text-gray-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Bulk Actions */}
        {selectedAcomptes.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, duration: 0.3 }}
            className="flex items-center justify-between px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl mb-6"
          >
            <span className="text-sm text-gray-900 dark:text-white font-medium">
              {selectedAcomptes.size} acompte{selectedAcomptes.size > 1 ? 's' : ''} sélectionné{selectedAcomptes.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
          {filteredAcomptes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filteredAcomptes.map((acompte, i) => (
                <motion.div
                  key={acompte.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ease, duration: 0.4, delay: i * 0.04 }}
                >
                  <SwipeableCard onDelete={() => {}} onMarkPaid={() => {}}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-gray-900 dark:text-white font-semibold truncate">
                            {acompte.client?.name || acompte.client_name_override || 'Client'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {acompte.number || `ACPT-${acompte.id?.slice(0, 8)}`}
                          </p>
                        </div>
                        <StatusDot status={acompte.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-900 dark:text-white font-bold">
                            {(acompte.total || 0).toFixed(2)}€
                          </span>
                          <span className="text-xs text-slate-500">
                            {acompte.issue_date ? new Date(acompte.issue_date).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/invoices/${acompte.id}`}
                            className="p-1.5 text-slate-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            href={`/invoices/${acompte.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
          className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-3.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedAcomptes.size === filteredAcomptes.length && filteredAcomptes.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
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
              <tbody className="divide-y divide-gray-200">
                {filteredAcomptes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <EmptyState inline />
                    </td>
                  </tr>
                ) : (
                  filteredAcomptes.map((acompte) => (
                    <tr
                      key={acompte.id}
                      className="hover:bg-gray-100 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedAcomptes.has(acompte.id)}
                          onChange={() => handleSelectOne(acompte.id)}
                          className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {acompte.number || `ACPT-${acompte.id?.slice(0, 8)}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {acompte.client?.name || acompte.client_name_override || ''}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {acompte.issue_date ? new Date(acompte.issue_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {acompte.due_date ? new Date(acompte.due_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDot status={acompte.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        {(acompte.total || 0).toFixed(2)}€
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Link
                            href={`/invoices/${acompte.id}`}
                            className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </Link>
                          <Link
                            href={`/invoices/${acompte.id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit size={15} />
                          </Link>
                          <button className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <Percent size={24} className="text-slate-500" />
      </div>
      <p className="text-sm text-slate-400 mb-1">Aucun acompte trouvé</p>
      <p className="text-xs text-gray-400 mb-4">Créez votre première facture d&apos;acompte pour commencer</p>
      <Link
        href="/documents/acomptes/new"
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus size={14} />
        Nouvel acompte
      </Link>
    </div>
  );
}
