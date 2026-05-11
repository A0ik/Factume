'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import Sidebar from '@/components/layout/Sidebar';
import MobileDrawer from '@/components/layout/MobileDrawer';
import { Logo } from '@/components/ui/Logo';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
import { TrialCountdown } from '@/components/ui/trial-countdown';
import { InvoiceCounter } from '@/components/ui/invoice-counter';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { Toaster } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, profile } = useAuthStore();
  const fetchInvoices = useDataStore(state => state.fetchInvoices);
  const fetchClients = useDataStore(state => state.fetchClients);
  const invoices = useDataStore(state => state.invoices);
  const { isFree, isTrialActive, invoiceCount } = useSubscription();
  const pathname = usePathname();
  const [showTrialBanner, setShowTrialBanner] = useState(true);
  const [showInvoiceCounter, setShowInvoiceCounter] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/login'); return; }
    fetchInvoices();
    fetchClients();
  }, [initialized, user, fetchInvoices, fetchClients]);

  // Handle Stripe payment success redirect — refresh profile to pick up new tier
  useEffect(() => {
    if (typeof window === 'undefined' || !initialized || !user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      import('@/stores/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().fetchProfile(user.id);
      });
    }
  }, [initialized, user]);

  // Hide banners on paywall and trial pages
  const hideBanners = pathname === '/paywall' || pathname === '/trial';

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <script dangerouslySetInnerHTML={{
        __html: `
        try {
          const t = localStorage.getItem('theme');
          if (t === 'dark') document.documentElement.classList.add('dark');
        } catch(e) {}
      ` }} />
      <Toaster position="top-right" richColors closeButton />
      <ServiceWorkerRegistration />
      <CommandPalette />
      <AutoSaveIndicator />

      {/* Trial Countdown Banner - shows for active trial users */}
      {isTrialActive && showTrialBanner && !hideBanners && (
        <TrialCountdown onClose={() => setShowTrialBanner(false)} />
      )}

      {/* Invoice Counter - shows for free users */}
      {isFree && showInvoiceCounter && !hideBanners && (
        <InvoiceCounter
          invoiceCount={invoiceCount}
          maxInvoices={10}
          onClose={() => setShowInvoiceCounter(false)}
        />
      )}

      {/* Upgrade Banner - shows for free users on specific pages */}
      {isFree && !hideBanners && pathname === '/invoices' && (
        <div className="container mx-auto px-4 lg:px-8 pt-4">
          <UpgradeBanner
            type="limit"
            buttonText="Activer l'essai gratuit"
            description="7 jours d'accès complet à toutes les fonctionnalités"
            onClick={() => router.push('/trial')}
            onClose={() => setShowInvoiceCounter(false)}
          />
        </div>
      )}

      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          {/* Mobile top bar - Enhanced with logo */}
          <div className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-slate-700/80 px-4 py-3 flex items-center justify-between shadow-sm">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-slate-800 dark:to-slate-700/80 hover:from-gray-200 hover:to-gray-300/80 dark:hover:from-slate-700 dark:hover:to-slate-600/80 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 active:scale-95 -ml-1"
              aria-label="Menu navigation"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
              <Logo size="sm" variant="icon" />
            </Link>
            <div className="w-10" />
          </div>

          <div className={cn(
            "flex-1 w-full mx-auto px-4 lg:px-8 py-5 lg:py-6",
            pathname === '/paywall' || pathname === '/calendar' || pathname === '/ocr' || pathname === '/expenses/analytics' || pathname === '/expenses/export' || pathname === '/expenses/approvals' || pathname.startsWith('/cabinet') || pathname.startsWith('/banking/transactions')
              ? "max-w-[1800px]"
              : pathname.startsWith('/contracts')
              ? "max-w-[1400px]"
              : "max-w-5xl"
          )}>
            {children}
          </div>
        </main>

        {/* Mobile slide-out drawer */}
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </>
  );
}
