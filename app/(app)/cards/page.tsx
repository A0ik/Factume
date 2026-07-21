'use client';
// ---------------------------------------------------------------------------
// HERMÈS CIBLE 3 — Page « Mes cartes » (carte bancaire pro).
// Le programme d'émission de cartes est en cours d'activation : la page affiche
// un état « Bientôt disponible » honnête. Réservé Pro & Business.
// (Le pont Stripe Issuing est en place côté API ; il s'activera à l'approbation
//  du card program — rien à recoder.)
// ---------------------------------------------------------------------------
import { motion } from 'framer-motion';
import { CreditCard, Shield, Sparkles, Bell, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CardsPage() {
  const sub = useSubscription();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const allowed = sub.gated('issuingCard');

  const cardCls = isDark
    ? 'bg-white/[0.04] border border-white/[0.08]'
    : 'bg-white border border-gray-200 shadow-sm';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <CreditCard size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Mes cartes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Carte bancaire pro</p>
        </div>
      </div>

      {/* Pas Pro/Business */}
      {!allowed && (
        <div className={cn('rounded-2xl p-5 flex items-start gap-3', isDark ? 'bg-emerald-500/[0.07] border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200')}>
          <Sparkles size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-gray-900 dark:text-white">Réservé Pro & Business</p>
            <p className="text-gray-600 dark:text-gray-300 mt-0.5">Passez au plan Pro pour accéder à la carte bancaire pro dès son lancement.</p>
          </div>
        </div>
      )}

      {/* Bientôt disponible */}
      {allowed && (
        <>
          <div className={cn('relative overflow-hidden rounded-3xl p-8 sm:p-10', cardCls)}>
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5">
                <Bell size={12} /> Bientôt disponible
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Votre carte bancaire pro arrive.
              </h2>
              <p className={cn('mt-3 text-sm leading-relaxed max-w-md', isDark ? 'text-zinc-400' : 'text-gray-600')}>
                Une carte pensée pour les indépendants & TPE : paiements en ligne et en boutique,
                suivi des dépenses, et intégration native à votre comptabilité Factu.me.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { Icon: CreditCard, title: 'Virtuelle & physique', desc: 'Pour le web comme pour le terrain' },
                  { Icon: Shield, title: 'Sécurisée', desc: 'Contrôles de dépenses en temps réel' },
                  { Icon: Lock, title: 'Sans engagement', desc: 'Frais unique à la commande' },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} className={cn('rounded-2xl p-4', isDark ? 'bg-white/[0.03]' : 'bg-gray-50')}>
                    <Icon size={18} className="text-emerald-500 mb-2" />
                    <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{title}</p>
                    <p className={cn('text-[11px] mt-0.5', isDark ? 'text-zinc-500' : 'text-gray-500')}>{desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => toast.success('Vous serez notifié dès le lancement de la carte.')}
                className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Bell size={15} /> Prévenez-moi au lancement
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 dark:text-zinc-500 px-1">
            L&apos;émission de cartes est soumise à l&apos;activation du programme partenaire. La fonctionnalité s&apos;affichera ici automatiquement dès qu&apos;elle sera disponible.
          </p>
        </>
      )}
    </motion.div>
  );
}
