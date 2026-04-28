'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, TrendingUp, Calendar, BarChart3, PieChart, Download,
  ArrowLeft, Euro, Users, Clock
} from 'lucide-react';
import { useContractStore } from '@/stores/contractStore';
import {
  computePayrollProjection,
  computeExpirationTimeline,
  computeTypeDistribution,
  computeStatusDistribution,
  formatMoney,
  exportContractsToCSV,
  ExpirationTimelineEntry
} from '@/lib/services/contract-analytics-service';
import Link from 'next/link';
import { toast } from 'sonner';

const CHART_COLORS = {
  cdi: '#1D9E75',
  cdd: '#3B82F6',
  other: '#8B5CF6',
  draft: '#9CA3AF',
  pending_signature: '#F59E0B',
  signed: '#10B981',
  active: '#1D9E75',
  ended: '#6B7280',
  terminated: '#EF4444',
  cancelled: '#DC2626',
};

export default function ContractsReportsPage() {
  const { contracts, loading, fetchContracts } = useContractStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchContracts();
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const payrollProjection = computePayrollProjection(contracts);
  const expirationTimeline = computeExpirationTimeline(contracts);
  const typeDistribution = computeTypeDistribution(contracts);
  const statusDistribution = computeStatusDistribution(contracts);

  const handleExportCSV = () => {
    const csv = exportContractsToCSV(contracts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrats_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/contracts" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Analyse complète de vos contrats</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />Exporter CSV
        </button>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total contrats', value: contracts.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Contrats actifs', value: statusDistribution.active + statusDistribution.signed, icon: Users, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
          { label: 'Masse salariale/an', value: formatMoney(payrollProjection.totalCurrentYear), icon: Euro, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Expirant (90j)', value: expirationTimeline.slice(0, 3).reduce((sum, m) => sum + m.count, 0), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Payroll Projection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Projection Masse Salariale</h3>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total année en cours: <span className="font-bold text-gray-900 dark:text-white">{formatMoney(payrollProjection.totalCurrentYear)}</span></p>

          {/* Simple bar chart using CSS */}
          <div className="space-y-2">
            {payrollProjection.monthly.slice(0, 6).map((m) => {
              const maxValue = Math.max(...payrollProjection.monthly.slice(0, 6).map(x => x.amount));
              const width = maxValue > 0 ? (m.amount / maxValue) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16">{new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short' })}</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-lg transition-all duration-500"
                      style={{ width: `${Math.min(width, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 text-right">{formatMoney(m.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Type Distribution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" />Répartition par Type</h3>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(typeDistribution).map(([type, count]) => {
            const total = contracts.length || 1;
            const percentage = Math.round((count / total) * 100);
            return (
              <div key={type} className="text-center">
                <div
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${CHART_COLORS[type as keyof typeof CHART_COLORS]}20`, border: `4px solid ${CHART_COLORS[type as keyof typeof CHART_COLORS]}` }}
                >
                  <span className="text-2xl font-bold" style={{ color: CHART_COLORS[type as keyof typeof CHART_COLORS] }}>{percentage}%</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white uppercase">{type}</p>
                <p className="text-xs text-gray-500">{count} contrat(s)</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Status Distribution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Répartition par Statut</h3>

        <div className="space-y-3">
          {Object.entries(statusDistribution)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => {
              const total = contracts.length || 1;
              const width = (count / total) * 100;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${width}%`, backgroundColor: CHART_COLORS[status as keyof typeof CHART_COLORS] }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{count}</span>
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* Expiration Timeline */}
      {expirationTimeline.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Timeline des Expirations</h3>

          <div className="space-y-4">
            {expirationTimeline.slice(0, 6).map((item) => (
              <div key={item.month} className="border-b border-gray-100 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(item.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
                    {item.count} contrat(s)
                  </span>
                </div>
                <div className="space-y-1">
                  {item.contracts.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{c.employee}</span>
                      <span className="text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                  {item.contracts.length > 3 && (
                    <p className="text-xs text-gray-500">+{item.contracts.length - 3} autre(s)...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
