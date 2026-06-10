'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// LOI 3 (SENTINEL) : Tout état de chargement DOIT avoir une condition de sortie.
// LOI 7 (SENTINEL) : Si le cabinet n'est pas trouvé, l'app ne crash pas en 404 dur.
const FETCH_TIMEOUT_MS = 12_000; // 12 seconds max loading

export default function CabinetGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore(state => state.profile);
  const initialized = useAuthStore(state => state.initialized);
  const cabinet = useCabinetStore(state => state.cabinet);
  const loading = useCabinetStore(state => state.loading);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  const fetched = useRef(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Fetch cabinet data once when auth is ready
  useEffect(() => {
    if (initialized && profile && !fetched.current) {
      fetched.current = true;
      useCabinetStore.getState().hydrateFromCache();
      useCabinetStore.getState().fetchCabinet().then(() => {
        setFetchDone(true);
      }).catch(() => {
        // Network error — still mark as done, use cached data
        setFetchDone(true);
      });
    }
  }, [initialized, profile]);

  // LOI 3 : Timeout de sécurité — empêche le chargement infini
  useEffect(() => {
    if (!initialized || !profile) return;

    const timer = setTimeout(() => {
      if (!fetchDone) {
        console.warn('[CabinetGuard] Fetch timeout reached, forcing fetchDone');
        setFetchDone(true);
        setTimedOut(true);
      }
    }, FETCH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [initialized, profile, fetchDone]);

  // Redirect to cabinet creation only if fetch succeeded and no cabinet
  // Also check localStorage cache before redirecting (prevents false redirect after creation)
  useEffect(() => {
    if (
      initialized &&
      profile &&
      fetchDone &&
      !loading &&
      !cabinet &&
      !redirected.current &&
      pathname !== '/cabinet'
    ) {
      // Double-check: maybe the store was updated between renders
      const freshCabinet = useCabinetStore.getState().cabinet;
      const cachedCabinet = typeof window !== 'undefined' ? localStorage.getItem('factume_cabinet_data') : null;
      if (!freshCabinet && !cachedCabinet) {
        redirected.current = true;
        toast.error('Créez d\'abord votre cabinet');
        router.push('/cabinet');
      } else if (cachedCabinet && !freshCabinet) {
        // Restore from cache
        try {
          useCabinetStore.setState({ cabinet: JSON.parse(cachedCabinet) });
        } catch {}
      }
    }
  }, [initialized, profile, fetchDone, loading, cabinet, router, pathname]);

  // Loading state while fetching (with timeout protection)
  if (!profile || !fetchDone || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // LOI 7 : Timed out — show error with retry, not infinite spinner
  if (timedOut && !cabinet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-amber-400" />
        </div>
        <p className="text-zinc-100 font-semibold mb-1">Chargement trop long</p>
        <p className="text-sm text-zinc-500 mb-5">
          La récupération du cabinet prend plus de temps que prévu.
        </p>
        <button
          onClick={() => {
            setTimedOut(false);
            setFetchDone(false);
            fetched.current = false;
            redirected.current = false;
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/80 text-white font-semibold text-sm"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  // No cabinet — show creation page or redirect
  if (!cabinet) {
    if (pathname !== '/cabinet') {
      if (!redirected.current) {
        redirected.current = true;
        router.push('/cabinet');
      }
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="text-primary animate-spin" />
        </div>
      );
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
