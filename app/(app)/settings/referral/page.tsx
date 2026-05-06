'use client';
import { useReferral } from '@/hooks/useReferral';
import { useAuthStore } from '@/stores/authStore';
import { Copy, Gift, Users, CheckCircle2, ArrowLeft, Loader2, Share2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default function ReferralPage() {
  const { profile } = useAuthStore();
  const { code, shareLink, stats, loading, generateCode } = useReferral();

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Lien copié !');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const handleShare = async () => {
    if (!shareLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Factu.me — Facturation simplifiée',
          text: 'Rejoins Factu.me et crée tes factures en 10 secondes avec la voix !',
          url: shareLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={14} /> Retour aux paramètres
      </Link>

      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-emerald-50 rounded-3xl p-8 border border-primary/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Parrainage</h1>
            <p className="text-sm text-gray-500">Gagnez 1 mois gratuit par ami inscrit</p>
          </div>
        </div>

        {!code ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Générez votre lien de parrainage unique</p>
            <Button onClick={generateCode} disabled={loading} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
              Générer mon lien
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Votre lien de parrainage</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 border border-gray-200 truncate"
                />
                <button onClick={handleCopy} className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Copy size={18} />
                </button>
                <button onClick={handleShare} className="p-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <Users size={20} className="mx-auto text-primary mb-2" />
                <p className="text-2xl font-black text-gray-900">{stats.totalReferrals}</p>
                <p className="text-xs text-gray-400">Invités</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <CheckCircle2 size={20} className="mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-black text-gray-900">{stats.completedReferrals}</p>
                <p className="text-xs text-gray-400">Inscrits</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <Gift size={20} className="mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-black text-gray-900">{stats.completedReferrals}</p>
                <p className="text-xs text-gray-400">Mois offerts</p>
              </motion.div>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-primary">Comment ça marche ?</span><br />
                Partagez votre lien avec des entrepreneurs. Chaque personne qui s'inscrit via votre lien vous donne droit à 1 mois gratuit sur votre abonnement.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
