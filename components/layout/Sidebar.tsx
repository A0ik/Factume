'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Kanban,
  RefreshCw, Settings, Zap, ChevronRight, ChevronDown,
  Building2, Bell, HelpCircle, Package, Receipt, Calendar,
  Calculator, Activity, Landmark, Search, Link2, TrendingUp,
  Rocket, Crown, Sparkles, ArrowUpRight, Truck, Target, Lock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { openCommandPalette } from '@/components/ui/CommandPalette';
import { toast } from 'sonner';

const TIER_CONFIG = {
  free: {
    name: 'Gratuit', nextTier: 'solo',
    gradient: 'from-gray-600 to-gray-700',
    iconBg: 'from-gray-100 to-gray-200',
    icon: Zap, iconColor: 'text-white',
    message: 'Essai gratuit 4 jours',
    subtext: 'Accès complet · Sans engagement',
    cta: '/trial',
  },
  solo: {
    name: 'Solo', nextTier: 'pro',
    gradient: 'from-blue-800 via-blue-900 to-indigo-900',
    iconBg: 'from-blue-800 to-indigo-900',
    icon: Rocket, iconColor: 'text-white',
    message: 'Passer à Pro',
    subtext: 'Contrats · Notes de frais · Signatures',
    cta: '/paywall',
  },
  pro: {
    name: 'Pro', nextTier: 'business',
    gradient: 'from-violet-500 to-violet-600',
    iconBg: 'from-purple-600 via-violet-700 to-purple-800',
    icon: Crown, iconColor: 'text-white',
    message: 'Passer à Business',
    subtext: 'CRM · OCR · API · Multi-comptes',
    cta: '/paywall',
  },
  business: {
    name: 'Business', nextTier: 'business',
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'from-amber-600 to-orange-700',
    icon: Sparkles, iconColor: 'text-white',
    message: 'Tout inclus',
    subtext: 'Fonctionnalités illimitées',
    cta: '/paywall',
  },
} as const;

interface NavItem {
  href: string;
  icon: any;
  label: string;
  badge: null | 'overdue' | 'notif' | string;
  hasSubmenu?: boolean;
  submenu?: SubMenuItem[];
  locked?: boolean;
  lockReason?: string;
  unlockTier?: string;
}

