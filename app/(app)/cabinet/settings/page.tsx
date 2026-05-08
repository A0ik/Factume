'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Building2, Hash, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CabinetSettingsPage() {
  const { cabinet, fetchCabinet, updateCabinet } = useCabinetStore();
  const [name, setName]   = useState('');
  const [siret, setSiret] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { fetchCabinet(); }, []);

  useEffect(() => {
    if (cabinet) {
      setName(cabinet.name || '');
      setSiret((cabinet as any).siret || '');
    }
  }, [cabinet]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Le nom du cabinet est obligatoire'); return; }
    setSaving(true);
    try {
      await updateCabinet({ name: name.trim(), siret: siret.trim() || undefined });
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Paramètres du cabinet</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Informations et configuration</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Sauvegarder
        </motion.button>
      </div>

      {/* Cabinet info */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Building2 size={15} className="text-blue-500" />
          Informations du cabinet
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Nom du cabinet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Cabinet Dubois & Associés"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><Hash size={11} />SIRET (optionnel)</span>
          </label>
          <input
            type="text"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="123 456 789 00012"
            maxLength={17}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Apparaît sur vos documents officiels</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30 p-5 space-y-3">
        <h3 className="font-bold text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" />
          Zone de danger
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Supprimer le cabinet déconnecte tous les clients et efface la configuration. Cette action est irréversible.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            Supprimer le cabinet
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-700 dark:text-red-400 font-semibold">Confirmer la suppression ?</span>
            <button
              onClick={() => { toast.error('Fonctionnalité à venir — contactez le support.'); setConfirmDelete(false); }}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Supprimer
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
