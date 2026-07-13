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
  Shield, Plug,
  Target,
  Sparkles, ArrowUpRight,
  FileSignature, ClipboardList, UsersRound, DollarSign,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
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
  const sub = useSubscription();
  const { theme, toggle } = useThemeStore();
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const getInitialExpanded = useCallback(() => {
    const sections: Record<string, boolean> = {};
    if (pathname.startsWith('/documents')) sections['documents'] = true;
    if (pathname.startsWith('/contacts') || pathname.startsWith('/clients') || pathname.startsWith('/products') || pathname.startsWith('/crm')) sections['contacts'] = true;
    if (pathname.startsWith('/expenses') || pathname.startsWith('/accounting') || pathname.startsWith('/banking') || pathname.startsWith('/data-health')) sections['finances'] = true;
    if (pathname.startsWith('/contracts')) sections['contrats'] = true;
    if (pathname.startsWith('/cabinet')) sections['cabinet'] = true;
    if (pathname.startsWith('/ocr') || pathname.startsWith('/integrations') || pathname.startsWith('/calendar')) sections['outils'] = true;
    return sections;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => getInitialExpanded());

  useEffect(() => { onClose(); }, [pathname]);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => { if (user) fetchNotifications(user.id); }, [user]);
  useEffect(() => {
    setExpanded(prev => ({ ...prev, ...getInitialExpanded() }));
  }, [pathname, getInitialExpanded]);

  const toggleSection = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // PROMÉTHÉE — section Cabinet (expert-comptable, Business) ajoutée à la navbar mobile.
  const sections: NavSection[] = [
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      items: [
        { href: '/documents', icon: FileText, label: 'Tous les documents' },
      ],
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: UsersRound,
      items: [
        { href: '/contacts', icon: Users, label: 'Clients & Articles' },
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
        { href: '/contracts', icon: FileSignature, label: 'Tous les contrats' },
        { href: '/contracts/reports', icon: ClipboardList, label: 'Rapports' },
      ],
    },
    {
      id: 'cabinet',
      label: 'Cabinet',
      icon: Briefcase,
      items: [
        { href: '/cabinet', icon: Briefcase, label: 'Dashboard cabinet', locked: !sub.isBusiness, lockTier: 'business' },
        { href: '/cabinet/clients', icon: Users, label: 'Clients du cabinet', locked: !sub.isBusiness, lockTier: 'business' },
      ],
    },
    {
      id: 'outils',
      label: 'Outils',
      icon: Plug,
      items: [
        { href: '/ocr', icon: Search, label: 'Scan OCR', locked: !sub.isBusiness, lockTier: 'business' },
        { href: '/integrations', icon: Plug, label: 'Connexions', locked: !sub.effectiveIsPro, lockTier: 'pro' },
        { href: '/calendar', icon: Calendar, label: 'Agenda' },
        { href: '/activity', icon: Activity, label: 'Activité', locked: !sub.effectiveIsPro, lockTier: 'pro' },
      ],
    },
  ];

  const isOpen = (id: string) => expanded[id] ?? false;

  const SubItemRow = ({ href, icon: Icon, label, locked, lockTier }: SubItem) => {
    const active = pathname.startsWith(href);
    if (locked) {
      return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70" title={`Disponible avec ${lockTier === 'pro' ? 'Pro' : 'Business'}`}>
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

  const SectionRow = ({ section }: { section: NavSection }) => {
    const open = isOpen(section.id);
    const SectionIcon = section.icon;
    const isActive = section.items.some(item => !item.locked && pathname.startsWith(item.href));

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

  const accountLinks = [
    { href: '/settings', icon: Settings, label: 'Paramètres' },
    { href: '/help', icon: HelpCircle, label: 'Aide' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm flex flex-col shadow-2xl border-r border-emerald-100 dark:border-white/[0.06] bg-gradient-to-b from-emerald-50/50 to-white dark:from-[#09090B] dark:to-[#09090B]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-emerald-100/80 dark:border-white/[0.04] bg-emerald-50/30 dark:bg-white/[0.02] flex-shrink-0">
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
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-primary transition-all active:scale-95"
                  aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button
                  onClick={onClose}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-all active:scale-95"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-emerald-100/60 dark:border-white/[0.04] flex-shrink-0">
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
              <Link href="/dashboard" onClick={onClose} className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                pathname.startsWith('/dashboard')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white',
              )}>
                <span className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all duration-200',
                  pathname.startsWith('/dashboard')
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
                )}>
                  <LayoutDashboard size={17} strokeWidth={pathname.startsWith('/dashboard') ? 2.5 : 1.8} />
                </span>
                <span className="flex-1 font-semibold">Tableau de bord</span>
              </Link>

              {sections.map(section => <SectionRow key={section.id} section={section} />)}

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
