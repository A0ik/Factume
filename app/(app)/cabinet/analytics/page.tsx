'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TrendingUp, Receipt, Users, FileText, Target, Download, AlertCircle, BarChart3, PieChart,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cn, formatCurrency, downloadCSV } from '@/lib/utils';
import { toast } from 'sonner';
import { SectionCard, KpiCard, DonutChart, EmptyState, KpiSkeleton } from '@/components/cabinet/ui';
import type { DonutSlice } from '@/components/cabinet/ui';

interface ClientStat { id: string; name: string; revenue: number; expenses: number; }
interface MissionSlice { label: string; value: number; fee: number; color: string; }
interface MonthlyBucket { key: string; label: string; total: number; count: number; }
interface DashboardAgg {
  clientStats: ClientStat[];
  stats: { totalRevenue: number; totalExpenses: number; totalOverdue: number };
  totalClients: number;
  missionBreakdown?: MissionSlice[];
  monthlyBilling?: MonthlyBucket[];
}
interface CabinetInvoice { id: string; status: string; amount_ttc: number; }
interface Mission { id: string; monthly_fee: number | null; }

const STATUS_DOT: Record<string, string> = { paid: '#10b981', sent: '#3b82f6', overdue: '#ef4444', draft: '#9ca3af', cancelled: '#6b7280' };
const STATUS_LABEL: Record<string, string> = { paid: 'Payées', sent: 'Envoyées', overdue: 'En retard', draft: 'Brouillons', cancelled: 'Annulées' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />{p.name} : {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CabinetAnalyticsPage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: dash, loading, error } = useCabinetData<DashboardAgg>('/api/cabinet/dashboard');
  const { data: missions } = useCabinetData<Mission[]>('/api/cabinet/missions');
  const { data: invoices } = useCabinetData<CabinetInvoice[]>('/api/cabinet/invoices');

  const stats = dash?.stats || { totalRevenue: 0, totalExpenses: 0, totalOverdue: 0 };
  const clients = dash?.clientStats || [];

  const topClients = useMemo(() => [...clients].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, CA: c.revenue, Dépenses: c.expenses,
  })), [clients]);

  const missionDonut = useMemo<DonutSlice[]>(() => (dash?.missionBreakdown || []).map((m) => ({ label: m.label, value: m.value, color: m.color })), [dash?.missionBreakdown]);

  const invoiceDonut = useMemo<DonutSlice[]>(() => {
    const counts = new Map<string, number>();
    for (const inv of invoices || []) counts.set(inv.status, (counts.get(inv.status) || 0) + 1);
    return Array.from(counts.entries()).map(([status, value]) => ({ label: STATUS_LABEL[status] || status, value, color: STATUS_DOT[status] || '#9ca3af' }));
  }, [invoices]);

  const monthly = dash?.monthlyBilling || [];
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.total));
  const honoMensuel = (missions || []).reduce((s, m) => s + (m.monthly_fee || 0), 0);

  const handleExport = () => {
    if (!clients.length) return;
    downloadCSV(`cabinet-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Client', 'CA', 'Dépenses', 'Solde'],
      clients.map((c) => [c.name, formatCurrency(c.revenue), formatCurrency(c.expenses), formatCurrency(c.revenue - c.expenses)]));
    toast.success('Export CSV téléchargé');
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}><BarChart3 size={40} style={{ color: primaryColor }} /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Analytics</h1>
        <p className="text-gray-500 mb-8">Tableaux de bord et indicateurs du cabinet.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}</div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5"><div className="h-48 bg-gray-100 animate-pulse rounded-xl" /></div>
      </div>
    );
  }
  if (error) return <EmptyState icon={AlertCircle} title="Erreur de chargement" description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Indicateurs du cabinet</h2>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="CA total" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} accent="#10b981" />
        <KpiCard label="Dépenses" value={formatCurrency(stats.totalExpenses)} icon={Receipt} accent="#ef4444" />
        <KpiCard label="Clients" value={String(dash?.totalClients || 0)} icon={Users} accent={primaryColor} />
        <KpiCard label="Honoraires/mois" value={formatCurrency(honoMensuel)} icon={Target} accent="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {topClients.length > 0 && (
          <SectionCard className="lg:col-span-2" title="Top clients par CA" icon={BarChart3} accent={primaryColor}>
            <div className="text-gray-400" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--border))', opacity: 0.3 }} />
                  <Bar dataKey="CA" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Répartition des missions" icon={PieChart} accent="#8b5cf6">
          {missionDonut.length > 0 ? (
            <DonutChart data={missionDonut} centerValue={String(missionDonut.reduce((s, d) => s + d.value, 0))} centerLabel="missions" />
          ) : <EmptyState icon={PieChart} title="Aucune mission" />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Factures par statut" icon={FileText} accent="#3b82f6">
          {invoiceDonut.length > 0 ? (
            <DonutChart data={invoiceDonut} centerValue={String(invoices?.length || 0)} centerLabel="factures" />
          ) : <EmptyState icon={FileText} title="Aucune facture" />}
        </SectionCard>

        {monthly.length > 0 && (
          <SectionCard title="Facturation mensuelle" icon={TrendingUp} accent={primaryColor}>
            <div className="grid grid-cols-6 gap-2">
              {monthly.map((m, i) => {
                const isCurrent = i === monthly.length - 1;
                const h = Math.round((m.total / maxMonthly) * 100);
                return (
                  <div key={m.key} className="flex flex-col items-center gap-2">
                    <div className="w-full h-24 flex items-end justify-center">
                      <div className="w-full max-w-[28px] rounded-lg" style={{ height: `${Math.max(6, h)}%`, backgroundColor: isCurrent ? primaryColor : '#d1d5db' }} title={`${formatCurrency(m.total)}`} />
                    </div>
                    <span className="text-[10px] uppercase text-gray-400 font-semibold">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>
    </motion.div>
  );
}
