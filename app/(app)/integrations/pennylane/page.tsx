'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useIntegrationStore } from '@/stores/integrationStore';
import { cn } from '@/lib/utils';
import { formatSyncDate } from '@/lib/integration-helpers';
import { toast } from 'sonner';

export default function PennylanePage() {
  const { profile } = useAuthStore();
  const { integrations, fetchIntegrations, connectIntegration, syncIntegration, syncing, loading } = useIntegrationStore();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { fetchIntegrations(); }, []);

  const integration = integrations.find((i) => i.provider === 'pennylane');
  const isConnected = integration?.status === 'connected';

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setConnecting(true);
    try {
      await connectIntegration('pennylane', { api_key: apiKey.trim() });
      setApiKey('');
      toast.success('Pennylane connecté avec succès !');
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncIntegration('pennylane');
      toast.success('Synchronisation terminée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de synchronisation');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/integrations" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            📊 Pennylane
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configuration de l'intégration comptable</p>
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/30 p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <h3 className="font-bold text-green-800 dark:text-green-300">Connecté</h3>
                {integration?.config?.company_name && (
                  <p className="text-sm text-green-600 dark:text-green-400">{integration.config.company_name}</p>
                )}
              </div>
            </div>
            {integration?.last_synced_at && (
              <p className="text-xs text-green-600/70 dark:text-green-400/70">
                Dernière synchronisation : {formatSyncDate(integration.last_synced_at)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 hover:shadow-md transition-all text-left"
            >
              <RefreshCw size={20} className={cn('text-primary mb-3', syncing && 'animate-spin')} />
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Synchroniser</h4>
              <p className="text-xs text-gray-500 mt-1">Importer les fournisseurs depuis Pennylane</p>
            </button>

            <Link
              href="/expenses?export=pennylane"
              className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 hover:shadow-md transition-all"
            >
              <ArrowRight size={20} className="text-primary mb-3" />
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Exporter les dépenses</h4>
              <p className="text-xs text-gray-500 mt-1">Pousser les notes de frais vers Pennylane</p>
            </Link>

            <Link
              href="/documents/factures?export=pennylane"
              className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 hover:shadow-md transition-all"
            >
              <ArrowRight size={20} className="text-primary mb-3" />
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Exporter les factures</h4>
              <p className="text-xs text-gray-500 mt-1">Pousser les factures clients vers Pennylane</p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Connecter Pennylane</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Entrez votre clé API Pennylane pour connecter votre compte. Vous la trouverez dans les paramètres de votre compte Pennylane, section API.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clé API Pennylane</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={!apiKey.trim() || connecting}
              className={cn(
                'w-full px-6 py-3 rounded-xl font-bold text-sm text-white transition-all',
                apiKey.trim() && !connecting
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/20'
                  : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              )}
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Connexion en cours...
                </span>
              ) : (
                'Connecter'
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
