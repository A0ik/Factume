'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// /cabinet/accept-accountant?token=...
// Page d'atterrissage du magic link comptable.
// Gère : non-connecté (redirect /login), chargement, succès, erreur.
// ---------------------------------------------------------------------------

type Status = 'loading' | 'success' | 'error' | 'needs-login';

interface ResultState {
  status: Status;
  message?: string;
  cabinetName?: string;
}

function AcceptAccountantInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { profile, initialized } = useAuthStore();
  const startedRef = useRef(false);
  const [state, setState] = useState<ResultState>({ status: 'loading' });

  // ── Pas de token valide dans l'URL ──
  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: 'Le lien d\'invitation est incomplet. Demandez au cabinet de vous renvoyer une invitation.',
      });
    }
  }, [token]);

  // ── Redirection vers /login si non authentifié ──
  useEffect(() => {
    if (!initialized || !token) return;
    // Pas de profil après initialisation = non connecté.
    if (!profile) {
      const returnUrl = encodeURIComponent(`/cabinet/accept-accountant?token=${token}`);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [initialized, profile, token, router]);

  // ── Appel API d'acceptation une fois authentifié ──
  useEffect(() => {
    if (!token || !initialized || !profile) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cabinet/accept-accountant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.success) {
          setState({
            status: 'success',
            cabinetName: data.cabinetName,
          });
        } else {
          setState({
            status: 'error',
            message: data?.error || 'Impossible d\'accepter l\'invitation.',
          });
        }
      } catch {
        if (cancelled) return;
        setState({
          status: 'error',
          message: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token, initialized, profile]);

  // ── Rendus par état ──
  if (state.status === 'loading') {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <Loader2 size={28} className="text-emerald-400 animate-spin" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Validation de l&apos;invitation…</h1>
        <p className="text-gray-500 dark:text-gray-400">Nous vérifions votre invitation.</p>
      </Shell>
    );
  }

  if (state.status === 'success') {
    return (
      <Shell>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Bienvenue dans le cabinet</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {state.cabinetName
            ? <>Vous avez rejoint le cabinet <strong className="text-gray-900 dark:text-white">{state.cabinetName}</strong> en tant que comptable.</>
            : 'Vous avez rejoint le cabinet en tant que comptable.'}
        </p>
        <button
          onClick={() => router.push('/cabinet')}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/15 hover:bg-emerald-400 transition-colors"
        >
          Accéder au cabinet <ArrowRight size={16} />
        </button>
      </Shell>
    );
  }

  // error
  return (
    <Shell>
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20">
        <AlertTriangle size={40} className="text-amber-400" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Invitation impossible</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-md">
        {state.message || 'Une erreur est survenue.'}
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-md"
      >
        <div className="mb-6 flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10">
          <Building2 size={22} className="text-emerald-400" />
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function AcceptAccountantPage() {
  // useSearchParams doit être encapsulé dans <Suspense> en Next.js App Router.
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 size={28} className="text-emerald-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Chargement…</h1>
        </Shell>
      }
    >
      <AcceptAccountantInner />
    </Suspense>
  );
}
