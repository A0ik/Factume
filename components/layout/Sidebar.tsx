'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Users,
  Settings, Zap, ChevronRight, ChevronDown,
  Building2, Bell, HelpCircle, Package, Receipt, Calendar,
  Calculator, Activity, Landmark, Search,
  Rocket, Crown, Sparkles, ArrowUpRight, Target, Lock,
  FilePlus2, FileCheck, FilePenLine, Truck, CreditCard, ScanLine,
  Shield, Plug, Briefcase, BookOpen,
  FileSignature, ClipboardList, UsersRound, DollarSign,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { openCommandPalette } from '@/components/ui/CommandPalette';
import { toast } from 'sonner';

const TIER_CONFIG = {
  free: { name: 'Gratuit', nextTier: 'solo', gradient: 'from-gray-600 to-gray-700', icon: Zap, iconColor: 'text-white', message: 'Essai gratuit 7 jours', subtext: 'Accès complet · Sans engagement', cta: '/trial' },
  trial: { name: 'Essai', nextTier: 'pro', gradient: 'from-purple-500 to-violet-600', icon: Sparkles, iconColor: 'text-white', message: 'Essai en cours', subtext: 'Accès Pro · 7 jours gratuits', cta: '/paywall' },
  solo: { name: 'Solo', nextTier: 'pro', gradient: 'from-blue-800 via-blue-900 to-indigo-900', icon: Rocket, iconColor: 'text-white', message: 'Passer à Pro', subtext: 'Contrats · Notes de frais · Signatures', cta: '/paywall' },
  pro: { name: 'Pro', nextTier: 'business', gradient: 'from-violet-500 to-violet-600', icon: Crown, iconColor: 'text-white', message: 'Passer à Business', subtext: 'CRM · OCR · API · Multi-comptes', cta: '/paywall' },
  business: { name: 'Business', nextTier: 'business', gradient: 'from-violet-600 to-purple-700', icon: Sparkles, iconColor: 'text-white', message: 'Tout inclus', subtext: 'Fonctionnalités illimitées', cta: '/paywall' },
} as const;

interface SubItem { href: string; icon: any; label: string; locked?: boolean; lockTier?: string }
interface NavSection {
  id: string;
  label: string;
  icon: any;
  items: SubItem[];
  defaultOpen?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const { cabinet } = useCabinetStore();
  const sub = useSubscription();
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const hasCabinet = !!cabinet;
  const canAccessCabinet = (sub.isBusiness || sub.isTrialActive);
  const cabinetLocked = !canAccessCabinet;
  const cabinetItemsLocked = !canAccessCabinet || !hasCabinet;
  const currentTier = (['free','trial','solo','pro','business'].includes(sub.tier) ? sub.tier : 'free') as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[currentTier];
  const shouldShowUpgrade = sub.tier !== 'business';

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

  useEffect(() => { if (user) fetchNotifications(user.id); }, [user]);

  // Update expanded when pathname changes
  useEffect(() => {
    setExpanded(prev => ({ ...prev, ...getInitialExpanded() }));
  }, [pathname, getInitialExpanded]);

  const toggleSection = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // When inside cabinet pages, collapse the cabinet section in main sidebar
  // (the cabinet layout has its own dedicated sidebar)
  const isInCabinet = pathname.startsWith('/cabinet');

