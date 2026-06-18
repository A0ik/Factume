'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Plug, Loader2, AlertCircle, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = {
  connected?: boolean;
  siren?: string | null;
  companyName?: string | null;
  env?: string | null;
  lastError?: string | null;
};

/**
 * Branchement de la plateforme de facturation SuperPDP (modèle marque grise).
 *
 * Flux OAuth Authorization Code : l'utilisateur connecte SON compte SuperPDP une
 * seule fois. Ensuite, chaque facture part automatiquement vers l'État via son
 * propre SIREN (token délégué). Cf. lib/superPdpClient.ts.
 */
export function SuperPdpConnect({
  variant = 'card',
  className,
}: {
  variant?: 'card' | 'compact';
  className?: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/superpdp/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/superpdp/connect');
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'Impossible de démarrer la connexion.');
        setConnecting(false);
        return;
      }
      // Redirection vers le tunnel d'inscription SuperPDP
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Erreur réseau.');
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Déconnecter votre plateforme de facturation ? Vos prochaines factures ne seront plus transmises automatiquement.')) return;
    try {
      await fetch('/api/superpdp/disconnect', { method: 'POST' });
      setStatus({ connected: false });
    } catch {
      setError('Déconnexion échouée.');
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-500', className)}>
        <Loader2 size={16} className="animate-spin" /> Vérification…
      </div>
    );
  }

  const connected = status?.connected;

  // ── Variant compact (badge seul) ───────────────────────────────────────
  if (variant === 'compact') {
    if (connected) {
      return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700', className)}>
          <ShieldCheck size={13} /> Facturation électronique active
        </span>
      );
    }
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className={cn('inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-60', className)}
      >
        {connecting ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
        Activer la facturation électronique
      </button>
    );
  }

  // ── Variant carte (onboarding / settings) ──────────────────────────────
  return (
    <div className={cn('rounded-2xl border p-5', connected ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white', className)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', connected ? 'bg-green-100' : 'bg-primary/10')}>
          {connected ? <ShieldCheck className="text-green-600" size={20} /> : <Plug className="text-primary" size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">
            {connected ? 'Facturation électronique activée' : 'Activez la facturation électronique 2026'}
          </h3>
          {connected ? (
            <p className="text-xs text-gray-600 mt-0.5">
              {status?.companyName ? `${status.companyName} ` : ''}
              {status?.siren ? `· SIREN ${status.siren} ` : ''}
              {status?.env === 'sandbox' ? '· bac à sable' : ''}
              <br />
              <span className="text-gray-500">Vos factures B2B partent automatiquement vers l'État.</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Obligatoire à partir de 2026. Branchez votre plateforme en 1 clic (vérification d'identité une seule fois),
              ensuite chaque facture est transmise automatiquement pour votre compte.
            </p>
          )}

          {error && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {connected ? (
              <button
                onClick={disconnect}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                <Unplug size={13} /> Déconnecter
              </button>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {connecting ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />}
                Connecter ma plateforme
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
