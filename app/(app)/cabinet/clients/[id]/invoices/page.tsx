'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CabinetClientInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then((p) => setId(p.id)); }, []);

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
      const res = await fetch(`/api/cabinet/clients/${id}/data`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { invoices } = await res.json();
        setInvoices(invoices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Factures</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Aucune facture</div>
      ) : (
        <div className="space-y-1">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.number || inv.id.substring(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{fmtMoney(inv.total)}</span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  inv.status === 'paid' ? 'bg-green-100 text-green-600' : inv.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                )}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
