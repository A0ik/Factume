'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, TrendingUp, FileText, Receipt, Landmark, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';

export default function CabinetClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, []);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [clientRes, dataRes] = await Promise.all([
        fetch(`/api/cabinet/clients/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`/api/cabinet/clients/${id}/data`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      const clientInfo = clientRes.ok ? await clientRes.json() : null;
      const aggregated = dataRes.ok ? await dataRes.json() : null;

      setClientData({ ...clientInfo, ...aggregated });
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  if (loading || !clientData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  const stats = clientData.stats || {};
  const tabs = [
    { href: `/cabinet/clients/${id}/invoices`, icon: FileText, label: 'Factures', count: stats.totalInvoices },
    { href: `/cabinet/clients/${id}/expenses`, icon: Receipt, label: 'Dépenses', count: stats.totalExpensesCount },
    { href: `/cabinet/clients/${id}/documents`, icon: FileText, label: 'Documents', count: null },
    { href: `/cabinet/clients/${id}/health`, icon: Shield, label: 'Santé', count: null },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            {clientData.profile?.company_name || clientData.profile?.first_name || 'Client'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{clientData.profile?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/30">
          <p className="text-xs text-green-600 font-medium">CA</p>
          <p className="text-lg font-black text-green-700 dark:text-green-300">{fmtMoney(stats.totalRevenue || 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30">
          <p className="text-xs text-red-600 font-medium">Dépenses</p>
          <p className="text-lg font-black text-red-700 dark:text-red-300">{fmtMoney(stats.totalExpenses || 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/30">
          <p className="text-xs text-blue-600 font-medium">Solde net</p>
          <p className={cn('text-lg font-black', (stats.netBalance || 0) >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300')}>
            {fmtMoney(stats.netBalance || 0)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30">
          <p className="text-xs text-amber-600 font-medium">En retard</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.overdueInvoices || 0}</p>
        </div>
      </div>

      {/* Navigation par section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 hover:shadow-md transition-all text-center"
          >
            <tab.icon size={20} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{tab.label}</p>
            {tab.count != null && <p className="text-xs text-gray-400 mt-0.5">{tab.count}</p>}
          </Link>
        ))}
      </div>

      {/* Dernières factures */}
      {clientData.invoices?.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Dernières factures</h3>
          <div className="space-y-1">
            {clientData.invoices.slice(0, 5).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{inv.number || inv.id.substring(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fmtMoney(inv.total)}</span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                    inv.status === 'paid' ? 'bg-green-100 text-green-600' : inv.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  )}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
