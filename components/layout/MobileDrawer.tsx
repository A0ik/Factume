'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LayoutDashboard, FileText, Users, Calendar, Settings,
  Package, Receipt, Truck, Calculator, HelpCircle,
  Bell, Building2, Crown, Sparkles, Rocket, Zap, Target, Lock, ChevronRight,
  Moon, Sun, Home,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { cn, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

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

// Documents expandable component - main button navigates, arrow expands submenu
function DocumentsExpandable({ documents, pathname, onClose }: { documents: NavItem[]; pathname: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const active = pathname.startsWith('/documents');

  return (
    <div className="space-y-1">
      {/* Main Documents button - navigates to /documents */}
      <Link
        href="/documents"
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 group',
          active
            ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 border border-primary/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-100/50 dark:hover:from-emerald-900/20 dark:hover:to-emerald-800/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
          active
            ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30'
            : 'bg-gradient-to-br from-emerald-100 to-emerald-200/80 dark:from-emerald-900/40 dark:to-emerald-800/40 text-primary dark:text-primary/80 group-hover:scale-110',
        )}>
          <FileText size={17} strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="flex-1 font-semibold">Documents</span>
        {active && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 rounded-full bg-primary shadow-sm"
          />
        )}
      </Link>

      {/* Expand arrow button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200',
          expanded
            ? 'text-primary dark:text-primary/80 bg-primary/10 dark:bg-primary/5'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
        )}
      >
        <span className="w-10" /> {/* Spacer for alignment */}
        <span className="flex-1 text-xs font-medium uppercase tracking-wide">
          Types de documents
        </span>
        <ChevronRight
          size={14}
          className={cn('transition-transform duration-200', expanded && 'rotate-90')}
        />
      </button>

      {/* Submenu - expands on arrow click */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-4 space-y-0.5"
          >
            {documents.map((item) => {
              const isActive = pathname.startsWith(item.href);

              if (item.locked) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70"
                    title={item.lockReason}
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm">
                      <item.icon size={15} strokeWidth={2} />
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    <Lock size={13} />
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary dark:text-primary/80 shadow-sm border border-primary/20 dark:border-primary/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-emerald-50/60 hover:to-emerald-100/30 dark:hover:from-emerald-900/10 dark:hover:to-emerald-800/5',
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-500 dark:text-gray-400',
                  )}>
                    <item.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm"
                    />
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const { theme, toggle } = useThemeStore();

  // Close on route change
  useEffect(() => { onClose(); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const TierIcon = TIER_ICON[sub.tier] || Zap;

  // Build nav items based on subscription
  const buildMainNav = (): NavItem[] => {
    const main: NavItem[] = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    ];

    // Notes de frais - Show with Pro indicator for all, only accessible for Pro/Business
    main.push({
      href: '/expenses',
      icon: Receipt,
      label: 'Notes de frais',
      locked: !sub.effectiveIsPro,
      lockReason: 'Disponible avec Pro',
      unlockTier: 'pro',
    });

    main.push(
      { href: '/clients',   icon: Users,           label: 'Clients' },
      { href: '/products',  icon: Package,         label: 'Articles' },
      { href: '/calendar',  icon: Calendar,        label: 'Agenda' },
    );

    return main;
  };

  const buildDocsNav = (): NavItem[] => {
    const docs: NavItem[] = [
      { href: '/documents/factures', icon: Receipt, label: 'Factures' },
      { href: '/documents/devis',     icon: FileText, label: 'Devis' },
      { href: '/documents/avoirs',    icon: Receipt, label: 'Avoirs' },
      { href: '/documents/commandes', icon: Package, label: 'Commandes' },
      { href: '/documents/livraisons',icon: Truck,   label: 'Livraisons' },
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
    const tools: NavItem[] = [];

    // CRM - Pro/Business only
    if (!sub.canUseCRM) {
      tools.push({
        href: '/crm',
        icon: Target,
        label: 'Pipeline CRM',
        locked: true,
        lockReason: 'Disponible avec Pro',
        unlockTier: 'pro',
      });
    } else {
      tools.push({ href: '/crm', icon: Target, label: 'Pipeline CRM' });
    }

    tools.push(
      { href: '/notifications', icon: Bell, label: 'Notifications' },
      { href: '/help', icon: HelpCircle, label: 'Aide' },
      { href: '/settings', icon: Settings, label: 'Paramètres' },
    );

    return tools;
  };

  const NAV_MAIN = buildMainNav();
  const NAV_DOCS = buildDocsNav();
  const NAV_TOOLS = buildToolsNav();

  const NavItem = ({ href, icon: Icon, label, locked, lockReason, unlockTier }: NavItem) => {
    const active = pathname.startsWith(href);

    if (locked) {
      return (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70"
          title={lockReason}
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm">
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
          {/* Backdrop - Enhanced with better contrast */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer - Enhanced liquid glass effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm flex flex-col shadow-2xl border-r border-emerald-200/80 dark:border-emerald-800/40 backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
            }}
          >
            {/* Header - Logo and profile */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-200/80 dark:border-emerald-800/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
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
                  className="p-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-all hover:scale-105 active:scale-95"
                  aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all hover:scale-105 active:scale-95"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
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
                {NAV_MAIN.map((item) => <NavItem key={item.href} {...item} />)}

                {/* Documents hub - Combined button + expandable */}
                <div className="mt-2">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <FileText size={12} className="text-primary" strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Documents</p>
                  </div>
                  <DocumentsExpandable documents={NAV_DOCS} pathname={pathname} onClose={onClose} />
                </div>
              </div>

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
            {sub.tier === 'free' && (
              <div className="px-3 pb-5 pt-2">
                <Link
                  href="/trial"
                  className="group relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={onClose}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-emerald-600 transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-20" />
                  <div className="relative flex items-center gap-3 w-full">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12 group-hover:scale-110">
                      <Sparkles size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">Essai gratuit 4 jours</p>
                      <p className="text-[11px] text-white/80 mt-0.5">Accès complet · Sans engagement</p>
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
