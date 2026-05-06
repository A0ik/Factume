'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { toast } from 'sonner';

export default function CabinetSettingsPage() {
  const { cabinet, fetchCabinet, updateCabinet } = useCabinetStore();
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCabinet();
  }, []);

  useEffect(() => {
    if (cabinet) {
      setName(cabinet.name || '');
      setSiret(cabinet.siret || '');
    }
  }, [cabinet]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCabinet({ name, siret });
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Paramètres du cabinet</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-70"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Sauvegarder
        </button>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom du cabinet</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SIRET</label>
          <input
            type="text"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="123 456 789 00012"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
