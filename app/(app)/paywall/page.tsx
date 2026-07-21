'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import {
  ArrowLeft, ArrowRight, Check, Zap, Loader2, Shield, RefreshCw,
  CreditCard, Sparkles, Lock, Infinity as InfinityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PricingSection, type PricingPlan, type Billing } from '@/components/ui/PricingSection';
import CheckoutModal, { type CheckoutMode } from '@/components/ui/CheckoutModal';
import { PLANS } from '@/lib/plans';

/* ═══════════════════════════════════════════════════════════════
   ALCHEMIST — PAYWALL on-site (no redirect)
   ───────────────────────────────────────────────────────────────
   Remplace l'ancien tunnel Hosted Checkout (redirection checkout.
   stripe.com) par un paiement 100% intégré via Stripe Elements :
     • essai → modale SetupIntent (carte requise, 0€ débité)
     • nouvelle souscription → modale PaymentIntent
     • changement de plan → modale prorata (méthode sauvegardée)
   Données depuis lib/plans (single source of truth) — fin des copies.
   ═══════════════════════════════════════════════════════════════ */

const INVOICE_LIMIT = 3;

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // OVERLORD (CIBLE 9) — annuel par défaut : levier de conversion #1.
  const [billing, setBilling] = useState<Billing>('yearly');
  const [checkout, setCheckout] = useState<{
    open: boolean;
    mode: CheckoutMode;
    planId: 'pro' | 'business';
  }>({ open: false, mode: 'payment', planId: 'pro' });
  const [trialLoading, setTrialLoading] = useState(false);

  /* ─── Auto-ouverture de la modale d'essai si ?plan=pro&trial=true ─── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const trial = params.get('trial');
    if (trial === 'true' && (plan === 'pro' || plan === 'business')) {
      window.history.replaceState({}, '', '/paywall');
      setCheckout({ open: true, mode: 'setup', planId: plan });
    }
  }, []);

  const remaining = sub.invoicesRemaining ?? 0;
  const used = sub.invoiceCount ?? 0;
  const progress = Math.min(100, (used / INVOICE_LIMIT) * 100);

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
        '1 cabinet comptable',
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
      router.push('/dashboard');
      return;
    }
    if (planId === sub.tier) return;

    // Abonné Stripe existant → changement de plan (prorata natif).
    // Sinon → nouvelle souscription via Payment Element on-site.
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

        {/* ═══ BANNIÈRE ESSAI — carte requise (free users) ═══ */}
        {sub.isFree && !sub.isTrialActive && (
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
                  <span className="font-semibold"> 0€ débité aujourd'hui</span>. Annulable à tout moment.
                </p>
                <div className={cn('mt-1 flex items-center gap-2 text-sm font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  <ArrowRight size={16} /> Commencer maintenant
                </div>
              </div>
            </div>
          </motion.button>
        )}

        {/* ═══ ALERTE COMPTEUR (free users) ═══ */}
        {sub.isFree && !sub.isTrialActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mx-auto mb-2 max-w-3xl"
          >
            <div className={cn(
              'rounded-2xl border-2 p-5',
              remaining > 0
                ? isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10'
                : isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-red-50',
            )}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg',
                  remaining > 0
                    ? isDark ? 'bg-emerald-500/15' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                    : isDark ? 'bg-red-500/15' : 'bg-gradient-to-br from-red-100 to-red-200',
                )}>
                  {remaining > 0 ? <Zap size={22} className="text-primary" /> : <Lock size={22} className={isDark ? 'text-red-400' : 'text-red-500'} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn(
                    'mb-1 text-lg font-bold',
                    remaining > 0 ? isDark ? 'text-emerald-400' : 'text-primary' : isDark ? 'text-red-400' : 'text-red-700',
                  )}>
                    {remaining > 0 ? 'Plan Gratuit' : 'Limite atteinte'}
                  </h3>
                  <p className={cn('mb-3 text-sm', isDark ? 'text-zinc-400' : 'text-gray-700')}>
                    {remaining > 0
                      ? `Vous pouvez créer encore ${remaining} facture${remaining > 1 ? 's' : ''} ce mois-ci. La dictée vocale reste illimitée.`
                      : `Vous avez atteint votre limite de ${INVOICE_LIMIT} factures mensuelles. La voix reste illimitée.`}
                  </p>
                  <div className="mb-1">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className={cn('font-medium', isDark ? 'text-zinc-500' : 'text-gray-600')}>
                        {used} / {INVOICE_LIMIT} factures
                      </span>
                      <span className={cn('font-bold', remaining > 0 ? isDark ? 'text-emerald-400' : 'text-primary' : isDark ? 'text-red-400' : 'text-red-500')}>
                        {remaining > 0 ? `${remaining} restantes` : 'Limite atteinte'}
                      </span>
                    </div>
                    <div className={cn('h-2 overflow-hidden rounded-full', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
                      <motion.div
                        className={cn('h-full rounded-full', remaining > 0 ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gradient-to-r from-red-400 to-red-500')}
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══ SECTION TARIFS (composant fourni, adapté FR/EUR) ═══ */}
      <PricingSection
        plans={pricingPlans}
        billing={billing}
        onBillingChange={setBilling}
        onSelect={handleSelect}
        title="Passez à la vitesse supérieure"
        description="Choisissez le plan adapté à votre activité. Annulable en 1 clic, sans engagement."
      />

      {/* ═══ Lien continuer gratuitement ═══ */}
      {sub.isFree && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className={cn('text-sm underline underline-offset-4 transition-colors',
              isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}
          >
            Continuer gratuitement ({INVOICE_LIMIT} factures/mois · voix illimitée)
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
