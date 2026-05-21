'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, AlertTriangle, Plus, Loader2, Shield,
  ChevronRight, Crown, Settings, UserPlus, RefreshCw,
  CheckCircle2, Clock, XCircle, Building2, Euro, Users, Landmark,
  FileText, Calendar, Bell, Briefcase, Download, Activity as ActivityIcon,
  Heart, ClipboardList, FileBadge, Receipt, UsersRound,
  X, Menu, Gavel, FileSpreadsheet, Scale, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/cabinet', label: 'Dashboard', icon: Building2 },
  { href: '/cabinet/clients', label: 'Clients', icon: Users },
  { href: '/cabinet/salaries', label: 'Salaries', icon: UsersRound },
  { href: '/cabinet/contrats', label: 'Contrats', icon: ClipboardList },
  { href: '/cabinet/paie', label: 'Paie', icon: Receipt },
  { href: '/cabinet/dpae', label: 'DPAE', icon: FileBadge },
  { href: '/cabinet/dsn', label: 'DSN', icon: Shield },
  { href: '/cabinet/analytics', label: 'Analyses', icon: BarChart3 },
  { href: '/cabinet/facturation', label: 'Facturation', icon: FileText },
  { href: '/cabinet/relances', label: 'Relances', icon: Bell },
  { href: '/cabinet/reconciliation', label: 'Rapprochement', icon: Landmark },
  { href: '/cabinet/missions', label: 'Missions', icon: Briefcase },
  { href: '/cabinet/agenda', label: 'Agenda', icon: Calendar },
  { href: '/cabinet/echeances', label: 'Echeances', icon: Clock },
  { href: '/cabinet/social', label: 'Social', icon: Heart },
  { href: '/cabinet/invitations', label: 'Invitations', icon: UserPlus },
  { href: '/cabinet/juridique', label: 'Juridique', icon: Scale },
  { href: '/cabinet/settings', label: 'Parametres', icon: Settings },
];

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const isActive = (href: string) => href === '/cabinet' ? pathname === '/cabinet' : pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex flex-1 min-h-0 -mx-4 lg:-mx-8 -my-5 lg:-my-6">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-gray-200/70 dark:border-gray-700/40 bg-white/50 dark:bg-slate-900/50 overflow-y-auto">
        <div className="p-3 pt-4">
          <Link href="/cabinet" className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <Building2 size={15} className="text-white" />
            </div>
            <span className="font-black text-sm text-gray-900 dark:text-white">Cabinet</span>
          </Link>
        </div>
        <nav className="flex-1 px-2 pb-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-[53px] left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-700/80 px-4 py-2 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-semibold"
        >
          <Menu size={14} />
          Cabinet
        </button>
        <Link
          href="/cabinet"
          className="flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <Building2 size={13} />
          Dashboard
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-700/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <Building2 size={15} className="text-white" />
                  </div>
                  <span className="font-black text-sm text-gray-900 dark:text-white">Cabinet</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto px-4 lg:px-6 py-5 lg:py-6 pt-14 lg:pt-6">
        {children}
      </div>
    </div>
  );
}
