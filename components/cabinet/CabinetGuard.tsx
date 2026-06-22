'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// LOI 3 (SENTINEL) : Tout état de chargement DOIT avoir une condition de sortie.
// MONOLITH LOI 1 : Le cabinet actif survit à F5, déconnexion, fermeture de navigateur.

// Garde-voix de sécurité : on ne laisse pas le fetch durer indéfiniment.
const FETCH_TIMEOUT_MS = 8_000;
// Nombre maximal de tentatives réseau avant abandon.
const MAX_RETRIES = 2;
// Backoff court entre retries (en cas d'erreur réseau). Ce n'est pas un délai
// « magique » d'attente de données : il sert uniquement à éviter de spammer
// l'API quand elle répond en erreur.
const RETRY_BACKOFF_MS = 800;

type Phase = 'idle' | 'fetching' | 'resolved' | 'failed';

export default function CabinetGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore(state => state.profile);
  const initialized = useAuthStore(state => state.initialized);
  const cabinet = useCabinetStore(state => state.cabinet);
  const loading = useCabinetStore(state => state.loading);
  const router = useRouter();
  const pathname = usePathname();

  // ── Références stables (pas de re-render) ──
  const redirected = useRef(false);            // Anti-double-redirection
  const fetchAttempt = useRef(0);              // Compteur de tentatives
  const startedFetch = useRef(false);          // Empêche un 2e lancement du cycle
  const isMountedRef = useRef(true);           // Empêche setState après unmount

  // ── États UI ──
  const [phase, setPhase] = useState<Phase>('idle');
  const [timedOut, setTimedOut] = useState(false);

  // Pages où l'on NE redirige jamais (l'utilisateur est déjà au bon endroit).
  const isOnCabinetEntry =
    pathname === '/cabinet' || pathname === '/cabinets';

  // ── Cleanup au démontage ──
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Helper : définit phase seulement si monté ──
  const safeSetPhase = (p: Phase) => {
    if (isMountedRef.current) setPhase(p);
  };

  // ── Helper : tente un fetch avec retries bornés (sans setTimeout magique pour attendre des données) ──
  const attemptFetch = async (): Promise<void> => {
    while (fetchAttempt.current <= MAX_RETRIES) {
      if (!isMountedRef.current) return;
      fetchAttempt.current += 1;
      try {
        await useCabinetStore.getState().fetchCabinet();
      } catch {
        // Erreur réseau — on retente si possible (backoff court).
      }
      const freshCabinet = useCabinetStore.getState().cabinet;
      if (freshCabinet) return; // succès
      if (fetchAttempt.current <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
      }
    }
  };

  // ── Effet maître : déclenche le fetch quand l'auth est prête, exactement une fois ──
  useEffect(() => {
    if (!initialized || !profile) return;
    if (startedFetch.current) return;
    startedFetch.current = true;

    let cancelled = false;

    (async () => {
      // 1. Hydrater depuis le cache localStorage (instantané) — évite tout flash.
      useCabinetStore.getState().hydrateFromCache();
      if (useCabinetStore.getState().cabinet) {
        safeSetPhase('resolved');
        return;
      }

      // 2. Fetch frais avec retries.
      safeSetPhase('fetching');
      await attemptFetch();
      if (cancelled || !isMountedRef.current) return;

      // 3. Issue : tentative de restauration depuis cache si fetch muet.
      if (!useCabinetStore.getState().cabinet) {
        try {
          const cached = typeof window !== 'undefined'
            ? localStorage.getItem('factume_cabinet_data')
            : null;
          if (cached) {
            useCabinetStore.setState({ cabinet: JSON.parse(cached) });
          }
        } catch {
          // Cache corrompu — on ignore.
        }
      }

      safeSetPhase('resolved');
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, profile]);

  // ── Timeout de sécurité (LOI 3) ──
  useEffect(() => {
    if (!initialized || !profile) return;
    if (phase !== 'fetching') return;

    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (phase !== 'fetching') return;
      console.warn('[CabinetGuard] Fetch timeout reached, forcing failure');
      setTimedOut(true);
      safeSetPhase('failed');
    }, FETCH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [initialized, profile, phase]);

  // ── Redirection : UNIQUE source de vérité, lancée une fois résolu/échoué ──
  useEffect(() => {
    // On ne redirige jamais pendant le fetch.
    if (phase !== 'resolved' && phase !== 'failed') return;
    if (!initialized || !profile) return;
    if (loading) return;
    if (redirected.current) return;
    if (isOnCabinetEntry) return;

    // Cabinet présent (store ou double-vérification) → pas de redirection.
    if (cabinet) return;
    const freshCabinet = useCabinetStore.getState().cabinet;
    if (freshCabinet) return;

    // Si on a un active_cabinet_id en cache mais pas de data, on laisse le
    // user retenter plutôt que de rediriger aveuglément (race condition auth).
    const activeId = typeof window !== 'undefined'
      ? localStorage.getItem('factume_active_cabinet_id')
      : null;
    if (activeId && phase === 'failed') {
      // Échec réseau probablement — on ne redirige pas vers /cabinet.
      return;
    }

    redirected.current = true;
    toast.error('Créez d\'abord votre cabinet');
    router.push('/cabinets');
  }, [phase, initialized, profile, loading, cabinet, router, isOnCabinetEntry]);

  // ── Rendus ──

  // Chargement tant que l'auth ou le fetch n'est pas terminé.
  if (!initialized || !profile || phase === 'idle' || phase === 'fetching' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // Timeout — proposer un retry.
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
            if (!isMountedRef.current) return;
            // Reset complet de l'état pour relancer un cycle propre.
            setTimedOut(false);
            redirected.current = false;
            fetchAttempt.current = 0;
            startedFetch.current = false;
            safeSetPhase('idle');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/80 text-white font-semibold text-sm"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  // Pas de cabinet après résolution — laisser l'enfant (page /cabinet) gérer l'affichage création.
  if (!cabinet) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
