'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LayoutDashboard, FileText, Users, Calendar, Settings,
  Package, Receipt, Calculator, HelpCircle,
  Bell, Building2, Crown, Sparkles, Rocket, Zap, Target, Lock, ChevronRight, ChevronDown,
  Moon, Sun, Home, Search, Activity, Landmark,
  FilePlus2, FileCheck, FilePenLine, Truck, CreditCard, ScanLine,
  BookOpen, Shield, Plug, Briefcase, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { openCommandPalette } from '@/components/ui/CommandPalette';

const TIER_ICON: Record<string, any> = { free: Zap, solo: Rocket, pro: Crown, business: Sparkles, trial: Sparkles };
const TIER_LABEL: Record<string, string> = { free: 'Gratuit', solo: 'Solo', pro: 'Pro', business: 'Business', trial: 'Essai' };

interface NavItem {
  href: string;
  icon: any;
  label: string;
  locked?: boolean;
  lockReason?: string;
  unlockTier?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const DOC_SUB_ITEMS = [
  { href: '/documents/factures',  icon: FilePlus2,   label: 'Factures' },
  { href: '/documents/devis',     icon: FileCheck,   label: 'Devis' },
  { href: '/documents/avoirs',    icon: FilePenLine,  label: 'Avoirs' },
  { href: '/documents/commandes', icon: Receipt,      label: 'Commandes' },
  { href: '/documents/livraisons',icon: Truck,        label: 'Bons de livraison' },
  { href: '/documents/acomptes',  icon: CreditCard,   label: 'Acomptes' },
];

export default function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const sub = useSubscription();
  const { theme, toggle } = useThemeStore();
  const [docsExpanded, setDocsExpanded] = useState(pathname.startsWith('/documents'));

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

  const TierIcon = TIER_ICON[sub.tier] || Zap;
  const docsActive = pathname.startsWith('/documents');
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  // Build nav items based on subscription
  const buildMainNav = (): NavItem[] => {
    const main: NavItem[] = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    ];

    main.push(
      { href: '/clients',   icon: Users,           label: 'Clients' },
      { href: '/products',  icon: Package,         label: 'Articles' },
      { href: '/calendar',  icon: Calendar,        label: 'Agenda' },
    );

