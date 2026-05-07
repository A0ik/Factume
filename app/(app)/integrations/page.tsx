'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Plug, ExternalLink, Check, X as XIcon, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useIntegrationStore } from '@/stores/integrationStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { getStatusColor, getStatusLabel, formatSyncDate, getIntegrationProvider } from '@/lib/integration-helpers';
import type { Integration } from '@/types';


const INTEGRATIONS = [
  { provider: 'pennylane' as const, enabled: true },
  { provider: 'sage' as const, enabled: false },
  { provider: 'bridge' as const, enabled: false },
];

export default function IntegrationsPage() {
  const { profile } = useAuthStore();
  const { integrations, fetchIntegrations, loading, syncing, syncIntegration, disconnectIntegration } = useIntegrationStore();
  const sub = useSubscription();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => { fetchIntegrations(); }, []);

  const getIntegration = (provider: string): Integration | undefined =>
    integrations.find((i) => i.provider === provider);

  const handleDisconnect = async (provider: string) => {
    setDisconnecting(provider);
    try { await disconnectIntegration(provider); } finally { setDisconnecting(null); }
  };

  const handleSync = async (provider: string) => {
    await syncIntegration(provider);
  };

  if (!sub.effectiveIsPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Plug size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Connexions</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Connectez FACTU.ME à vos outils comptables et bancaires. Disponible avec l'abonnement Pro.
        </p>
        <Link href="/paywall?plan=pro" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">
          Passer à Pro
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Connexions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gérez vos intégrations comptables et bancaires</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {INTEGRATIONS.map(({ provider, enabled }) => {
          const info = getIntegrationProvider(provider);
          const integration = getIntegration(provider);
          const isConnected = integration?.status === 'connected';

          return (
            <motion.div
              key={provider}
              className={cn(
                'relative rounded-2xl border overflow-hidden transition-all',
                isConnected
                  ? 'bg-white/60 dark:bg-slate-900/60 border-green-200/60 dark:border-green-800/30'
                  : 'bg-white/40 dark:bg-slate-900/40 border-gray-200/60 dark:border-gray-700/30',
                !enabled && 'opacity-60'
              )}
              whileHover={enabled ? { scale: 1.005 } : undefined}
            >
              <div className="p-5 flex items-center gap-4">
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl', info.color)}>
                  {info.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{info.name}</h3>
                    {isConnected && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Connecté
                      </span>
                    )}
                    {!enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{info.description}</p>
                  {isConnected && integration?.last_synced_at && (
                    <p className="text-xs text-gray-400 mt-1">Dernière sync : {formatSyncDate(integration.last_synced_at)}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isConnected && (
                    <>
                      <button
                        onClick={() => handleSync(provider)}
                        disabled={syncing}
                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Synchroniser"
                      >
                        <RefreshCw size={16} className={cn(syncing && 'animate-spin')} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(provider)}
                        disabled={disconnecting === provider}
                        className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors disabled:opacity-50"
                        title="Déconnecter"
                      >
                        {disconnecting === provider ? <Loader2 size={16} className="animate-spin" /> : <XIcon size={16} />}
                      </button>
                      {provider === 'pennylane' && (
                        <Link
                          href="/integrations/pennylane"
                          className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
                        >
                          Configurer
                        </Link>
                      )}
                    </>
                  )}
                  {!isConnected && enabled && (
                    <Link
                      href={`/integrations/${provider}`}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      Connecter
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
