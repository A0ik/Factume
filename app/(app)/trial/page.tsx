'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Crown, Shield, RefreshCw, CreditCard, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import { PricingSection, type PricingPlan, type Billing } from '@/components/ui/PricingSection';
import CheckoutModal, { type CheckoutMode } from '@/components/ui/CheckoutModal';
import { PLANS } from '@/lib/plans';

/* ═══════════════════════════════════════════════════════════════
   AEGIS — /trial refonte
   ───────────────────────────────────────────────────────────────
   AVANT : page « AI slop » (bg-black hardcodé, halo 600px, glow
   shadow-[0_0_50px], scale-105) déconnectée de la charte du site.
   APRÈS : réutilisation du MÊME composant <PricingSection> que
   /paywall → source de vérité unique, charte OBSIDIAN (#09090B),
   typographie Inter d'origine, accent émeraude unique, responsive
   strict. Aucun effet décoratif artificiel.
   ═══════════════════════════════════════════════════════════════ */

export default function TrialPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // Annuel par défaut (levier de conversion).
  const [billing, setBilling] = useState<Billing>('yearly');
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkout, setCheckout] = useState<{
    open: boolean;
    mode: CheckoutMode;
    planId: 'pro' | 'business';
  }>({ open: false, mode: 'payment', planId: 'pro' });

  /* ─── Plans alimentés par lib/plans (single source of truth) ─── */
  const pricingPlans: PricingPlan[] = [
    {
      id: 'free',
      name: PLANS.free.name,
      description: 'Pour démarrer et tester Factu.me',
      priceMonthly: 0,
      priceYearly: 0,
      priceYearlyMonthlyEq: 0,
      features: [
        '3 factures / mois',
        '3 devis / mois',
        'Dictée vocale IA illimitée',
        '1 cabinet · 10 clients CRM',
        'Accès mobile & web',
      ],
      buttonText: 'Commencer gratuitement',
      isCurrent: sub.tier === 'free',
      isFreeAction: true,
    },
    {
      id: 'pro',
      name: PLANS.pro.name,
      description: 'Le couteau suisse des indépendants & TPE',
      priceMonthly: PLANS.pro.priceMonthly,
      priceYearly: PLANS.pro.priceYearly,
      priceYearlyMonthlyEq: PLANS.pro.priceYearly / 12,
      features: [
        'Factures & devis illimités',
        'Facture électronique B2B',
        'Contrats de travail (CDI/CDD)',
        'Notes de frais + scan simple',
        'URSSAF One-Click',
        'Export comptable (FEC, CSV)',
        'Support prioritaire',
      ],
      buttonText: 'Choisir Pro',
      isPopular: true,
      isCurrent: sub.tier === 'pro',
    },
    {
      id: 'business',
      name: PLANS.business.name,
      description: 'Pour les PME & experts-comptables',
      priceMonthly: PLANS.business.priceMonthly,
      priceYearly: PLANS.business.priceYearly,
      priceYearlyMonthlyEq: PLANS.business.priceYearly / 12,
      features: [
        'Tout le plan Pro',
        'OCR multi-factures (type Dext)',
        '5 cabinets',
        'Comptable Connect',
        'Copilot Factu IA avancé',
        'Multi-utilisateur (5)',
        'Support dédié',
      ],
      buttonText: 'Choisir Business',
      isCurrent: sub.tier === 'business',
    },
  ];

  /* ─── CTA : ouverture du tunnel on-site ─── */
  const handleSelect = (planId: string) => {
    if (planId === 'free') {
      router.push(profile?.id ? '/dashboard' : '/register');
      return;
    }
    if (planId === sub.tier && !sub.isTrialActive) return;

    const hasRealStripeSubscription = !sub.isFree && !!profile?.stripe_subscription_id;
    setCheckout({
      open: true,
      mode: hasRealStripeSubscription ? 'change' : 'payment',
      planId: planId as 'pro' | 'business',
    });
  };

  /* ─── Essai 7j carte requise (SetupIntent) ─── */
  const handleTrial = () => {
    setTrialLoading(true);
    setCheckout({ open: true, mode: 'setup', planId: 'pro' });
    setTimeout(() => setTrialLoading(false), 500);
  };

  const showTrialCta = sub.isFree && !sub.isTrialActive;

  return (
    <div className={cn(
      'min-h-screen pb-24 pt-6 md:pt-8',
      isDark ? 'bg-[#09090B]' : 'bg-gradient-to-br from-gray-50 via-white to-emerald-50/30',
    )}>
      <div className="px-4 sm:px-6 lg:px-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          onClick={router.back}
          className={cn(
            'mb-6 inline-flex items-center gap-2 text-sm transition-colors',
            isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-900',
          )}
        >
          <ArrowLeft size={14} /> Retour
        </motion.button>

        {/* ═══ BANNIÈRE CONTEXTUELLE ═══ */}
        {sub.isTrialActive ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className={cn(
              'mx-auto mb-6 block w-full max-w-3xl rounded-2xl border-2 p-5',
              isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50',
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <Sparkles size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={cn('mb-1 text-lg font-bold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  Votre essai est en cours
                </h3>
                <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-600')}>
                  Souscrivez maintenant pour conserver toutes vos fonctionnalités Pro après l&apos;essai. Annulable à tout moment.
                </p>
              </div>
            </div>
          </motion.div>
        ) : showTrialCta ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            onClick={handleTrial}
            disabled={trialLoading}
            className={cn(
              'mx-auto mb-6 block w-full max-w-3xl rounded-2xl border-2 p-5 text-left transition-all',
              isDark
                ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10'
                : 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-emerald-50 shadow-xl shadow-emerald-200/50 hover:shadow-2xl',
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                {trialLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className={cn('text-lg font-bold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                    Essai Gratuit 7 Jours
                  </h3>
                  <span className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Carte requise · 0€
                  </span>
                </div>
                <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-600')}>
                  Testez toutes les fonctionnalités Pro pendant 7 jours. Carte requise pour éviter les abus,
                  <span className="font-semibold"> 0€ débité aujourd&apos;hui</span>. Annulable à tout moment.
                </p>
                <div className={cn('mt-1 flex items-center gap-2 text-sm font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  <ArrowRight size={16} /> Commencer maintenant
                </div>
              </div>
            </div>
          </motion.button>
        ) : !sub.isFree ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className={cn(
              'mx-auto mb-6 flex w-full max-w-3xl items-center gap-3 rounded-2xl border px-5 py-4',
              isDark ? 'border-white/[0.06] bg-[#111113]/60' : 'border-gray-200 bg-white',
            )}
          >
            <Crown size={18} className="flex-shrink-0 text-emerald-500" />
            <p className={cn('text-sm font-medium', isDark ? 'text-zinc-300' : 'text-gray-700')}>
              Vous êtes déjà abonné·e — merci&nbsp;! Changez de plan ci-dessous si vous le souhaitez.
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* ═══ SECTION TARIFS — même composant que /paywall ═══ */}
      <PricingSection
        plans={pricingPlans}
        billing={billing}
        onBillingChange={setBilling}
        onSelect={handleSelect}
        title="Choisissez votre plan"
        description="Sans engagement. Évoluez quand vous voulez. La dictée vocale reste illimitée partout."
      />

      {/* ═══ Lien retour dashboard ═══ */}
      {profile?.id && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className={cn('text-sm underline underline-offset-4 transition-colors',
              isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}
          >
            Retour au tableau de bord
          </button>
        </div>
      )}

      {/* ═══ Micro-réassurance ═══ */}
      <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-sm">
        {[
          { icon: Shield, label: 'Paiement sécurisé Stripe' },
          { icon: CreditCard, label: 'PCI-DSS Niveau 1' },
          { icon: RefreshCw, label: 'Annulation en 1 clic' },
          { icon: InfinityIcon, label: 'Voix illimitée partout' },
        ].map((badge, i) => (
          <div key={i} className={cn('flex items-center gap-2 rounded-full border px-4 py-2',
            isDark ? 'bg-[#111113]/50 border-white/[0.06]' : 'bg-white/50 backdrop-blur-sm border-gray-200')}>
            <badge.icon size={15} className="text-primary" />
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-gray-500')}>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* ═══ MODALE DE CHECKOUT ON-SITE ═══ */}
      <CheckoutModal
        open={checkout.open}
        onOpenChange={(o) => setCheckout((c) => ({ ...c, open: o }))}
        mode={checkout.mode}
        planId={checkout.planId}
        billing={billing}
        currentPlan={sub.tier}
        userId={profile?.id}
      />
    </div>
  );
}
