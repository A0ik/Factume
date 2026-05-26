'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Search, Plus, X, ChevronDown,
  FileText, Clock, Euro, Eye, Filter, Calendar,
  CheckCircle2, AlertCircle, Crown, Printer, Download,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import PayslipPreview from '@/components/cabinet/PayslipPreview';

// ─── Types ────────────────────────────────────────────────────────────────────

type BulletinStatus = 'brouillon' | 'valide' | 'paye';

interface Bulletin {
  id: string;
  employee_id: string;
  mois: number;
  annee: number;
  status: BulletinStatus;
  salaire_brut: number;
  salaire_net: number;
  salaire_net_imposable: number;
  cotisations_patronales: number;
  cotisations_salariales: number;
  cout_employeur: number;
  heures_mensuelles: number;
  cotisations_detail: any;
  employee_data: any;
  company_data: any;
  periode_debut: string | null;
  periode_fin: string | null;
  nombre_jours_ouvres: number;
  reduction_fillon: number;
  created_at: string;
  // Display fields
  employee_name?: string;
  employee_poste?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  contract_type: string;
  salary_brut_monthly: number;
  weekly_hours: number;
  status: string;
  // Extra fields for bulletin
  birth_date: string | null;
  address: string | null;
  social_security_number: string | null;
  gender: string | null;
  nationality: string | null;
  birth_place: string | null;
  hourly_rate: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BulletinStatus, { label: string; bg: string; text: string; dot: string }> = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  valide: { label: 'Validé', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  paye: { label: 'Payé', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BulletinStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetPaiePage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();

  const [refreshing, setRefreshing] = useState(false);

  // Period selector
  const [selectedMois, setSelectedMois] = useState(() => new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState(() => new Date().getFullYear());

  // Data hooks
  const { data: apiEmployees, loading: empLoading } = useCabinetData<any[]>('/api/cabinet/employees');
  const { data: apiBulletins, loading: bulLoading, error, refresh: refreshBulletins } = useCabinetData<any[]>(
    '/api/cabinet/payroll',
    { params: { mois: String(selectedMois), annee: String(selectedAnnee) } }
  );
  const loading = empLoading || bulLoading;

  const bulletins = (apiBulletins || []) as Bulletin[];
  const employees = (apiEmployees || []) as Employee[];

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewBulletin, setPreviewBulletin] = useState<Bulletin | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Enrich bulletins with employee data
  const enrichedBulletins = useMemo(() => {
    return bulletins.map((b) => {
      const emp = employees.find((e) => e.id === b.employee_id);
      return {
        ...b,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Salarié',
        employee_poste: emp?.job_title || '',
      };
    });
  }, [bulletins, employees]);

  // KPIs
  const kpis = useMemo(() => {
    const masseBrute = enrichedBulletins.reduce((s, b) => s + (b.salaire_brut || 0), 0);
    const masseNette = enrichedBulletins.reduce((s, b) => s + (b.salaire_net || 0), 0);
    const chargesPatronales = enrichedBulletins.reduce((s, b) => s + (b.cotisations_patronales || 0), 0);
    return { masseBrute, masseNette, chargesPatronales, nbBulletins: enrichedBulletins.length };
  }, [enrichedBulletins]);

  // Employees without bulletins
  const employeesWithoutBulletin = useMemo(() => {
    const withBulletin = new Set(bulletins.map((b) => b.employee_id));
    return employees.filter((e) => e.status === 'active' && !withBulletin.has(e.id));
  }, [employees, bulletins]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      clearCabinetCache('/api/cabinet/employees');
      clearCabinetCache('/api/cabinet/payroll');
      await refreshBulletins();
    } finally {
      setRefreshing(false);
    }
  };

  // Generate missing bulletins
  const handleGenerateAll = async () => {
    if (employeesWithoutBulletin.length === 0) {
      toast.info('Tous les bulletins existent déjà');
      return;
    }

    try {
      let generated = 0;
      for (const emp of employeesWithoutBulletin) {
        // Calculate period dates
        const periodeDebut = new Date(selectedAnnee, selectedMois - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(selectedAnnee, selectedMois, 0).getDate();
        const periodeFin = new Date(selectedAnnee, selectedMois - 1, lastDay).toISOString().split('T')[0];

        await cabinetMutation('/api/cabinet/payroll', 'POST', {
          employee_id: emp.id,
          mois: selectedMois,
          annee: selectedAnnee,
          salaire_brut: emp.salary_brut_monthly || 0,
          salaire_brut_annuel: (emp.salary_brut_monthly || 0) * 12,
          heures_mensuelles: emp.weekly_hours ? (emp.weekly_hours / 35) * 151.67 : 151.67,
          taux_horaire: emp.hourly_rate || (emp.salary_brut_monthly ? emp.salary_brut_monthly / 151.67 : 0),
          statut_cadre: 'non_cadre',
          periode_debut: periodeDebut,
          periode_fin: periodeFin,
          nombre_jours_ouvres: 22,
          employee_data: {
            nom: emp.last_name,
            prenom: emp.first_name,
            nir: emp.social_security_number || '',
            dateNaissance: emp.birth_date || '',
            adresse: emp.address || '',
            poste: emp.job_title || '',
          },
          company_data: {
            raisonSociale: cabinet?.name || '',
            siret: cabinet?.siret || '',
          },
        });

        generated++;
      }

      toast.success(`${generated} bulletin(s) généré(s)`);
      clearCabinetCache('/api/cabinet/payroll');
      await refreshBulletins();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la génération');
    }
  };

  // Change status
  const handleStatusChange = async (id: string, newStatus: BulletinStatus) => {
    try {
      await cabinetMutation('/api/cabinet/payroll', 'PATCH', { id, status: newStatus });

      toast.success(`Bulletin ${newStatus === 'valide' ? 'validé' : newStatus === 'paye' ? 'marqué payé' : 'passé en brouillon'}`);
      clearCabinetCache('/api/cabinet/payroll');
      await refreshBulletins();
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Open preview
  const openPreview = (bulletin: Bulletin) => {
    setPreviewBulletin(bulletin);
    setShowPreview(true);
  };

  // Period navigation
  const prevMonth = () => {
    if (selectedMois === 1) {
      setSelectedMois(12);
      setSelectedAnnee((a) => a - 1);
    } else {
      setSelectedMois((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMois === 12) {
      setSelectedMois(1);
      setSelectedAnnee((a) => a + 1);
    } else {
      setSelectedMois((m) => m + 1);
    }
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Euro size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Gestion de la paie</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Générez des bulletins de paie conformes au Code du travail français.
            Disponible avec le plan Business.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 transition-all">
            <Crown size={18} />
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle size={36} className="text-red-400 mb-3" />
        <p className="text-gray-900 dark:text-white font-semibold mb-1">Erreur de chargement</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={handleRefresh} className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Paie</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bulletins de paie et cotisations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {employeesWithoutBulletin.length > 0 && (
            <button
              onClick={handleGenerateAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Générer ({employeesWithoutBulletin.length})</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Month/Year Selector ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="text-center">
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {MOIS_LABELS[selectedMois - 1]} {selectedAnnee}
          </p>
          <p className="text-xs text-gray-400">{enrichedBulletins.length} bulletin(s)</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Masse brute', value: formatCurrency(kpis.masseBrute), icon: Euro, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Masse nette', value: formatCurrency(kpis.masseNette), icon: CheckCircle2, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'Charges patronales', value: formatCurrency(kpis.chargesPatronales), icon: AlertCircle, color: 'from-orange-500 to-red-500', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
          { label: 'Nb bulletins', value: String(kpis.nbBulletins), icon: FileText, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
        ].map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-lg font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ─── Bulletins Table ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <FileText size={16} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Bulletins de paie ({enrichedBulletins.length})
          </h3>
          {employeesWithoutBulletin.length > 0 && (
            <span className="text-xs text-amber-500 font-medium">
              {employeesWithoutBulletin.length} salarié(s) sans bulletin
            </span>
          )}
        </div>

        {enrichedBulletins.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun bulletin pour cette période</p>
            <p className="text-sm text-gray-400 mb-5">Générez les bulletins pour les salariés actifs.</p>
            {employeesWithoutBulletin.length > 0 && (
              <button
                onClick={handleGenerateAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
              >
                <Plus size={15} />
                Générer les {employeesWithoutBulletin.length} bulletins
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Salarié</span>
              <span className="text-right">Brut</span>
              <span className="text-right">Net</span>
              <span className="text-right">Charges pat.</span>
              <span className="text-right">Coût employeur</span>
              <span className="text-center">Statut</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {enrichedBulletins.map((bulletin, i) => (
                  <motion.div
                    key={bulletin.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                          {(bulletin.employee_name || '??').split(' ').map((n) => n.charAt(0)).join('').substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{bulletin.employee_name}</p>
                          <p className="text-xs text-gray-400 truncate">{bulletin.employee_poste}</p>
                        </div>
                      </div>
                      <span className="text-right font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(bulletin.salaire_brut)}</span>
                      <span className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(bulletin.salaire_net)}</span>
                      <span className="text-right text-gray-500 text-xs">{formatCurrency(bulletin.cotisations_patronales)}</span>
                      <span className="text-right text-xs text-orange-600 dark:text-orange-400">{formatCurrency(bulletin.cout_employeur)}</span>
                      <div className="flex justify-center">
                        <select
                          value={bulletin.status}
                          onChange={(e) => handleStatusChange(bulletin.id, e.target.value as BulletinStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'text-[11px] font-semibold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer',
                            STATUS_CONFIG[bulletin.status].bg,
                            STATUS_CONFIG[bulletin.status].text,
                          )}
                        >
                          <option value="brouillon">Brouillon</option>
                          <option value="valide">Validé</option>
                          <option value="paye">Payé</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => openPreview(bulletin)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div
                      className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openPreview(bulletin)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                            {(bulletin.employee_name || '??').split(' ').map((n) => n.charAt(0)).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{bulletin.employee_name}</p>
                            <p className="text-xs text-gray-400 truncate">{bulletin.employee_poste}</p>
                          </div>
                        </div>
                        <StatusBadge status={bulletin.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Brut</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(bulletin.salaire_brut)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Net</p>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(bulletin.salaire_net)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Coût empl.</p>
                          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(bulletin.cout_employeur)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ─── Payslip Preview Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && previewBulletin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn('fixed inset-0 z-50 flex items-center justify-center', isFullScreen ? '' : 'p-4')}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowPreview(false); setIsFullScreen(false); }} />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={cn(
                'relative bg-white dark:bg-slate-900 shadow-2xl flex flex-col',
                isFullScreen ? 'w-full h-full' : 'w-full max-w-4xl max-h-[90vh] rounded-2xl'
              )}
            >
              {/* Preview header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-blue-500" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                      Bulletin - {previewBulletin.employee_name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {MOIS_LABELS[previewBulletin.mois - 1]} {previewBulletin.annee}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
                    title={isFullScreen ? 'Réduire' : 'Plein écran'}
                  >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      const emp = employees.find((e) => e.id === previewBulletin.employee_id);
                      if (emp) {
                        const periodeDebut = previewBulletin.periode_debut || new Date(previewBulletin.annee, previewBulletin.mois - 1, 1).toISOString().split('T')[0];
                        const lastDay = new Date(previewBulletin.annee, previewBulletin.mois, 0).getDate();
                        const periodeFin = previewBulletin.periode_fin || new Date(previewBulletin.annee, previewBulletin.mois - 1, lastDay).toISOString().split('T')[0];
                        const html = document.querySelector('.payslip-iframe')?.getAttribute('data-html');
                        if (html) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(decodeURIComponent(html));
                            printWindow.document.close();
                            printWindow.onload = () => setTimeout(() => printWindow.print(), 250);
                          }
                        }
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
                    title="Imprimer / PDF"
                  >
                    <Printer size={16} />
                  </button>
                  <button onClick={() => { setShowPreview(false); setIsFullScreen(false); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Payslip content */}
              <div className="flex-1 overflow-hidden">
                <PayslipPreview
                  employeeData={previewBulletin.employee_data || {}}
                  companyData={{
                    raisonSociale: cabinet?.name || previewBulletin.company_data?.raisonSociale || '',
                    siret: cabinet?.siret || previewBulletin.company_data?.siret || '',
                    adresseEntreprise: cabinet?.address || cabinet?.settings?.address || '',
                    codePostalEntreprise: cabinet?.zip_code || cabinet?.settings?.zip_code || '',
                    villeEntreprise: cabinet?.city || cabinet?.settings?.city || '',
                    urssaf: cabinet?.siret || '',
                    ...previewBulletin.company_data,
                  }}
                  salaryData={{
                    salaireBrut: previewBulletin.salaire_brut,
                    salaireNet: previewBulletin.salaire_net,
                    cotisationsPatronales: previewBulletin.cotisations_patronales,
                    cotisationsSalariales: previewBulletin.cotisations_salariales,
                    coutEmployeur: previewBulletin.cout_employeur,
                    heuresMensuelles: previewBulletin.heures_mensuelles,
                    reductionFillon: previewBulletin.reduction_fillon,
                  }}
                  period={{
                    mois: previewBulletin.mois,
                    annee: previewBulletin.annee,
                    debut: previewBulletin.periode_debut || '',
                    fin: previewBulletin.periode_fin || '',
                    joursOuvres: previewBulletin.nombre_jours_ouvres || 22,
                  }}
                  accentColor="#1D9E75"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
