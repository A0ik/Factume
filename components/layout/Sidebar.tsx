'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Settings, Zap,
  ChevronRight, ChevronLeft, Search, Bell, HelpCircle,
  Package, Receipt, Calculator, Activity, Landmark,
  Target, Shield, Plug, Calendar, ScanLine,
  EyeOff, Eye, LogOut, Moon, Sun, Keyboard,
  DollarSign, ClipboardList, UsersRound,
  FilePlus2, FileCheck, FilePenLine, Truck, CreditCard,
  Briefcase, Lock, ArrowUpRight, Crown, Sparkles,
  FileSignature,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useSidebarState, type SidebarMode } from '@/hooks/useSidebarState';
import { cn, getInitials } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { openCommandPalette } from '@/components/ui/CommandPalette';
import { toast } from 'sonner';

// ─── Tier config (unchanged from original) ───────────────────────
const TIER_CONFIG = {
  free: { name: 'Gratuit', nextTier: 'pro', gradient: 'from-gray-600 to-gray-700', icon: Zap, iconColor: 'text-white', message: 'Essai gratuit 7 jours', subtext: 'Accès complet · Sans engagement', cta: '/trial' },
  trial: { name: 'Essai', nextTier: 'pro', gradient: 'from-purple-500 to-violet-600', icon: Sparkles, iconColor: 'text-white', message: 'Essai en cours', subtext: 'Accès Pro · 7 jours gratuits', cta: '/paywall' },
  pro: { name: 'Pro', nextTier: 'business', gradient: 'from-violet-500 to-violet-600', icon: Crown, iconColor: 'text-white', message: 'Passer à Business', subtext: 'CRM · API · Notes de frais', cta: '/paywall' },
  business: { name: 'Business', nextTier: 'business', gradient: 'from-violet-600 to-purple-700', icon: Sparkles, iconColor: 'text-white', message: 'Tout inclus', subtext: 'Fonctionnalités illimitées', cta: '/paywall' },
} as const;

// ─── Navigation items (flat, icon-based) ─────────────────────────
interface NavItem {
  id: string;
  href: string;
  icon: any;
  label: string;
  subLabel?: string;
  badge?: number;
  locked?: boolean;
  lockTier?: string;
  children?: { href: string; icon: any; label: string; locked?: boolean; lockTier?: string }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const sub = useSubscription();
  const { mode, setMode, toggleFocus } = useSidebarState();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const hoverZoneRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  // OVERLORD (CIBLE 3) — 'solo' est un plan legacy supprimé : on le mappe sur 'pro'
  // (resolveEffectiveTier fait de même) pour qu'un profil DB encore à 'solo'
  // n'affiche plus jamais le badge fantôme.
  const tierKey = sub.tier === 'solo' ? 'pro' : sub.tier;
  const currentTier = (['free','trial','pro','business'].includes(tierKey) ? tierKey : 'free') as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[currentTier];
  const shouldShowUpgrade = sub.tier !== 'business';

  useEffect(() => { if (user) fetchNotifications(user.id); }, [user, fetchNotifications]);

