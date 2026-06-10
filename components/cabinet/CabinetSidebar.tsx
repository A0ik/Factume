'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Briefcase, Calendar,
  ClipboardList, FileWarning, ArrowLeftRight, Building2,
  Settings, Bell, UserPlus, ChevronLeft, ChevronRight,
  Shield, HardHat, FileCheck, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCabinetStore } from '@/stores/cabinetStore';
import CabinetSwitcher from './CabinetSwitcher';

// ─── Navigation groups ──────────────────────────────────────────────
interface NavItem {
  href: string;
  icon: any;
  label: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/cabinet', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/cabinet/clients', icon: Users, label: 'Clients' },
      { href: '/cabinet/facturation', icon: FileText, label: 'Facturation' },
    ],
  },
  {
    title: 'Social',
    items: [
      { href: '/cabinet/paie', icon: Briefcase, label: 'Paie' },
      { href: '/cabinet/salaries', icon: HardHat, label: 'Salariés' },
      { href: '/cabinet/dsn', icon: Shield, label: 'DSN' },
      { href: '/cabinet/dpae', icon: FileCheck, label: 'DPAE' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/cabinet/contrats', icon: ClipboardList, label: 'Contrats' },
      { href: '/cabinet/missions', icon: Briefcase, label: 'Missions' },
      { href: '/cabinet/agenda', icon: Calendar, label: 'Agenda' },
    ],
  },
  {
    title: 'Fiscal',
    items: [
      { href: '/cabinet/echeances', icon: CalendarClock, label: 'Échéances' },
      { href: '/cabinet/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
    ],
  },
  {
    title: 'Juridique',
    items: [
      { href: '/cabinet/juridique', icon: FileWarning, label: 'Juridique' },
    ],
  },
  {
    items: [
      { href: '/cabinet/relances', icon: Bell, label: 'Relances' },
      { href: '/cabinet/invitations', icon: UserPlus, label: 'Invitations' },
      { href: '/cabinet/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────
interface CabinetSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function CabinetSidebar({ collapsed, onToggle }: CabinetSidebarProps) {
  const pathname = usePathname();
  const cabinet = useCabinetStore(state => state.cabinet);

  const isActive = (href: string) => {
    if (href === '/cabinet') return pathname === '/cabinet';
    return pathname.startsWith(href);
  };

  const primaryColor = cabinet?.primary_color || '#10b981';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-white/[0.06] bg-[#09090B] overflow-hidden flex-shrink-0 z-40"
    >
      {/* ─── Header ─── */}
      <div className={cn(
        'flex items-center gap-3 h-16 flex-shrink-0 border-b border-white/[0.06]',
        collapsed ? 'px-3 justify-center' : 'px-4'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {cabinet?.logo_url ? (
                <img src={cabinet.logo_url} alt="" className="w-5 h-5 rounded object-contain" />
              ) : (
                <Building2 size={18} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-100 truncate">{cabinet?.name || 'Cabinet'}</p>
              <p className="text-[10px] text-zinc-500">Expert-Comptable</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {cabinet?.logo_url ? (
              <img src={cabinet.logo_url} alt="" className="w-4 h-4 rounded object-contain" />
            ) : (
              <Building2 size={14} className="text-white" />
            )}
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ─── Cabinet Switcher ─── */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <CabinetSwitcher />
        </div>
      )}

      {/* ─── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-4')}>
            {group.title && !collapsed && (
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-2 mb-1.5">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
                      collapsed ? 'w-10 h-10 mx-auto justify-center' : 'h-10 px-3',
                      active
                        ? 'bg-white/[0.06] text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                    )}
                  >
                    {/* Active indicator */}
                    {active && (
                      <motion.div
                        layoutId="cabinet-nav-indicator"
                        className="absolute left-0 w-[3px] h-5 rounded-r-full"
                        style={{ backgroundColor: primaryColor }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <item.icon size={18} strokeWidth={active ? 2 : 1.6} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Footer ─── */}
      <div className={cn(
        'border-t border-white/[0.06] flex-shrink-0',
        collapsed ? 'p-2' : 'p-3'
      )}>
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors',
            collapsed ? 'w-10 h-10 mx-auto justify-center' : 'h-10 px-3'
          )}
        >
          <ArrowLeftRight size={16} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Retour à l'app</span>}
        </Link>
      </div>
    </motion.aside>
  );
}
