'use client';
import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Loader2, TrendingUp, AlertTriangle, Clock, CheckCircle2, Eye } from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';

interface Invoice {
  id: string;
  number?: string;
  total: number;
  status: string;
  issue_date: string;
  document_type?: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid:      { label: 'Payé',        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  overdue:   { label: 'En retard',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  draft:     { label: 'Brouillon',   className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  sent:      { label: 'Envoyé',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  pending:   { label: 'En attente',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  cancelled: { label: 'Annulé',      className: 'bg-gray-100 text-gray-500' },
};

const DOC_TYPES: Record<string, string> = {
  invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
  purchase_order: 'Commande', delivery_note: 'BL', deposit: 'Acompte',
};

export default function CabinetClientInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = (await import('@/lib/supabase')).getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/cabinet/clients/${id}/data`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setInvoices(json.invoices || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const totals = {
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter(i => i.status === 'overdue').length,
    pending: invoices.filter(i => ['sent', 'pending', 'draft'].includes(i.status)).length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Factures</h1>
        <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-500">{invoices.length}</span>
      </div>

      {/* Quick stats */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/30">
            <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 size={13} className="text-emerald-500" /><p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Encaissé</p></div>
            <p className="text-base font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30">
            <div className="flex items-center gap-1.5 mb-1"><AlertTriangle size={13} className="text-red-500" /><p className="text-xs text-red-700 dark:text-red-400 font-medium">En retard</p></div>
            <p className="text-base font-black text-red-700 dark:text-red-300">{totals.overdue}</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5 mb-1"><Clock size={13} className="text-amber-500" /><p className="text-xs text-amber-700 dark:text-amber-400 font-medium">En attente</p></div>
            <p className="text-base font-black text-amber-700 dark:text-amber-300">{totals.pending}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && invoices.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'paid', label: 'Payées' },
            { key: 'overdue', label: 'En retard' },
            { key: 'sent', label: 'Envoyées' },
            { key: 'draft', label: 'Brouillons' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                filter === f.key ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{invoices.length === 0 ? 'Aucune facture pour ce client' : 'Aucune facture dans cette catégorie'}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {filtered.map((inv) => {
              const s = STATUS_MAP[inv.status] ?? { label: inv.status, className: 'bg-gray-100 text-gray-500' };
              return (
                <div
                  key={inv.id}
                  onClick={() => window.open(`/api/cabinet/clients/${id}/invoices/${inv.id}/pdf`, '_blank')}
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{inv.number || inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {DOC_TYPES[inv.document_type ?? ''] ?? 'Facture'} · {new Date(inv.issue_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', s.className)}>{s.label}</span>
                    <Eye size={15} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
