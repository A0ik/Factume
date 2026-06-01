'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LayoutDashboard, FileText, Users, Calendar, Settings,
  Package, Receipt, Calculator, HelpCircle,
  Bell, Lock, ChevronDown,
  Moon, Sun, Search, Activity, Landmark,
  FilePlus2, FileCheck, FilePenLine, Truck, CreditCard, ScanLine,
  Shield, Plug, Briefcase, TrendingUp, Target,
  Crown, Sparkles, Rocket, Zap, ArrowUpRight,
  FileSignature, ClipboardList, UsersRound, DollarSign,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { openCommandPalette } from '@/components/ui/CommandPalette';

interface SubItem { href: string; icon: any; label: string; locked?: boolean; lockTier?: string }
interface NavSection {
  id: string;
  label: string;
  icon: any;
  items: SubItem[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const { profile, user } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const { cabinet } = useCabinetStore();
  const sub = useSubscription();
  const { theme, toggle } = useThemeStore();
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const hasCabinet = !!cabinet;
  const canAccessCabinet = (sub.isBusiness || sub.isTrialActive);
  const cabinetLocked = !canAccessCabinet;
  const cabinetItemsLocked = !canAccessCabinet || !hasCabinet;

  // Auto-expand sections based on current path
  const getInitialExpanded = useCallback(() => {
    const sections: Record<string, boolean> = {};
    if (pathname.startsWith('/documents')) sections['documents'] = true;
    if (pathname.startsWith('/clients') || pathname.startsWith('/products') || pathname.startsWith('/crm')) sections['contacts'] = true;
    if (pathname.startsWith('/expenses') || pathname.startsWith('/accounting') || pathname.startsWith('/banking') || pathname.startsWith('/data-health')) sections['finances'] = true;
    if (pathname.startsWith('/contracts')) sections['contrats'] = true;
    if (pathname.startsWith('/cabinet')) sections['cabinet'] = true;
    if (pathname.startsWith('/ocr') || pathname.startsWith('/integrations') || pathname.startsWith('/calendar')) sections['outils'] = true;
    return sections;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => getInitialExpanded());

  // Close on route change
  useEffect(() => { onClose(); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch notifications
  useEffect(() => { if (user) fetchNotifications(user.id); }, [user]);

  // Update expanded when pathname changes
  useEffect(() => {
    setExpanded(prev => ({ ...prev, ...getInitialExpanded() }));
  }, [pathname, getInitialExpanded]);

  const toggleSection = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Section definitions - same as Sidebar
  const sections: NavSection[] = [
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      items: [
        { href: '/documents/factures', icon: FilePlus2, label: 'Factures' },
        { href: '/documents/devis', icon: FileCheck, label: 'Devis' },
        { href: '/documents/avoirs', icon: FilePenLine, label: 'Avoirs' },
        { href: '/documents/commandes', icon: Receipt, label: 'Commandes' },
        { href: '/documents/livraisons', icon: Truck, label: 'Bons de livraison' },
        { href: '/documents/acomptes', icon: CreditCard, label: 'Acomptes' },
      ],
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: UsersRound,
      items: [
        { href: '/clients', icon: Users, label: 'Clients' },
        { href: '/products', icon: Package, label: 'Articles' },
        { href: '/crm', icon: Target, label: 'Pipeline CRM', locked: !sub.canUseCRM, lockTier: 'pro' },
      ],
    },
    {
      id: 'finances',
      label: 'Finances',
      icon: DollarSign,
      items: [
        { href: '/expenses', icon: Receipt, label: 'Notes de frais', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/accounting', icon: Calculator, label: 'Comptabilité', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/banking', icon: Landmark, label: 'Banque', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/data-health', icon: Shield, label: 'Santé des données', locked: !sub.effectiveIsPro, lockTier: 'pro' },
      ],
    },
    {
      id: 'contrats',
      label: 'Contrats',
      icon: ClipboardList,
      items: [
        { href: '/contracts/list/cdi', icon: FileSignature, label: 'CDI' },
        { href: '/contracts/list/cdd', icon: FileSignature, label: 'CDD' },
        { href: '/contracts/list/other', icon: FileSignature, label: 'Autres' },
        { href: '/contracts/reports', icon: ClipboardList, label: 'Rapports' },
      ],
    },
    {
      id: 'cabinet',
      label: 'Cabinet',
      icon: Briefcase,
      items: [
        { href: '/cabinet', icon: LayoutDashboard, label: 'Dashboard', locked: cabinetLocked, lockTier: 'business' },
        { href: '/cabinet/clients', icon: Users, label: 'Clients', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/facturation', icon: FilePlus2, label: 'Facturation', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/relances', icon: Bell, label: 'Relances', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/social', icon: UsersRound, label: 'Social', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/salaries', icon: Users, label: 'Salariés', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/missions', icon: FileCheck, label: 'Missions', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/juridique', icon: Shield, label: 'Juridique', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/echeances', icon: Calendar, label: 'Échéances', locked: cabinetItemsLocked, lockTier: 'business' },
        { href: '/cabinet/settings', icon: Settings, label: 'Paramètres', locked: cabinetItemsLocked, lockTier: 'business' },
      ],
    },
    {
      id: 'outils',
      label: 'Outils',
      icon: ScanLine,
      items: [
        { href: '/ocr', icon: ScanLine, label: 'Scan OCR', locked: !(sub.isBusiness || sub.isTrialActive), lockTier: 'business' },
        { href: '/integrations', icon: Plug, label: 'Connexions', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/calendar', icon: Calendar, label: 'Agenda' },
        { href: '/activity', icon: Activity, label: 'Activité', locked: !sub.effectiveIsPro, lockTier: 'pro' },
      ],
    },
  ];

  const isOpen = (id: string) => expanded[id] ?? false;

  // Sub-item component
  const SubItemRow = ({ href, icon: Icon, label, locked, lockTier }: SubItem) => {
    const active = pathname.startsWith(href);
    if (locked) {
      const isCabinetItem = href.startsWith('/cabinet/') && canAccessCabinet && !hasCabinet;
      const tooltip = isCabinetItem
        ? 'Créez d\'abord votre cabinet'
        : `Disponible avec ${lockTier === 'pro' ? 'Pro' : 'Business'}`;
      return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70" title={tooltip}>
          <Icon size={16} strokeWidth={1.8} />
          <span className="flex-1">{label}</span>
          <Lock size={12} className="text-gray-400" />
        </div>
      );
    }
    return (
      <Link href={href} onClick={onClose} className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
      )}>
        <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
        <span>{label}</span>
      </Link>
    );
  };

  // Section component
  const SectionRow = ({ section }: { section: NavSection }) => {
    const open = isOpen(section.id);
    const SectionIcon = section.icon;
    const isActive = section.items.some(item => !item.locked && pathname.startsWith(item.href));

    // Show cabinet as locked badge for non-business users
    if (section.id === 'cabinet' && !(sub.isBusiness || sub.isTrialActive)) {
      return (
        <div className="space-y-0.5">
          <button onClick={() => toggleSection(section.id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/5 transition-all">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex-shrink-0">
              <SectionIcon size={17} className="text-gray-500 dark:text-gray-400" />
            </span>
            <span className="flex-1 text-left font-semibold">{section.label}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 uppercase tracking-wide">BUSINESS</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <button onClick={() => toggleSection(section.id)} className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
        )}>
          <span className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all',
            isActive
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500',
          )}>
            <SectionIcon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
          </span>
          <span className="flex-1 text-left font-semibold">{section.label}</span>
          <span className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <ChevronDown size={16} className="text-gray-400" />
          </span>
        </button>
        {open && (
          <div className="ml-5 pl-4 border-l border-gray-100 dark:border-white/5 space-y-0.5 py-1">
            {section.items.map(item => <SubItemRow key={item.href} {...item} />)}
          </div>
        )}
      </div>
    );
  };

  // Account links
  const accountLinks = [
    { href: '/settings', icon: Settings, label: 'Paramètres' },
    { href: '/help', icon: HelpCircle, label: 'Aide' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm flex flex-col shadow-2xl border-r border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-b from-emerald-50/50 to-white dark:from-slate-950 dark:to-slate-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-100/80 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-slate-900/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" onClick={onClose} className="flex-shrink-0">
                  <Logo size="sm" variant="icon" className="hover:opacity-80 transition-opacity" />
                </Link>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                    {profile?.company_name || profile?.first_name || 'Mon compte'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                    Espace de travail
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggle}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-primary transition-all active:scale-95"
                  aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-all active:scale-95"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-emerald-100/60 dark:border-emerald-900/20 flex-shrink-0">
              <button
                onClick={() => { onClose(); openCommandPalette(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-all text-sm"
              >
                <Search size={15} className="text-primary" />
                <span className="flex-1 text-left font-medium">Rechercher...</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 font-mono">⌘K</kbd>
              </button>
            </div>

            {/* Nav content */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

              {/* Dashboard */}
              <Link href="/dashboard" onClick={onClose} className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                pathname.startsWith('/dashboard')
                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
              )}>
                <span className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                  pathname.startsWith('/dashboard')
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
                )}>
                  <LayoutDashboard size={17} strokeWidth={pathname.startsWith('/dashboard') ? 2.5 : 1.8} />
                </span>
                <span className="flex-1 font-semibold">Tableau de bord</span>
              </Link>

              {/* Collapsible sections */}
              {sections.map(section => <SectionRow key={section.id} section={section} />)}

              {/* Quick stats */}
              <div className="pt-3 pb-2">
                <div className="h-px bg-gray-100 dark:bg-white/5 mx-1 mb-3" />
                <div className="mx-1 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={12} className="text-primary" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Factures</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Payées', value: invoices.filter(i => i.status === 'paid').length, color: 'text-primary' },
                      { label: 'Attente', value: invoices.filter(i => i.status === 'sent').length, color: 'text-amber-500' },
                      { label: 'Retard', value: overdueCount, color: overdueCount > 0 ? 'text-red-500' : 'text-gray-300' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors cursor-default">
                        <p className={cn('text-lg font-black', color)}>{value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account links */}
              <div>
                <div className="h-px bg-gray-100 dark:bg-white/5 mx-1 mb-3" />
                {accountLinks.map(({ href, icon: Icon, label, badge }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link key={href} href={href} onClick={onClose} className={cn(
                      'group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100',
                    )}>
                      <span className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all',
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
                      )}>
                        <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                      </span>
                      <span className="flex-1 font-semibold">{label}</span>
                      {badge && (
                        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer CTA */}
            {sub.tier !== 'business' && (
              <div className="px-3 pb-5 pt-2 flex-shrink-0">
                <Link
                  href={sub.tier === 'free' ? '/trial' : '/paywall'}
                  className="group relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={onClose}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-emerald-600 transition-transform group-hover:scale-105" />
                  <div className="relative flex items-center gap-3 w-full">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110">
                      <Sparkles size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">
                        {sub.tier === 'free' ? 'Essai gratuit 7 jours' : sub.tier === 'trial' ? 'Essai en cours' : 'Passer au plan supérieur'}
                      </p>
                      <p className="text-[11px] text-white/80 mt-0.5">
                        {sub.tier === 'free' ? 'Accès complet · Sans engagement' : 'Plus de fonctionnalités'}
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                  </div>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
