'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Building2, Hash, Trash2, AlertTriangle, Palette, Eye, Globe, Type } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CabinetSettingsPage() {
  const router = useRouter();
  const { cabinet, fetchCabinet, updateCabinet } = useCabinetStore();
  const sub = useSubscription();
  const [name, setName]   = useState('');
  const [siret, setSiret] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [logoUrl, setLogoUrl] = useState('');
  const [whiteLabelName, setWhiteLabelName] = useState('');
  const [hideFactuBranding, setHideFactuBranding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchCabinet(); }, []);

  useEffect(() => {
    if (cabinet) {
      setName(cabinet.name || '');
      setSiret((cabinet as any).siret || '');
      setPrimaryColor(cabinet.primary_color || '#4f46e5');
      setLogoUrl(cabinet.logo_url || '');
      setWhiteLabelName(cabinet.white_label_name || '');
      setHideFactuBranding(cabinet.hide_factu_branding || false);
    }
  }, [cabinet]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Le nom du cabinet est obligatoire'); return; }
    setSaving(true);
    try {
      await updateCabinet({
        name: name.trim(),
        siret: siret.trim() || undefined,
        primary_color: primaryColor,
        logo_url: logoUrl.trim() || undefined,
        white_label_name: whiteLabelName.trim() || undefined,
        hide_factu_branding: hideFactuBranding,
      });
      toast.success('Parametres sauvegardes');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCabinet = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expiree. Veuillez vous reconnecter.');
        return;
      }
      const res = await fetch('/api/cabinet/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur lors de la suppression' }));
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
      toast.success('Cabinet supprime avec succes');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[handleDeleteCabinet] Error:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
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

      {/* White Label - only for Business plan */}
      {sub.isBusiness && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Palette size={15} className="text-violet-500" />
            Marque blanche
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Personnalisez l&apos;interface avec vos couleurs et votre marque. Remplacez &quot;Factu.me&quot; par le nom de votre cabinet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary color */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5"><Palette size={11} />Couleur principale</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
                    'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500'
                  )}
                  maxLength={7}
                />
              </div>
            </div>

            {/* White label name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5"><Type size={11} />Nom de marque</span>
              </label>
              <input
                type="text"
                value={whiteLabelName}
                onChange={(e) => setWhiteLabelName(e.target.value)}
                placeholder="Remplace &quot;Factu.me&quot; dans l'interface"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                  'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500'
                )}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><Globe size={11} />URL du logo</span>
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500'
              )}
            />
            <p className="text-xs text-gray-400 mt-1.5">Logo affiche dans la barre de navigation du cabinet</p>
          </div>

          {/* Hide Factu.me branding toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Masquer la marque Factu.me</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Remplace les references a Factu.me par votre nom de marque</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideFactuBranding}
              onClick={() => setHideFactuBranding(!hideFactuBranding)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                hideFactuBranding ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                hideFactuBranding ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-bold">Apercu</p>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {hideFactuBranding && whiteLabelName ? whiteLabelName : (whiteLabelName || 'Factu.me')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-2xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30 p-5 space-y-3">
        <h3 className="font-bold text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" />
          Zone de danger
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Supprimer le cabinet deconnecte tous les clients et efface la configuration. Cette action est irreversible.
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
          <div className="space-y-3 pt-2">
            <p className="text-sm text-red-800 dark:text-red-300 font-semibold">
              Cette action est definitive. Pour confirmer, tapez <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded text-red-900 dark:text-red-200 text-xs">SUPPRIMER</span> ci-dessous.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='Tapez "SUPPRIMER" pour confirmer'
              className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-red-300 dark:placeholder-red-700"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteCabinet}
                disabled={deleteInput !== 'SUPPRIMER' || deleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
