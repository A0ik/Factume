'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Plus, ChevronRight, Users, FileText, Euro,
  Settings, Loader2, Crown, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Cabinet } from '@/types';

export default function CabinetsPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const router = useRouter();
  const { cabinets, fetchCabinets, loading: storeLoading } = useCabinetStore();

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cabinetName, setCabinetName] = useState('');
  const [cabinetSiret, setCabinetSiret] = useState('');

  useEffect(() => {
    if (profile) loadCabinets();
  }, [profile]);

  const loadCabinets = async () => {
    setLoading(true);
    try {
      await fetchCabinets();
    } catch {
      toast.error('Erreur lors du chargement des cabinets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCabinet = (cabinet: Cabinet) => {
    localStorage.setItem('factume_active_cabinet_id', cabinet.id);
    router.push('/cabinet');
  };

  const handleCreateCabinet = async () => {
    if (!cabinetName.trim()) return;
    setCreating(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expiree. Veuillez vous reconnecter.');
        return;
      }
      const res = await fetch('/api/cabinet/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: cabinetName.trim(),
          siret: cabinetSiret.trim() || undefined,
        }),
      });
      if (res.ok) {
        const { cabinet } = await res.json();
        toast.success('Cabinet cree avec succes');
        localStorage.setItem('factume_active_cabinet_id', cabinet.id);
        router.push('/cabinet');
      } else {
        const error = await res.json().catch(() => ({ error: 'Erreur lors de la creation' }));
        toast.error(error.error || 'Erreur lors de la creation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  // Paywall: Business plan or active trial required
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Crown size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
            Multi-cabinets
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Gerez plusieurs cabinets comptables depuis un espace unique. Basculez
            d&apos;un cabinet a l&apos;autre en un clic et centralisez votre activite.
          </p>
          <Link
            href="/paywall?plan=business"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 transition-all"
          >
            <Crown size={18} />
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (loading || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Mes cabinets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cabinets.length} cabinet{cabinets.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Cabinet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {cabinets.map((cabinet, i) => {
            const color = cabinet.primary_color || '#4f46e5';
            return (
              <motion.div
                key={cabinet.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 shadow-sm hover:shadow-md transition-all"
              >
                {/* Cabinet Icon & Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 8px 20px -4px ${color}40`,
                    }}
                  >
                    {cabinet.logo_url ? (
                      <img
                        src={cabinet.logo_url}
                        alt={cabinet.name}
                        className="w-7 h-7 rounded-lg object-contain"
                      />
                    ) : (
                      <Building2 size={22} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {cabinet.name}
                    </h3>
                    {cabinet.siret && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        SIRET : {cabinet.siret}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Users size={13} />
                    <span>-- clients</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <FileText size={13} />
                    <span>-- factures</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenCabinet(cabinet)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 4px 14px -3px ${color}40`,
                    }}
                  >
                    Ouvrir
                    <ArrowRight size={14} />
                  </button>
                  <Link
                    href="/cabinet/settings"
                    onClick={() => localStorage.setItem('factume_active_cabinet_id', cabinet.id)}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                    title="Parametres"
                  >
                    <Settings size={16} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Create New Cabinet Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cabinets.length * 0.05 }}
        >
          {showCreate ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/30 dark:border-primary/20 bg-white/50 dark:bg-slate-900/50 p-5 space-y-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Nouveau cabinet
              </h3>
              <input
                type="text"
                value={cabinetName}
                onChange={(e) => setCabinetName(e.target.value)}
                placeholder="Nom du cabinet"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCabinet()}
                autoFocus
              />
              <input
                type="text"
                value={cabinetSiret}
                onChange={(e) => setCabinetSiret(e.target.value)}
                placeholder="SIRET (optionnel)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCabinet()}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateCabinet}
                  disabled={!cabinetName.trim() || creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm disabled:opacity-50 shadow-md"
                >
                  {creating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Creer
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setCabinetName('');
                    setCabinetSiret('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full h-full min-h-[200px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] flex flex-col items-center justify-center gap-3 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus size={22} className="text-gray-400 group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-semibold text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                Creer un cabinet
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