  // Click outside profile popover
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfile]);

  // ─── Build nav items ──────────────────────────────────────────
  const navItems: NavItem[] = [
    { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    {
      id: 'documents', href: '/documents', icon: FileText, label: 'Documents', subLabel: 'Factures, devis…',
      children: [
        { href: '/documents/factures', icon: FilePlus2, label: 'Factures' },
        { href: '/documents/devis', icon: FileCheck, label: 'Devis' },
        { href: '/documents/avoirs', icon: FilePenLine, label: 'Avoirs' },
        { href: '/documents/commandes', icon: Receipt, label: 'Commandes' },
        { href: '/documents/livraisons', icon: Truck, label: 'Livraisons' },
        { href: '/documents/acomptes', icon: CreditCard, label: 'Acomptes' },
      ],
    },
    {
      id: 'contacts', href: '/contacts', icon: UsersRound, label: 'Contacts', subLabel: 'Clients, articles…',
      children: [
        { href: '/clients', icon: Users, label: 'Clients' },
        { href: '/products', icon: Package, label: 'Articles' },
        { href: '/crm', icon: Target, label: 'Pipeline CRM', locked: !sub.canUseCRM, lockTier: 'pro' },
      ],
    },
    // PROMÉTHÉE — Cabinet d'expertise comptable (Business). Entrée globale manquante
    // jusqu'ici (Briefcase était importé mais inutilisé). Lock Business pour les autres plans.
    {
      id: 'cabinet', href: '/cabinet', icon: Briefcase, label: 'Cabinet', subLabel: 'Expert-comptable',
      locked: !sub.isBusiness, lockTier: 'business',
    },
    {
      id: 'finances', href: '/expenses', icon: DollarSign, label: 'Finances',
      children: [
        { href: '/expenses', icon: Receipt, label: 'Notes de frais', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/accounting', icon: Calculator, label: 'Comptabilité', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/banking', icon: Landmark, label: 'Banque', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/data-health', icon: Shield, label: 'Santé des données', locked: !sub.effectiveIsPro, lockTier: 'pro' },
      ],
    },
    {
      id: 'contracts', href: '/contracts', icon: ClipboardList, label: 'Contrats',
      children: [
        { href: '/contracts/list/cdi', icon: FileSignature, label: 'CDI' },
        { href: '/contracts/list/cdd', icon: FileSignature, label: 'CDD' },
        { href: '/contracts/list/other', icon: FileSignature, label: 'Autres' },
      ],
    },
    {
      id: 'tools', href: '/integrations', icon: ScanLine, label: 'Outils',
      children: [
        { href: '/ocr', icon: ScanLine, label: 'Scan OCR', locked: !sub.isBusiness, lockTier: 'business' },
        { href: '/integrations', icon: Plug, label: 'Connexions', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/calendar', icon: Calendar, label: 'Agenda' },
        { href: '/activity', icon: Activity, label: 'Activité', locked: !sub.effectiveIsPro, lockTier: 'pro' },
      ],
    },
  ];

  const utilityItems: NavItem[] = [
    { id: 'settings', href: '/settings', icon: Settings, label: 'Paramètres' },
    { id: 'help', href: '/help', icon: HelpCircle, label: 'Aide' },
    { id: 'notifications', href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const isItemActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(c => isActive(c.href)) ?? false;
  };

  const sidebarWidth = mode === 'focus' ? 0 : mode === 'expanded' ? 260 : 64;
  const isExpanded = mode === 'expanded';
  const isFocus = mode === 'focus';

  // ─── Render helpers ──────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    if (mode === 'icons') {
      return (
        <div
          key={item.id}
          className="relative"
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <Link
            href={item.children ? item.children[0].href : item.href}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
          </Link>

          {/* Popover on hover */}
          <AnimatePresence>
            {hoveredItem === item.id && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full top-0 ml-2 z-50 w-52 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="px-3 py-2.5 border-b border-gray-100 dark:border-white/5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  {item.subLabel && <p className="text-[10px] text-gray-400 mt-0.5">{item.subLabel}</p>}
                </div>
                {item.children && (
                  <div className="p-1.5">
                    {item.children.map(child => (
                      child.locked ? (
                        <div key={child.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 opacity-60" title={`Disponible avec ${child.lockTier === 'pro' ? 'Pro' : 'Business'}`}>
                          <child.icon size={14} strokeWidth={1.8} />
                          <span className="flex-1">{child.label}</span>
                          <Lock size={10} className="text-gray-400" />
                        </div>
                      ) : (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                            isActive(child.href)
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5',
                          )}
                        >
                          <child.icon size={14} strokeWidth={isActive(child.href) ? 2.2 : 1.8} />
                          <span>{child.label}</span>
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Expanded mode
    return (
      <div key={item.id} className="space-y-0.5">
        <Link
          href={item.children ? item.children[0].href : item.href}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
          )}
        >
          <span className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all',
            active
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500',
          )}>
            <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
          </span>
          <span className="flex-1 text-left font-semibold">{item.label}</span>
        </Link>

        {item.children && active && (
          <div className="ml-4 pl-4 border-l border-gray-100 dark:border-white/5 space-y-0.5 py-0.5">
            {item.children.map(child => (
              child.locked ? (
                <div key={child.href} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 opacity-60" title={`Disponible avec ${child.lockTier === 'pro' ? 'Pro' : 'Business'}`}>
                  <child.icon size={14} strokeWidth={1.8} />
                  <span className="flex-1">{child.label}</span>
                  <Lock size={11} className="text-gray-400" />
                </div>
              ) : (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
                    isActive(child.href)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
                  )}
                >
                  <child.icon size={14} strokeWidth={isActive(child.href) ? 2.5 : 1.8} />
                  <span>{child.label}</span>
                </Link>
              )
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────

  return (
    <>
      {/* Focus mode hover zone — invisible strip on left edge */}
      {isFocus && (
        <div
          ref={hoverZoneRef}
          className="fixed left-0 top-0 w-2 h-full z-50"
          onMouseEnter={() => setMode('icons')}
        />
      )}

      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-[#09090B] dark:to-[#09090B] border-r border-emerald-100 dark:border-white/[0.06] overflow-hidden flex-shrink-0"
        style={{ pointerEvents: isFocus ? 'none' : 'auto' }}
      >
        {/* ─── Header ─────────────────────────────────────── */}
        <div className={cn(
          'flex-shrink-0 border-b border-emerald-100/60 dark:border-white/[0.04] flex items-center',
          isExpanded ? 'px-5 pt-5 pb-4 gap-3' : 'justify-center pt-5 pb-4',
        )}>
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <Logo size={isExpanded ? 'md' : 'sm'} variant={isExpanded ? 'full' : 'icon'} dark={false} />
          </Link>
        </div>

        {/* ─── Search button ──────────────────────────────── */}
        <div className={cn(
          'flex-shrink-0 border-b border-emerald-100/40 dark:border-white/[0.03]',
          isExpanded ? 'px-4 py-3' : 'py-3 flex justify-center',
        )}>
          {isExpanded ? (
            <button
              onClick={() => openCommandPalette()}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-white/5 hover:bg-emerald-100/70 dark:hover:bg-white/10 border border-emerald-200/60 dark:border-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-all text-sm group"
            >
              <Search size={15} className="group-hover:scale-110 transition-transform text-primary" />
              <span className="flex-1 text-left font-medium text-gray-600 dark:text-gray-300">Rechercher...</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-emerald-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 font-mono">⌘K</kbd>
            </button>
          ) : (
            <button
              onClick={() => openCommandPalette()}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-primary transition-all"
              title="Rechercher (⌘K)"
            >
              <Search size={20} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* ─── Main navigation ────────────────────────────── */}
        <nav className={cn(
          'flex-1 overflow-y-auto scrollbar-none',
          isExpanded ? 'px-3 py-4 space-y-1' : 'py-4 flex flex-col items-center gap-1',
        )}>
          {navItems.map(renderNavItem)}

          {/* Divider */}
          <div className={cn(
            'h-px bg-gray-100 dark:bg-white/5 my-3',
            isExpanded ? 'mx-1' : 'mx-2',
          )} />

          {/* Utility items */}
          {utilityItems.map(item => {
            const active = isActive(item.href);
            const Icon = item.icon;
            if (mode === 'icons') {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 relative',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {item.badge && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-bold bg-primary text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500',
                )}>
                  <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                </span>
                <span className="flex-1 font-semibold">{item.label}</span>
                {item.badge && (
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ─── Bottom section ──────────────────────────────── */}
        <div className={cn(
          'flex-shrink-0 border-t border-emerald-100/60 dark:border-white/[0.04]',
          isExpanded ? 'px-4 py-3' : 'py-3 flex flex-col items-center gap-2',
        )}>
          {/* Focus mode toggle */}
          {isExpanded ? (
            <button
              onClick={toggleFocus}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
            >
              <EyeOff size={15} strokeWidth={1.8} />
              <span>Mode Focus</span>
              <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 font-mono">⌘/</kbd>
            </button>
          ) : (
            <button
              onClick={toggleFocus}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
              title="Mode Focus (⌘/)"
            >
              <EyeOff size={20} strokeWidth={1.8} />
            </button>
          )}

          {/* Expand/collapse toggle (only in non-focus) */}
          {isExpanded ? (
            <button
              onClick={() => setMode('icons')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
              <span>Réduire</span>
            </button>
          ) : (
            <button
              onClick={() => setMode('expanded')}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
              title="Développer"
            >
              <ChevronRight size={20} strokeWidth={1.8} />
            </button>
          )}

          {/* Profile */}
          <div ref={profileRef} className="relative">
            {isExpanded ? (
              <button
                onClick={() => setShowProfile(!showProfile)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-sm border cursor-pointer',
                  'bg-gradient-to-br border-gray-200 dark:border-gray-700',
                  sub.tier === 'free' && 'from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900',
                  sub.tier === 'trial' && 'from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
                  (sub.tier === 'solo' || sub.tier === 'pro') && 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
                  sub.tier === 'business' && 'from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10',
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  profile?.logo_url ? '' : 'bg-primary text-white text-xs font-bold',
                )}>
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    getInitials(profile?.company_name || profile?.first_name || 'U')
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{profile?.company_name || profile?.first_name || 'Mon compte'}</p>
                  <p className="text-[10px] text-gray-400 truncate">{tierConfig.name}</p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center justify-center w-12 h-12 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/5"
                title={profile?.company_name || 'Mon compte'}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  profile?.logo_url ? '' : 'bg-primary text-white text-xs font-bold',
                )}>
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    getInitials(profile?.company_name || profile?.first_name || 'U')
                  )}
                </div>
              </button>
            )}

            {/* Profile popover */}
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden',
                    isExpanded ? 'bottom-full mb-2 left-0 right-0' : 'bottom-full mb-2 left-full ml-2 w-56',
                  )}
                >
                  {/* Tier upgrade card */}
                  {shouldShowUpgrade && (
                    <Link
                      href={tierConfig.cta}
                      onClick={() => setShowProfile(false)}
                      className={cn('flex items-center gap-3 p-3 bg-gradient-to-br opacity-90 hover:opacity-100 transition-opacity', tierConfig.gradient)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
                        <tierConfig.icon size={14} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{tierConfig.message}</p>
                        <p className="text-[10px] text-white/70 mt-0.5">{tierConfig.subtext}</p>
                      </div>
                      <ArrowUpRight size={14} className="text-white/70" />
                    </Link>
                  )}

                  <div className="p-2">
                    <button
                      onClick={() => { router.push('/settings'); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings size={14} strokeWidth={1.8} />
                      Paramètres
                    </button>
                    <button
                      onClick={() => { router.push('/notifications'); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Bell size={14} strokeWidth={1.8} />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="border-t border-gray-100 dark:border-white/5 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <KeyboardShortcutsHelp />
                    </div>
                    <button
                      onClick={async () => {
                        setShowProfile(false);
                        try {
                          toast.loading('Déconnexion...', { id: 'logout' });
                          await signOut();
                          toast.success('Déconnecté', { id: 'logout' });
                        } catch {
                          toast.error('Erreur déconnexion', { id: 'logout' });
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} strokeWidth={1.8} />
                      Déconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
