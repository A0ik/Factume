'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, LayoutDashboard, FileText, Users, Calendar, Settings,
  Package, Receipt, Truck, Calculator, HelpCircle,
  Bell, Building2, Crown, Sparkles, Rocket, Zap, Target, Lock, ChevronRight,
  Moon, Sun,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { cn, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
      { href: '/documents', icon: FileText,        label: 'Documents' },
    ];

    // Notes de frais - Pro/Business only (completely hidden for Free/Solo)
    if (sub.effectiveIsPro) {
      main.push({ href: '/expenses', icon: Receipt, label: 'Notes de frais' });
    }

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
          <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800">
            <Icon size={16} />
          </span>
          <span className="flex-1">{label}</span>
          <Lock size={14} />
        </div>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
        )}
      >
        <span className={cn(
          'flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0',
          active ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        )}>
          <Icon size={16} />
        </span>
        <span className="flex-1">{label}</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white dark:bg-gray-900 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-black text-sm">
                  {getInitials(profile?.company_name || profile?.first_name || 'U')}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                    {profile?.company_name || profile?.first_name || 'Mon compte'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TierIcon size={10} className="text-primary" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{TIER_LABEL[sub.tier] || 'Gratuit'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Nav content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* Main nav */}
              <div className="space-y-0.5">
                {NAV_MAIN.map((item) => <NavItem key={item.href} {...item} />)}
              </div>

              {/* Documents hub */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-1">Types de documents</p>
                <div className="space-y-0.5">
                  {NAV_DOCS.map((item) => <NavItem key={item.href} {...item} />)}
                </div>
              </div>

              {/* Tools */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-1">Outils</p>
                <div className="space-y-0.5">
                  {NAV_TOOLS.map((item) => <NavItem key={item.href} {...item} />)}
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            {sub.tier === 'free' && (
              <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                <Link
                  href="/trial"
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white"
                >
                  <Sparkles size={18} />
                  <div>
                    <p className="text-sm font-bold">Essai gratuit 4 jours</p>
                    <p className="text-[11px] text-white/70">Accès complet · Sans engagement</p>
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
