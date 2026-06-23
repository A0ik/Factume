'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight, Building2, LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import CabinetLogo from '@/components/cabinet/CabinetLogo';
import { toast } from 'sonner';

// PROMÉTHÉE — Page d'acceptation d'une invitation cabinet par lien tokenisé.
// Flux : résout le token (public) → si non connecté, /login puis retour →
// si connecté, propose d'accepter → POST accept (insère cabinet_members role=client)
// → redirige vers /cabinet (le gérant voit ENFIN les données de son cabinet).

type Phase = 'loading' | 'ready' | 'accepting' | 'accepted' | 'error';

interface Resolved {
  cabinetName: string;
  primaryColor: string;
  logoUrl: string | null;
  role: string;
}

export default function CabinetInviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { profile, initialized } = useAuthStore();
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [error, setError] = useState<string>('');

  // 1. Résoudre le token (public).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cabinet/invitations/resolve?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          setError(data?.error || 'Lien invalide ou expiré.');
          return;
        }
        setResolved(data);
        setPhase('ready');
      } catch {
        if (cancelled) return;
        setPhase('error');
        setError('Erreur réseau. Vérifiez votre connexion.');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // 2. Rediriger vers /login si non authentifié (avec retour ici).
  useEffect(() => {
    if (!initialized) return;
    if (!profile) {
      const returnUrl = encodeURIComponent(`/cabinet/invite/${token}`);
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [initialized, profile, token, router]);

  // 3. Accepter automatiquement si déjà connecté et token valide (UX fluide).
  //    On ne le fait PAS auto : on laisse l'utilisateur confirmer explicitement
  //    (le bouton "Rejoindre ce cabinet" déclenche acceptAccept).
  const handleAccept = async () => {
    setPhase('accepting');
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const returnUrl = encodeURIComponent(`/cabinet/invite/${token}`);
        router.replace(`/login?returnUrl=${returnUrl}`);
        return;
      }
      const res = await fetch('/api/cabinet/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPhase('error');
        setError(data?.error || 'Impossible d\'accepter l\'invitation.');
        return;
      }
      setPhase('accepted');
      toast.success('Vous avez rejoint le cabinet');
      // Laisser le succès s'afficher, puis rediriger.
      setTimeout(() => router.push('/cabinet'), 900);
    } catch {
      setPhase('error');
      setError('Erreur réseau. Réessayez.');
    }
  };

  // Loading
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Vérification de l&apos;invitation…</p>
      </div>
    );
  }

  // Erreur
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20">
          <AlertTriangle size={40} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Invitation impossible</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">{error}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // En attente de connexion
  if (initialized && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
          <LogIn size={36} className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Connexion requise</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Redirection vers la connexion… Vous reviendrez ici automatiquement pour rejoindre le cabinet.
        </p>
        <Loader2 size={20} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Accepted
  if (phase === 'accepted') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20"
        >
          <CheckCircle2 size={40} className="text-emerald-500" />
        </motion.div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Bienvenue !</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Vous avez rejoint le cabinet. Redirection…</p>
      </div>
    );
  }

  // Ready — proposer l'acceptation
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 p-8 text-center shadow-sm"
      >
        <div className="flex justify-center mb-5">
          <CabinetLogo logoUrl={resolved?.logoUrl} color={resolved?.primaryColor} size={56} iconSize={28} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Invitation au cabinet</p>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{resolved?.cabinetName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">
          Vous avez été invité à rejoindre ce cabinet en tant que{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">client</span>. Vous aurez accès à vos
          factures, devis et documents gérés par votre expert-comptable.
        </p>
        <button
          onClick={handleAccept}
          disabled={phase === 'accepting'}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/15 hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {phase === 'accepting' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {phase === 'accepting' ? 'Connexion en cours…' : 'Rejoindre ce cabinet'}
        </button>
        <Link
          href="/dashboard"
          className="block mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Plus tard
        </Link>
      </motion.div>
    </div>
  );
}
