'use client';
import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Landmark, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useIntegrationStore } from '@/stores/integrationStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BankConnectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-gray-400" size={32} /></div>}>
      <BankConnectContent />
    </Suspense>
  );
}

function BankConnectContent() {
  const { profile } = useAuthStore();
  const { connectBank, fetchBankConnections, bankConnections } = useIntegrationStore();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    fetchBankConnections().catch((err) => console.error('Error fetching bank connections:', err));
  }, []);

  useEffect(() => {
    if (success === 'true') toast.success('Banque connectée avec succès !');
    if (error) toast.error('Erreur de connexion bancaire');
  }, [success, error]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const url = await connectBank();
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Impossible de générer le lien de connexion');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/banking" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Connecter ma banque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Import automatique de vos transactions bancaires</p>
        </div>
      </div>

      {bankConnections.filter((c) => c.status === 'active').length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/30 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <h3 className="font-bold text-green-800 dark:text-green-300">Banque connectée</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {bankConnections.filter((c) => c.status === 'active').map((c) => c.bank_name).join(', ')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {bankConnections.map((conn) => (
              <div key={conn.id} className={cn(
                'p-4 rounded-2xl border',
                conn.status === 'active'
                  ? 'bg-white/60 dark:bg-slate-900/60 border-green-200/60 dark:border-green-800/30'
                  : 'bg-white/40 dark:bg-slate-900/40 border-gray-200/60 dark:border-gray-700/30 opacity-60'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Landmark size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{conn.bank_name || 'Banque'}</p>
                      <p className="text-xs text-gray-500">
                        {conn.status === 'active' ? 'Connecté' : 'Déconnecté'}
                        {conn.last_synced_at && ` — Dernière sync: ${new Date(conn.last_synced_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/banking/transactions"
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    Voir les transactions
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            Connecter une autre banque
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/10 flex items-center justify-center mx-auto mb-6">
            <Landmark size={36} className="text-indigo-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Connexion bancaire sécurisée</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Connectez votre compte bancaire via Bridge pour importer automatiquement vos transactions.
            Vos identifiants sont chiffrés et ne sont jamais stockés en clair.
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className={cn(
              'px-8 py-3 rounded-2xl font-bold text-sm text-white transition-all',
              loading
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Connexion...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ExternalLink size={16} /> Connecter ma banque
              </span>
            )}
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Powered by Bridge — Agrégateur bancaire agréé par l'ACPR
          </p>
        </div>
      )}
    </motion.div>
  );
}
