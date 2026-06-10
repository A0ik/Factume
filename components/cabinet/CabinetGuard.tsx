'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// LOI 3 (SENTINEL) : Tout état de chargement DOIT avoir une condition de sortie.
// MONOLITH LOI 1 : Le cabinet actif survit à F5, déconnexion, fermeture de navigateur.
const FETCH_TIMEOUT_MS = 8_000;  // 8s max loading
const MAX_RETRIES = 2;           // Réessayer 2 fois avant de déclarer forfait

export default function CabinetGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore(state => state.profile);
  const initialized = useAuthStore(state => state.initialized);
  const cabinet = useCabinetStore(state => state.cabinet);
  const loading = useCabinetStore(state => state.loading);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  const fetchAttempt = useRef(0);
  const [fetchDone, setFetchDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // ── MONOLITH: Fetch cabinet avec retry automatique ──
  const attemptFetch = async () => {
    if (fetchAttempt.current > MAX_RETRIES) {
      setFetchDone(true);
      return;
    }
    fetchAttempt.current++;
    try {
      await useCabinetStore.getState().fetchCabinet();
    } catch {
      // Network error — retry will handle
    }
    // Vérifier si on a un cabinet maintenant
    const freshCabinet = useCabinetStore.getState().cabinet;
    if (freshCabinet) {
      setFetchDone(true);
      return;
    }
    // Si on a encore des retries, réessayer
    if (fetchAttempt.current <= MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1500));
      return attemptFetch();
    }
    setFetchDone(true);
  };

  // Fetch cabinet data once when auth is ready
  useEffect(() => {
    if (initialized && profile && fetchAttempt.current === 0) {
      // MONOLITH: Hydrater depuis le cache en premier (instantané)
      useCabinetStore.getState().hydrateFromCache();
      // Puis fetch frais depuis le serveur (avec retry)
      attemptFetch();
    }
  }, [initialized, profile]);

  // LOI 3 : Timeout de sécurité
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

  // Redirect to cabinet creation ONLY after exhaustive checks
  useEffect(() => {
    if (
      !initialized ||
      !profile ||
      !fetchDone ||
      loading ||
      redirected.current ||
      pathname === '/cabinet' ||
      pathname === '/cabinets'
    ) return;

    // Si on a déjà un cabinet (du cache ou du fetch), ne pas rediriger
    if (cabinet) return;

    // MONOLITH: Double-vérification aggressive avant de rediriger
    const freshCabinet = useCabinetStore.getState().cabinet;
    if (freshCabinet) return;

    const cachedCabinet = typeof window !== 'undefined' ? localStorage.getItem('factume_cabinet_data') : null;
    if (cachedCabinet) {
      // Restaurer depuis le cache plutôt que rediriger
      try {
        useCabinetStore.setState({ cabinet: JSON.parse(cachedCabinet) });
        return;
      } catch {}
    }

    // MONOLITH: Triple-vérification — tenter un dernier fetch avant abandon
    // (le fetch initial a pu échouer à cause d'une race condition auth)
    const activeId = typeof window !== 'undefined' ? localStorage.getItem('factume_active_cabinet_id') : null;
    if (activeId && fetchAttempt.current <= MAX_RETRIES) {
      // On a un ID actif mais pas de data — retenter
      redirected.current = false; // Ne pas rediriger, laisser le retry faire
      return;
    }

    // SEULEMENT là, on redirige vers la création
    redirected.current = true;
    toast.error('Créez d\'abord votre cabinet');
    router.push('/cabinet');
  }, [initialized, profile, fetchDone, loading, cabinet, router, pathname]);

  // Loading state while fetching
  if (!profile || !fetchDone || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // LOI 7 : Timed out — show error with retry
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
            fetchAttempt.current = 0;
            redirected.current = false;
            attemptFetch();
          }}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/80 text-white font-semibold text-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          Réessayer
        </button>
      </div>
    );
  }

  // No cabinet — show creation page or redirect
  if (!cabinet) {
    if (pathname !== '/cabinet' && pathname !== '/cabinets') {
      if (!redirected.current) {
        redirected.current = true;
        router.push('/cabinets');
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