    return main;
  };

  const buildToolsNav = (): NavItem[] => {
    const tools: NavItem[] = [
      { href: '/offline/workspace', icon: Building2, label: 'Workspace' },
    ];

    tools.push(
      { href: '/notifications', icon: Bell,      label: 'Notifications' },
      { href: '/blog',          icon: BookOpen,  label: 'Blog' },
      { href: '/help',          icon: HelpCircle,label: 'Aide' },
      { href: '/settings',      icon: Settings,  label: 'Paramètres' },
    );

    return tools;
  };

  const buildAdvancedNav = (): Array<{ href: string; icon: any; label: string; enabled: boolean; lockReason?: string; unlockTier?: string; badge?: string }> => {
    const items: Array<{ href: string; icon: any; label: string; enabled: boolean; lockReason?: string; unlockTier?: string; badge?: string }> = [];

    // Pipeline CRM - Pro/Business only
    items.push({
      href: '/crm',
      icon: Target,
      label: 'Pipeline CRM',
      enabled: sub.canUseCRM,
      lockReason: sub.canUseCRM ? undefined : 'Disponible avec Pro',
      unlockTier: 'pro',
      badge: sub.canUseCRM ? undefined : 'PRO',
    });

    items.push(
      {
        href: '/expenses',
        icon: Receipt,
        label: 'Notes de frais',
        enabled: sub.effectiveIsPro,
        lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro',
        unlockTier: 'pro',
        badge: sub.effectiveIsPro ? undefined : 'Disponible',
      },
      {
        href: '/ocr',
        icon: ScanLine,
        label: 'Scan OCR',
        enabled: sub.isBusiness || sub.isTrialActive,
        lockReason: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Disponible avec Business',
        unlockTier: 'business',
        badge: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Business',
      },
      { href: '/integrations', icon: Plug,      label: 'Connexions',        enabled: sub.effectiveIsPro, lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro', unlockTier: 'pro', badge: sub.effectiveIsPro ? undefined : 'PRO' },
      { href: '/data-health',  icon: Shield,    label: 'Santé des données', enabled: sub.effectiveIsPro, lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro', unlockTier: 'pro', badge: sub.effectiveIsPro ? undefined : 'PRO' },
      { href: '/accounting',   icon: Calculator,label: 'Comptabilité',      enabled: sub.effectiveIsPro, lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro', unlockTier: 'pro', badge: sub.effectiveIsPro ? undefined : 'PRO' },
      { href: '/activity',     icon: Activity,  label: 'Activité',          enabled: sub.effectiveIsPro, lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro', unlockTier: 'pro', badge: sub.effectiveIsPro ? undefined : 'PRO' },
      { href: '/banking',      icon: Landmark,  label: 'Banque',            enabled: sub.effectiveIsPro, lockReason: sub.effectiveIsPro ? undefined : 'Disponible avec Pro', unlockTier: 'pro', badge: sub.effectiveIsPro ? undefined : 'PRO' },
      { href: '/cabinet',      icon: Briefcase, label: 'Cabinet',           enabled: sub.isBusiness || sub.isTrialActive, lockReason: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Disponible avec Business', unlockTier: 'business', badge: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Business' },
    );

    return items;
  };

  const NAV_MAIN = buildMainNav();
  const NAV_TOOLS = buildToolsNav();
  const NAV_ADVANCED = buildAdvancedNav();

  const NavItem = ({ href, icon: Icon, label, locked, lockReason, unlockTier }: NavItem) => {
    const active = pathname.startsWith(href);

    if (locked) {
      return (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70"
          title={lockReason}
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800/80 backdrop-blur-sm">
            <Icon size={17} strokeWidth={2} />
          </span>
          <span className="flex-1 font-medium">{label}</span>
          <Lock size={13} />
        </div>
      );
    }

    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200',
          active
            ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
            : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400 group-hover:scale-110',
        )}>
          <Icon size={17} strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="flex-1 font-semibold">{label}</span>
        {href === '/notifications' && unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {active && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 rounded-full bg-primary shadow-sm"
          />
        )}
      </Link>
    );
  };

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
            {/* Header - Logo and profile */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-100/80 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" onClick={onClose} className="flex-shrink-0">
                  <Logo size="sm" variant="icon" className="hover:opacity-80 transition-opacity" />
                </Link>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                    {profile?.company_name || profile?.first_name || 'Mon compte'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TierIcon size={10} className="text-primary" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{TIER_LABEL[sub.tier] || 'Gratuit'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggle}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-all hover:scale-105 active:scale-95"
                  aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all hover:scale-105 active:scale-95"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="px-3 py-2 border-b border-emerald-100/60 dark:border-emerald-900/20">
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
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {/* Main nav */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Home size={12} className="text-primary" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accueil</p>
                </div>
                {/* Dashboard first */}
                {NAV_MAIN.length > 0 && <NavItem key={NAV_MAIN[0].href} {...NAV_MAIN[0]} />}

                {/* Expandable Documents */}
                <div className="space-y-0.5">
                  <div className="flex items-stretch gap-0">
                    <Link
                      href="/documents"
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 rounded-l-2xl text-sm font-medium transition-all duration-200 flex-1',
                        docsActive
                          ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                        docsActive
                          ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                      )}>
                        <FileText size={17} strokeWidth={docsActive ? 2.5 : 2} />
                      </span>
                      <span className="flex-1 font-semibold">Documents</span>
                      {overdueCount > 0 && (
                        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                          {overdueCount > 9 ? '9+' : overdueCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => setDocsExpanded(!docsExpanded)}
                      className={cn(
                        'flex items-center justify-center w-12 rounded-r-2xl transition-all duration-200 active:scale-95',
                        docsActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5',
                      )}
                      aria-label={docsExpanded ? 'Réduire' : 'Développer'}
                    >
                      {docsExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>

                  {/* Sub-items */}
                  {docsExpanded && (
                    <div className="ml-6 pl-4 border-l border-gray-100 dark:border-white/5 space-y-0.5 py-1">
                      {DOC_SUB_ITEMS.map(({ href, icon: SubIcon, label }) => {
                        const subActive = pathname.startsWith(href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                              subActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
                            )}
                          >
                            <SubIcon size={16} strokeWidth={subActive ? 2.5 : 1.8} />
                            <span>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rest of core nav */}
                {NAV_MAIN.slice(1).map((item) => <NavItem key={item.href} {...item} />)}
              </div>

              {/* Quick stats */}
              <div className="px-1">
                <div className="px-3 py-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={12} className="text-primary" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aperçu</p>
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

              {/* Premium features - organized by category like desktop */}
              {NAV_ADVANCED.some(item => item.enabled || item.lockReason) && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                      <Sparkles size={12} className="text-amber-500" strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Premium</p>
                  </div>

                  {/* Gestion & Comptabilité */}
                  {NAV_ADVANCED.some(i => i.href === '/expenses' || i.href === '/accounting' || i.href === '/activity') && (
                    <>
                      <div className="px-4 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gestion & Comptabilité</p>
                      </div>
                      <div className="space-y-0.5 mb-2">
                        {NAV_ADVANCED.filter(i => i.href === '/expenses' || i.href === '/accounting' || i.href === '/activity').map(({ href, icon: Icon, label, enabled, lockReason, unlockTier, badge }) => {
                          const isActive = pathname.startsWith(href);
                          return enabled ? (
                            <Link key={href} href={href} onClick={onClose}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
                              )}
                            >
                              <span className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                              )}>
                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                              </span>
                              <span className="flex-1 font-semibold">{label}</span>
                            </Link>
                          ) : (
                            <div key={href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70" title={lockReason}>
                              <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800/80 backdrop-blur-sm">
                                <Icon size={17} strokeWidth={2} />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {badge ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 uppercase tracking-wide">{badge}</span>
                              ) : (
                                <Lock size={13} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* CRM & Ventes */}
                  {NAV_ADVANCED.some(i => i.href === '/crm') && (
                    <>
                      <div className="px-4 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">CRM & Ventes</p>
                      </div>
                      <div className="space-y-0.5 mb-2">
                        {NAV_ADVANCED.filter(i => i.href === '/crm').map(({ href, icon: Icon, label, enabled, lockReason, badge }) => {
                          const isActive = pathname.startsWith(href);
                          return enabled ? (
                            <Link key={href} href={href} onClick={onClose}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
                              )}
                            >
                              <span className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                              )}>
                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                              </span>
                              <span className="flex-1 font-semibold">{label}</span>
                            </Link>
                          ) : (
                            <div key={href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70" title={lockReason}>
                              <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800/80 backdrop-blur-sm">
                                <Icon size={17} strokeWidth={2} />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {badge ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 uppercase tracking-wide">{badge}</span>
                              ) : (
                                <Lock size={13} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Automatisation & Connexions */}
                  {NAV_ADVANCED.some(i => i.href === '/ocr' || i.href === '/integrations' || i.href === '/banking' || i.href === '/data-health') && (
                    <>
                      <div className="px-4 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Automatisation & Connexions</p>
                      </div>
                      <div className="space-y-0.5 mb-2">
                        {NAV_ADVANCED.filter(i => i.href === '/ocr' || i.href === '/integrations' || i.href === '/banking' || i.href === '/data-health').map(({ href, icon: Icon, label, enabled, lockReason, unlockTier, badge }) => {
                          const isActive = pathname.startsWith(href);
                          return enabled ? (
                            <Link key={href} href={href} onClick={onClose}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
                              )}
                            >
                              <span className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                              )}>
                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                              </span>
                              <span className="flex-1 font-semibold">{label}</span>
                            </Link>
                          ) : (
                            <div key={href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70" title={lockReason}>
                              <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800/80 backdrop-blur-sm">
                                <Icon size={17} strokeWidth={2} />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {badge ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 uppercase tracking-wide">{badge}</span>
                              ) : (
                                <Lock size={13} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Cabinet */}
                  {NAV_ADVANCED.some(i => i.href === '/cabinet') && (
                    <>
                      <div className="px-4 mb-1 mt-2">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cabinet</p>
                      </div>
                      <div className="space-y-0.5">
                        {NAV_ADVANCED.filter(i => i.href === '/cabinet').map(({ href, icon: Icon, label, enabled, lockReason, badge }) => {
                          const isActive = pathname.startsWith(href);
                          return enabled ? (
                            <Link key={href} href={href} onClick={onClose}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
                              )}
                            >
                              <span className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                                isActive
                                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                              )}>
                                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                              </span>
                              <span className="flex-1 font-semibold">{label}</span>
                            </Link>
                          ) : (
                            <div key={href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70" title={lockReason}>
                              <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800/80 backdrop-blur-sm">
                                <Icon size={17} strokeWidth={2} />
                              </span>
                              <span className="flex-1 font-medium">{label}</span>
                              {badge ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 uppercase tracking-wide">{badge}</span>
                              ) : (
                                <Lock size={13} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tools */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center">
                    <Settings size={12} className="text-purple-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outils</p>
                </div>
                {NAV_TOOLS.map((item) => <NavItem key={item.href} {...item} />)}
              </div>
            </div>

            {/* Footer CTA */}
            {sub.tier !== 'business' && (
              <div className="px-3 pb-5 pt-2">
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
                    <div className="flex-shrink-0">
                      <ChevronRight size={18} className="text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
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
