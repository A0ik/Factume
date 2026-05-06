'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Users, TrendingUp, AlertTriangle, Plus, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CabinetData {
  cabinet: any;
  totalClients: number;
  activeClients: number;
  stats: { totalRevenue: number; totalExpenses: number; totalOverdue: number };
  clientStats: Array<{
    id: string;
    client_user_id: string;
    name: string;
    health: string;
    revenue: number;
    expenses: number;
  }>;
}

export default function CabinetPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [data, setData] = useState<CabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cabinetName, setCabinetName] = useState('');

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCabinet = async () => {
    if (!cabinetName.trim()) return;
    setCreating(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/cabinet/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: cabinetName.trim() }),
      });
      toast.success('Cabinet créé');
      setCabinetName('');
      await loadDashboard();
    } catch {
      toast.error('Erreur');
    } finally {
      setCreating(false);
    }
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Briefcase size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Cabinet Expert-Comptable</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Gérez vos clients depuis un tableau de bord unique. Disponible avec l'abonnement Business.
        </p>
        <Link href="/paywall?plan=business" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">
          Passer à Business
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!data?.cabinet) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 flex items-center justify-center mb-6">
          <Briefcase size={36} className="text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Créer votre cabinet</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Donnez un nom à votre cabinet pour commencer à inviter des clients.
        </p>
        <div className="flex items-center gap-2 w-full max-w-sm">
          <input
            type="text"
            value={cabinetName}
            onChange={(e) => setCabinetName(e.target.value)}
            placeholder="Nom du cabinet"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCabinet()}
          />
          <button
            onClick={handleCreateCabinet}
            disabled={!cabinetName.trim() || creating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase size={24} /> {data.cabinet.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.activeClients} client(s) actif(s) sur {data.totalClients}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cabinet/invitations"
            className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Inviter
          </Link>
          <Link
            href="/cabinet/settings"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <Briefcase size={16} />
          </Link>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-primary" />
            <p className="text-xs text-gray-500 font-medium">Clients</p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{data.activeClients}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-500" />
            <p className="text-xs text-gray-500 font-medium">CA total</p>
          </div>
          <p className="text-2xl font-black text-green-600">{fmtMoney(data.stats.totalRevenue)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-red-500 rotate-180" />
            <p className="text-xs text-gray-500 font-medium">Dépenses</p>
          </div>
          <p className="text-2xl font-black text-red-600">{fmtMoney(data.stats.totalExpenses)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <p className="text-xs text-gray-500 font-medium">En retard</p>
          </div>
          <p className={cn('text-2xl font-black', data.stats.totalOverdue > 0 ? 'text-amber-600' : 'text-gray-400')}>
            {data.stats.totalOverdue}
          </p>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Clients</h3>
        {data.clientStats.length === 0 ? (
          <div className="text-center py-10">
            <Users size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucun client. Invitez votre premier client !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.clientStats.map((client) => (
              <Link
                key={client.id}
                href={`/cabinet/clients/${client.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-all"
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold',
                  client.health === 'good' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                )}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{client.name}</p>
                  <p className="text-xs text-gray-400">CA: {fmtMoney(client.revenue)} · Dépenses: {fmtMoney(client.expenses)}</p>
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                  client.health === 'good' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  <Shield size={12} />
                  {client.health === 'good' ? 'Bon' : 'Attention'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
