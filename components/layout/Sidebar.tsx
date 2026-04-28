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
  Rocket, Crown, Sparkles, ArrowUpRight, Truck, Target,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
    subtext: 'IA · FEC · CRM · Relances',
    cta: '/paywall',
  },
  pro: {
    name: 'Pro', nextTier: 'business',
    gradient: 'from-violet-500 to-violet-600',
    iconBg: 'from-purple-600 via-violet-700 to-purple-800',
    icon: Crown, iconColor: 'text-white',
    message: 'Passer à Business',
    subtext: 'Multi-comptes · Webhooks · API',
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

const NAV_CORE = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', badge: null as null|'overdue'|'notif' },
  { href: '/documents',  icon: FileText,         label: 'Documents',       badge: 'overdue' as null|'overdue'|'notif', hasSubmenu: true },
  { href: '/crm',        icon: Target,           label: 'Pipeline CRM',    badge: null },
  { href: '/clients',    icon: Users,            label: 'Clients',         badge: null },
  { href: '/contracts',  icon: FileText,         label: 'Contrats',        badge: null },
  { href: '/products',   icon: Package,          label: 'Articles',        badge: null },
  { href: '/calendar',   icon: Calendar,         label: 'Agenda',          badge: null },
];

const DOCUMENTS_SUBMENU = [
  { href: '/invoices',   icon: Receipt,    label: 'Factures' },
  { href: '/quotes',     icon: FileText,   label: 'Devis' },
  { href: '/orders',     icon: Package,    label: 'Commandes' },
  { href: '/deliveries', icon: Truck,      label: 'Livraisons' },
  { href: '/deposits',   icon: Calculator, label: 'Acomptes' },
  { href: '/avoirs',     icon: Receipt,    label: 'Avoirs' },
];

const NAV_TOOLS = [
  { href: '/offline/workspace', icon: Building2, label: 'Workspace',     badge: null as null|'overdue'|'notif' },
  { href: '/notifications',     icon: Bell,      label: 'Notifications', badge: 'notif' as null|'overdue'|'notif' },
  { href: '/settings',          icon: Settings,  label: 'Paramètres',    badge: null },
  { href: '/help',              icon: HelpCircle,label: 'Aide',           badge: null },
];

const NAV_ADVANCED = [
  { href: '/crm',         icon: Kanban,   label: 'Pipeline CRM',  enabled: true },
  { href: '/expenses',    icon: Receipt,  label: 'Notes de frais', enabled: false },
  { href: '/connections', icon: Link2,    label: 'Connexions',    enabled: false },
  { href: '/accounting',  icon: Calculator,label: 'Comptabilité', enabled: false },
  { href: '/activity',    icon: Activity, label: 'Activité',      enabled: false },
  { href: '/banking',     icon: Landmark, label: 'Banque',        enabled: false },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const { tier } = useSubscription();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const currentTier  = (['free','solo','pro','business'].includes(tier) ? tier : 'free') as keyof typeof TIER_CONFIG;
  const tierConfig   = TIER_CONFIG[currentTier];
  const shouldShowUpgrade = tier !== 'business';

  useEffect(() => { if (user) fetchNotifications(user.id); }, [user]);

  const getBadgeCount = (badge: null|'overdue'|'notif') => {
    if (badge === 'overdue') return overdueCount;
    if (badge === 'notif')   return unreadCount;
    return 0;
  };

  /* ── Nav item (link or submenu toggle) ── */
  const NavItem = ({ href, icon: Icon, label, badge, hasSubmenu, submenu }: {
    href: string; icon: any; label: string;
    badge: null|'overdue'|'notif'; hasSubmenu?: boolean; submenu?: typeof DOCUMENTS_SUBMENU;
  }) => {
    const [open, setOpen] = useState(false);
    const active          = pathname.startsWith(href);
    const count           = getBadgeCount(badge);
    const subActive       = submenu?.some((s) => pathname.startsWith(s.href));

    if (hasSubmenu && submenu) {
      return (
        <div>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'group w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
              active || subActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <span className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
              active || subActive
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary',
            )}>
              <Icon size={17} strokeWidth={active || subActive ? 2.5 : 1.8} />
            </span>
            <span className="flex-1 text-left font-semibold">{label}</span>
            {count > 0 && (
              <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
            <ChevronDown size={14} className={cn('opacity-50 transition-transform duration-200', open && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden ml-5 mt-1 space-y-0.5"
              >
                {submenu.map((item) => {
                  const sa = pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        sa ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                      )}
                    >
                      <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0', sa ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400')}>
                        <item.icon size={13} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link href={href}
        className={cn(
          'group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
          active
            ? 'bg-primary text-white shadow-md shadow-primary/30'
            : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary',
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
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-white dark:bg-slate-950 border-r border-gray-100 dark:border-white/5 overflow-hidden flex-shrink-0">
      {/* Subtle gradient header */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
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
      <div className="relative px-4 py-3 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <button
          onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-400 hover:text-gray-600 transition-all text-sm group"
        >
          <Search size={15} className="group-hover:scale-110 transition-transform" />
          <span className="flex-1 text-left font-medium">Rechercher...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-gray-200 text-gray-400 font-mono">⌘K</kbd>
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
          <div className="mx-1 px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
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
                <div key={label} className="text-center p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-colors cursor-default">
                  <p className={cn('text-xl font-black', color)}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced tools */}
        <div className="pb-2">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
          >
            <span>Outils avancés</span>
            <ChevronDown size={12} className={cn('transition-transform duration-200', showAdvanced && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-0.5 mt-1"
              >
                {NAV_ADVANCED.map(({ href, icon: Icon, label, enabled }) =>
                  enabled ? (
                    <Link key={href} href={href}
                      className={cn(
                        'group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all',
                        pathname.startsWith(href) ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                      )}
                    >
                      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <Icon size={17} />
                      </span>
                      <span className="flex-1">{label}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">Actif</span>
                    </Link>
                  ) : (
                    <div key={href} className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-300 cursor-not-allowed opacity-60">
                      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-300 flex-shrink-0">
                        <Icon size={17} />
                      </span>
                      <span className="flex-1">{label}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide">Bientôt</span>
                    </div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tools nav */}
        <div>
          <div className="h-px bg-gray-100 dark:bg-white/5 mx-1 mb-3" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">Outils</p>
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
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/5 px-4 py-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
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
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
