'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { ShieldCheck, FileText, Loader2 } from 'lucide-react';

/**
 * ARGOS (CIBLE 1) — Écran d'acceptation opposable des CGU/CGV.
 * Atteignable par tout utilisateur authentifié n'ayant pas encore accepté (le middleware
 * y redirige). Non-authentifiés → /login. Déjà accepté → /dashboard.
 */
export default function AcceptCguPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [acceptCgv, setAcceptCgv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setChecking(false); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('cgu_accepted, onboarding_done')
        .eq('id', user.id)
        .single();
      if (profile?.cgu_accepted === true) {
        router.replace(profile.onboarding_done ? '/dashboard' : '/onboarding/quick');
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  const canSubmit = acceptCgu && acceptCgv && !submitting;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/accept-cgu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      router.replace('/onboarding/quick');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue.');
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-[#0a0a0c] dark:to-[#111113]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-[#0a0a0c] dark:to-[#111113] p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#15151a] rounded-2xl shadow-xl border border-gray-200 dark:border-white/[0.08] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conditions d'utilisation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dernière étape avant de commencer</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          Pour utiliser Factu.me, vous devez accepter nos Conditions Générales d'Utilisation (CGU)
          et nos Conditions Générales de Vente (CGV). Votre acceptation est horodatée et conservée
          comme preuve.
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <input
              type="checkbox"
              checked={acceptCgu}
              onChange={(e) => setAcceptCgu(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              J'ai lu et j'accepte les{' '}
              <Link href="/legal/cgu" target="_blank" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                Conditions Générales d'Utilisation
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
            <input
              type="checkbox"
              checked={acceptCgv}
              onChange={(e) => setAcceptCgv(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              J'ai lu et j'accepte les{' '}
              <Link href="/legal/cgv" target="_blank" className="font-medium text-emerald-700 dark:text-emerald-400 underline">
                Conditions Générales de Vente
              </Link>
              <FileText className="inline w-3.5 h-3.5 ml-1 text-gray-400" />
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-white/[0.08] disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accepter et continuer'}
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
         Politique de confidentialité disponible{' '}
          <Link href="/legal/confidentialite" target="_blank" className="underline">ici</Link>.
        </p>
      </div>
    </div>
  );
}