interface SubMenuItem {
  href: string;
  icon: any;
  label: string;
  locked?: boolean;
  lockReason?: string;
  unlockTier?: string;
}

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const sub = useSubscription();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const currentTier  = (['free','solo','pro','business'].includes(sub.tier) ? sub.tier : 'free') as keyof typeof TIER_CONFIG;
  const tierConfig   = TIER_CONFIG[currentTier];
  const shouldShowUpgrade = sub.tier !== 'business';

  useEffect(() => { if (user) fetchNotifications(user.id); }, [user]);

  // Build nav items based on subscription
  const buildCoreNav = (): NavItem[] => {
    const core: NavItem[] = [
      { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', badge: null },
    ];

    // Documents - always shown, submenu items filtered by tier
    core.push({
      href: '/documents',
      icon: FileText,
      label: 'Documents',
      badge: overdueCount > 0 ? 'overdue' : null,
      hasSubmenu: true,
    });

    core.push(
      { href: '/clients',    icon: Users,     label: 'Clients',         badge: null },
      { href: '/products',   icon: Package,   label: 'Articles',        badge: null },
      { href: '/calendar',   icon: Calendar,  label: 'Agenda',          badge: null },
    );

    return core;
  };

  const buildDocumentsSubmenu = (): SubMenuItem[] => {
    const docs: SubMenuItem[] = [
      { href: '/documents/factures', icon: Receipt,    label: 'Factures' },
      { href: '/documents/devis',     icon: FileText,   label: 'Devis' },
      { href: '/documents/avoirs',    icon: Receipt,    label: 'Avoirs' },
      { href: '/documents/commandes', icon: Package,    label: 'Commandes' },
      { href: '/documents/livraisons',icon: Truck,      label: 'Livraisons' },
      { href: '/documents/acomptes',  icon: Calculator, label: 'Acomptes' },
    ];

    // Contracts - Pro/Business only
    if (!sub.effectiveIsPro) {
      docs.push({
        href: '/contracts',
        icon: FileText,
        label: 'Contrats',
        locked: true,
        lockReason: 'Disponible avec Pro',
        unlockTier: 'pro',
      });
    } else {
      docs.push({ href: '/contracts', icon: FileText, label: 'Contrats' });
    }

    return docs;
  };

  const buildToolsNav = (): NavItem[] => {
    const tools: NavItem[] = [
      { href: '/offline/workspace', icon: Building2, label: 'Workspace', badge: null },
      { href: '/notifications',     icon: Bell,      label: 'Notifications', badge: unreadCount > 0 ? 'notif' : null },
      { href: '/settings',          icon: Settings,  label: 'Paramètres',    badge: null },
      { href: '/help',              icon: HelpCircle,label: 'Aide',           badge: null },
    ];
    return tools;
  };

  const buildAdvancedNav = (): Array<{ href: string; icon: any; label: string; enabled: boolean; lockReason?: string; unlockTier?: string; badge?: string }> => {
    return [
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
        href: '/crm',
        icon: Target,
        label: 'Pipeline CRM',
        enabled: sub.canUseCRM,
        lockReason: sub.canUseCRM ? undefined : 'Disponible avec Pro',
        unlockTier: 'pro',
        badge: sub.canUseCRM ? undefined : 'Disponible',
      },
      {
        href: '/ocr',
        icon: Search,
        label: 'Analyse OCR',
        enabled: sub.isBusiness || sub.isTrialActive,
        lockReason: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Disponible avec Business',
        unlockTier: 'business',
        badge: (sub.isBusiness || sub.isTrialActive) ? undefined : 'Business',
      },
      { href: '/connections', icon: Link2,    label: 'Connexions',    enabled: false, lockReason: 'Bientôt disponible' },
      { href: '/accounting',  icon: Calculator,label: 'Comptabilité', enabled: false, lockReason: 'Bientôt disponible' },
      { href: '/activity',    icon: Activity, label: 'Activité',      enabled: false, lockReason: 'Bientôt disponible' },
      { href: '/banking',     icon: Landmark, label: 'Banque',        enabled: false, lockReason: 'Bientôt disponible' },
    ];
  };

  const NAV_CORE = buildCoreNav();
  const DOCUMENTS_SUBMENU = buildDocumentsSubmenu();
  const NAV_TOOLS = buildToolsNav();
  const NAV_ADVANCED = buildAdvancedNav();

  const getBadgeCount = (badge: null | 'overdue' | 'notif' | string) => {
    if (badge === 'overdue') return overdueCount;
    if (badge === 'notif')   return unreadCount;
    return 0;
  };

  /* ── Nav item (link or submenu toggle) ── */
  const NavItem = ({ href, icon: Icon, label, badge, hasSubmenu, submenu, locked, lockReason, unlockTier }: {
    href: string; icon: any; label: string;
    badge: null | 'overdue' | 'notif' | string; hasSubmenu?: boolean; submenu?: SubMenuItem[];
    locked?: boolean; lockReason?: string; unlockTier?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const active          = pathname.startsWith(href);
    const count           = getBadgeCount(badge);
    const subActive       = submenu?.some((s) => pathname.startsWith(s.href));

    if (hasSubmenu && submenu) {
      return (
        <div>
          <div className="flex items-center gap-1">
            {locked ? (
              <div className="flex-1 flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-white/5">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="flex-1 font-semibold">{label}</span>
                <Lock size={14} className="text-gray-400" />
              </div>
            ) : (
              <>
                <Link
                  href={href}
                  className={cn(
                    'group flex-1 flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer',
                    active || subActive
                      ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 hover:text-gray-900 dark:hover:text-gray-100',
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
                    active || subActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-emerald-50/60 dark:bg-white/5 text-gray-500 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
                  )}>
                    <Icon size={17} strokeWidth={active || subActive ? 2.5 : 1.8} />
                  </span>
                  <span className="flex-1 font-semibold">{label}</span>
                  {count > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => setOpen(!open)}
                  className={cn(
                    'p-3 rounded-2xl text-sm font-medium transition-all duration-200',
                    active || subActive
                      ? 'text-primary hover:bg-primary/15'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                >
                  <ChevronDown size={14} className={cn('transition-transform duration-200', open && 'rotate-180')} />
                </button>
              </>
            )}
          </div>
          {!locked && (
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden ml-5 mt-1 space-y-0.5"
                >
                  {submenu.map((item, index) => {
                    const sa = pathname.startsWith(item.href);
                    const isLastBeforeContracts = index === submenu.length - 2;
                    return (
                      <div key={item.href}>
                        {item.locked ? (
                          <div
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                            title={item.lockReason}
                          >
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-white/5">
                              <item.icon size={13} strokeWidth={1.8} />
                            </span>
                            <span className="flex-1">{item.label}</span>
                            <Lock size={12} />
                          </div>
                        ) : (
                          <Link href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                              sa
                                ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5 hover:text-gray-800 dark:hover:text-gray-200',
                            )}
                          >
                            <span className={cn(
                              'flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all',
                              sa
                                ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm'
                                : 'bg-emerald-50/60 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-emerald-100/70 dark:hover:bg-white/10'
                            )}>
                              <item.icon size={13} strokeWidth={sa ? 2.5 : 1.8} />
                            </span>
                            <span className={cn('flex-1', sa && 'font-semibold')}>{item.label}</span>
                            {sa && (
                              <motion.span
                                layoutId="activeIndicator"
                                className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              />
                            )}
                          </Link>
                        )}
                        {isLastBeforeContracts && !item.locked && (
                          <div className="mx-3 my-2 h-px bg-gradient-to-r from-emerald-200/60 to-transparent dark:from-emerald-800/30" />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      );
    }

    if (locked) {
      return (
        <div
          className="group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-all"
          title={lockReason}
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 bg-emerald-50/60 dark:bg-white/5">
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <span className="flex-1 font-semibold">{label}</span>
          <Lock size={14} className="text-gray-400 dark:text-gray-500" />
        </div>
      );
    }

    return (
      <Link href={href}
        className={cn(
          'group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
          active
            ? 'bg-primary text-white shadow-md shadow-primary/30'
            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
        )}>
          <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
        </span>
        <span className="flex-1 font-semibold">{label}</span>
        {count > 0 && (
          <span className={cn(
            'flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold',
            badge === 'overdue' ? 'bg-red-500 text-white' : 'bg-primary text-white',
          )}>
            {count > 9 ? '9+' : count}
          </span>
        )}
        {!active && (
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-30 transition-opacity" />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-slate-950 dark:to-slate-950 border-r border-emerald-100 dark:border-emerald-900/30 overflow-hidden flex-shrink-0">
      {/* Subtle gradient header */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5 border-b border-emerald-100/80 dark:border-emerald-900/20 flex-shrink-0">
        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
          <Logo size="md" variant="full" dark={false} />
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Espace de travail</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative px-4 py-3 border-b border-emerald-100/60 dark:border-emerald-900/20 flex-shrink-0">
        <button
          onClick={() => openCommandPalette()}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-white/5 hover:bg-emerald-100/70 dark:hover:bg-white/10 border border-emerald-200/60 dark:border-emerald-800/30 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-all text-sm group"
        >
          <Search size={15} className="group-hover:scale-110 transition-transform text-primary" />
          <span className="flex-1 text-left font-medium text-gray-600 dark:text-gray-300">Rechercher...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 text-gray-500 dark:text-gray-400 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 scrollbar-none space-y-1">

        {/* Core nav */}
        {NAV_CORE.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            submenu={item.hasSubmenu ? DOCUMENTS_SUBMENU : undefined}
          />
        ))}

        {/* Divider + quick stats */}
        <div className="pt-4 pb-2">
          <div className="h-px bg-gray-100 dark:bg-white/5 mx-1 mb-4" />
          <div className="mx-1 px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={12} className="text-primary" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aperçu rapide</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Payées', value: invoices.filter(i => i.status === 'paid').length,    color: 'text-primary' },
                { label: 'Attente', value: invoices.filter(i => i.status === 'sent').length,  color: 'text-amber-500' },
                { label: 'Retard',  value: overdueCount,                                        color: overdueCount > 0 ? 'text-red-500' : 'text-gray-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors cursor-default">
                  <p className={cn('text-xl font-black', color)}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced tools - Always visible and prominent */}
        {NAV_ADVANCED.some(item => item.enabled || item.lockReason) && (
          <div className="pb-3">
            <div className="px-4 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fonctionnalités Premium</p>
              </div>
            </div>
            <div className="space-y-1">
              {NAV_ADVANCED.map(({ href, icon: Icon, label, enabled, lockReason, unlockTier, badge }) => {
                const isActive = pathname.startsWith(href);
                return enabled ? (
                  <Link key={href} href={href}
                    className={cn(
                      'group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100',
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all',
                      isActive
                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
                    )}>
                      <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                    </span>
                    <span className="flex-1 font-medium">{label}</span>
                  </Link>
                ) : (
                  <div key={href} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-70" title={lockReason}>
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0">
                      <Icon size={15} className="text-gray-300 dark:text-gray-600" />
                    </span>
                    <span className="flex-1 font-medium">{label}</span>
                    {badge ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 uppercase tracking-wide">{badge}</span>
                    ) : unlockTier ? (
                      <button
                        onClick={() => router.push(unlockTier === 'pro' ? '/paywall?plan=pro' : '/paywall?plan=business')}
                        className={cn(
                          'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide transition-all',
                          unlockTier === 'pro'
                            ? 'bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                            : 'bg-amber-100 text-amber-600 border border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                        )}
                      >
                        {unlockTier === 'pro' ? 'PRO' : 'BUSINESS'}
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide">Bientôt</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tools nav */}
        <div>
          <div className="h-px bg-gradient-to-r from-emerald-200/60 via-emerald-100/40 to-transparent dark:from-emerald-800/30 dark:via-emerald-900/10 mx-1 mb-3" />
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-2">Outils</p>
          <div className="space-y-0.5">
            {NAV_TOOLS.map((item) => <NavItem key={item.href} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Upgrade banner */}
      {shouldShowUpgrade && (
        <div className="px-4 mb-3 flex-shrink-0">
          <Link href={tierConfig.cta}
            className="group relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', tierConfig.gradient)} />
            <div className="relative flex items-center gap-3 w-full">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 transition-transform group-hover:scale-110 group-hover:rotate-6')}>
                <tierConfig.icon size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tierConfig.message}</p>
                <p className="text-[11px] text-white/70 mt-0.5">{tierConfig.subtext}</p>
              </div>
              <ArrowUpRight size={16} className="relative text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
            </div>
          </Link>
        </div>
      )}

      {/* Profile */}
      <div className="flex-shrink-0 border-t border-emerald-100/60 dark:border-emerald-900/20 px-4 py-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5 transition-colors cursor-pointer group">
          <UserDropdown
            user={{
              name: profile?.company_name || profile?.first_name || 'Mon compte',
              email: profile?.email || '',
              initials: getInitials(profile?.company_name || profile?.first_name || 'U'),
              avatar: profile?.logo_url || undefined,
              status: 'online',
              tier: profile?.subscription_tier || 'free',
            }}
            onAction={async (action) => {
              if (action === 'logout') {
                try { toast.loading('Déconnexion...', { id: 'logout' }); await signOut(); toast.success('Déconnecté', { id: 'logout' }); }
                catch { toast.error('Erreur déconnexion', { id: 'logout' }); }
              }
              if (action === 'settings')      router.push('/settings');
              if (action === 'profile')       router.push('/settings');
              if (action === 'notifications') router.push('/notifications');
              if (action === 'help')          router.push('/help');
              if (action === 'add-account' || action.startsWith('switch:')) {
                try { await signOut(); router.push('/login'); } catch {}
              }
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
              {profile?.company_name || profile?.first_name || 'Mon compte'}
            </p>
            <p className="text-[11px] text-gray-400 capitalize font-medium mt-0.5">{tierConfig.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <KeyboardShortcutsHelp />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