  // ── Section definitions ──
  const sections: NavSection[] = [
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      defaultOpen: true,
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

  // ── Sub-item component ──
  const SubItem = ({ href, icon: Icon, label, locked, lockTier }: SubItem) => {
    const active = pathname.startsWith(href);
    if (locked) {
      const isCabinetItem = href.startsWith('/cabinet/') && canAccessCabinet && !hasCabinet;
      const tooltip = isCabinetItem
        ? 'Créez d\'abord votre cabinet'
        : `Disponible avec ${lockTier === 'pro' ? 'Pro' : 'Business'}`;
      return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-70 group" title={tooltip}>
          <Icon size={14} strokeWidth={1.8} />
          <span className="flex-1">{label}</span>
          <Lock size={11} className="text-gray-400" />
        </div>
      );
    }
    return (
      <Link href={href} className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300',
      )}>
        <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
        <span>{label}</span>
      </Link>
    );
  };

  // ── Section component ──
  const Section = ({ section }: { section: NavSection }) => {
    const open = isOpen(section.id);
    const SectionIcon = section.icon;
    const isActive = section.items.some(item => !item.locked && pathname.startsWith(item.href));
    const allLocked = section.items.every(item => item.locked);

    // Don't show cabinet section for non-business users unless they're on trial
    if (section.id === 'cabinet' && !(sub.isBusiness || sub.isTrialActive)) {
      // Show locked version
      return (
        <div className="space-y-0.5">
          <button onClick={() => toggleSection(section.id)} className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-gray-300 dark:text-gray-600 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5',
          )}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0">
              <SectionIcon size={15} className="text-gray-300 dark:text-gray-600" />
            </span>
            <span className="flex-1 text-left font-medium">{section.label}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 uppercase tracking-wide">BUSINESS</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <button onClick={() => toggleSection(section.id)} className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5',
        )}>
          <span className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all',
            isActive
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500',
          )}>
            <SectionIcon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
          </span>
          <span className="flex-1 text-left font-semibold">{section.label}</span>
          <span className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <ChevronDown size={14} className="text-gray-400" />
          </span>
        </button>
        {open && (
          <div className="ml-4 pl-4 border-l border-gray-100 dark:border-white/5 space-y-0.5 py-1">
            {section.items.map(item => <SubItem key={item.href} {...item} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-slate-950 dark:to-slate-950 border-r border-emerald-100 dark:border-emerald-900/30 overflow-hidden flex-shrink-0">
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

        {/* Dashboard - always visible */}
        <Link href="/dashboard" className={cn(
          'group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
          pathname.startsWith('/dashboard')
            ? 'bg-primary/10 text-primary'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100',
        )}>
          <span className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
            pathname.startsWith('/dashboard')
              ? 'bg-primary text-white shadow-md shadow-primary/30'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary',
          )}>
            <LayoutDashboard size={17} strokeWidth={pathname.startsWith('/dashboard') ? 2.5 : 1.8} />
          </span>
          <span className="flex-1 font-semibold">Tableau de bord</span>
        </Link>

        {/* Collapsible sections */}
        {sections
          .filter(section => !(section.id === 'cabinet' && isInCabinet))
          .map(section => <Section key={section.id} section={section} />)}

        {/* Quick stats */}
        <div className="pt-4 pb-2">
          <div className="h-px bg-gray-100 dark:bg-white/5 mx-1 mb-4" />
          <div className="mx-1 px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={12} className="text-primary" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Factures</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Payées', value: invoices.filter(i => i.status === 'paid').length, color: 'text-primary' },
                { label: 'Attente', value: invoices.filter(i => i.status === 'sent').length, color: 'text-amber-500' },
                { label: 'Retard', value: overdueCount, color: overdueCount > 0 ? 'text-red-500' : 'text-gray-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors cursor-default">
                  <p className={cn('text-xl font-black', color)}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account section */}
        <div>
          <div className="h-px bg-gradient-to-r from-emerald-200/60 via-emerald-100/40 to-transparent dark:from-emerald-800/30 dark:via-emerald-900/10 mx-1 mb-3" />
          {[
            { href: '/settings', icon: Settings, label: 'Paramètres' },
            { href: '/help', icon: HelpCircle, label: 'Aide' },
            { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount : undefined },
          ].map(({ href, icon: Icon, label, badge }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                'group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100',
              )}>
                <span className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all',
                  active
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
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
      </nav>

      {/* Upgrade banner */}
      {shouldShowUpgrade && (
        <div className="px-4 mb-3 flex-shrink-0">
          <Link href={tierConfig.cta} className="group relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', tierConfig.gradient)} />
            <div className="relative flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 transition-transform group-hover:scale-110 group-hover:rotate-6">
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
        <div
          onClick={() => router.push(sub.tier === 'free' ? '/paywall' : '/settings')}
          className={cn(
            'relative overflow-hidden rounded-2xl p-3 mb-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border',
            sub.tier === 'free' && 'bg-gradient-to-br from-gray-300 to-gray-200 border-gray-400 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700',
            sub.tier === 'trial' && 'bg-gradient-to-br from-purple-300 to-purple-200 border-purple-400 dark:from-purple-900/30 dark:to-purple-800/20 dark:border-purple-700',
            (sub.tier === 'solo' || sub.tier === 'pro') && 'bg-gradient-to-br from-blue-300 to-blue-200 border-blue-400 dark:from-blue-900/30 dark:to-blue-800/20 dark:border-blue-700',
            sub.tier === 'business' && 'bg-gradient-to-br from-violet-300 to-violet-200 border-violet-400 dark:from-violet-900/30 dark:to-violet-800/20 dark:border-violet-700',
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              sub.tier === 'free' && 'bg-gray-400 dark:bg-gray-700',
              sub.tier === 'trial' && 'bg-purple-400 dark:bg-purple-800',
              (sub.tier === 'solo' || sub.tier === 'pro') && 'bg-blue-400 dark:bg-blue-800',
              sub.tier === 'business' && 'bg-violet-400 dark:bg-violet-800',
            )}>
              <tierConfig.icon size={18} className={tierConfig.iconColor} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{tierConfig.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {sub.tier === 'free' ? '10 factures gratuites/mois' : tierConfig.subtext}
              </p>
            </div>
            {sub.tier !== 'business' && <ArrowUpRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />}
          </div>
        </div>

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
            if (action === 'settings') router.push('/settings');
            if (action === 'profile') router.push('/settings');
            if (action === 'notifications') router.push('/notifications');
            if (action === 'help') router.push('/help');
            if (action === 'upgrade') router.push('/paywall');
            if (action === 'switch') {
              try { await signOut(); router.push('/login'); } catch {}
            }
          }}
        />

        <div className="flex items-center gap-2 mt-2 px-2">
          <KeyboardShortcutsHelp />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
