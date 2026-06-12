'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import {
  ArrowLeft, Check, Crown, Zap, Rocket, Shield, Loader2, ArrowRight,
  CreditCard, RefreshCw, Sparkles, Award, Infinity as InfinityIcon, Lock, CheckCircle2, Circle,
  BadgePercent, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EmbeddedCheckout, { PlanInfo } from '@/components/ui/EmbeddedCheckout';
import OptimizedPricingCard from '@/components/ui/OptimizedPricingCard';
import { PaywallHeader } from '@/components/ui/PaywallHeader';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface PlanFeature { label: string; included: boolean; highlight?: boolean; }
interface Plan {
  id: string; name: string; price: string; yearlyPrice: string; yearlySavings: string; tagline: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  gradient: string; gradientFrom: string; gradientTo: string;
  features: PlanFeature[]; cta: string; badge?: string;
  borderColor: string; glowColor: string; popular?: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   PLANS DATA
   ═══════════════════════════════════════════════════════════════ */

const PLANS: Plan[] = [
  {
    id: 'pro', name: 'Pro', price: '14,99€', yearlyPrice: '12,50€', yearlySavings: '30€', tagline: 'Le couteau suisse des indépendants',
    icon: Zap, iconColor: 'text-white', iconBg: 'from-emerald-500 to-emerald-600',
    gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
    gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-700',
    borderColor: 'emerald-500', glowColor: 'shadow-emerald-500',
    cta: 'Choisir Pro', badge: 'Populaire', features: [
      { label: 'Factures & devis illimités', included: true },
      { label: 'Contrats de travail (CDI/CDD)', included: true, highlight: true },
      { label: 'OCR analyse de reçus', included: true, highlight: true },
      { label: 'Signature électronique', included: true },
      { label: 'Notes de frais vocales', included: true },
      { label: 'Gestion IK (indemnités kilométriques)', included: true },
      { label: 'Tableau de bord analytique', included: true },
      { label: 'Multi-modèles PDF (6 templates)', included: true },
      { label: 'E-facturation certifiée Factur-X', included: true, highlight: true },
      { label: 'URSSAF One-Click', included: true },
      { label: 'Export comptable (FEC, CSV)', included: true },
      { label: 'Rapprochement bancaire', included: true },
      { label: 'CRM illimité', included: true },
      { label: 'Sans watermark PDF', included: true },
      { label: 'Comptable Connect', included: false },
      { label: 'Multi-utilisateur', included: false },
    ]
  },
  {
    id: 'business', name: 'Business', price: '39,99€', yearlyPrice: '33,33€', yearlySavings: '80€', tagline: 'Pour les PME & experts-comptables',
    icon: Crown, iconColor: 'text-white', iconBg: 'from-purple-600 to-violet-700',
    gradient: 'from-purple-600 via-violet-700 to-purple-800',
    gradientFrom: 'from-purple-600', gradientTo: 'to-purple-800',
    borderColor: 'purple-600', glowColor: 'shadow-purple-600',
    cta: 'Choisir Business', badge: 'Premium', features: [
      { label: 'Tout dans Pro', included: true },
      { label: '5 cabinets', included: true, highlight: true },
      { label: 'Comptable Connect', included: true, highlight: true },
      { label: 'Copilot Factu IA (avancé)', included: true },
      { label: 'Multi-utilisateur (5)', included: true },
      { label: 'API & Webhooks', included: true },
      { label: 'Rapports avancés', included: true },
      { label: 'Support dédié', included: true },
    ]
  },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

// LOI 2: Pro recommended for free users, Business for Pro users
function getHighlightedPlan(tier: string): string {
  if (tier === 'free') return 'pro';
  if (tier === 'pro') return 'business';
  return 'pro';
}

function getPriceNote(plan: Plan, yearly: boolean, trialMode = false): string {
  if (yearly) {
    const monthlyNum = parseFloat(plan.yearlyPrice.replace('€', ''));
    const total = Math.round(monthlyNum * 12);
    const suffix = trialMode ? ` (après 7 jours d'essai)` : '';
    return `/ mois · ${total}€ facturés annuellement${suffix}`;
  }
  return trialMode ? '/ mois (après 7 jours d\'essai)' : '/ mois';
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAYWALL PAGE
   LOI 1: Dualité parfaite (Clair & Obsidian)
   LOI 4: Toggle fluide Mensuel/Annuel
   LOI 6: Sticky Summary (desktop)
   LOI 10: Mobile fluide
   ═══════════════════════════════════════════════════════════════ */

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const highlighted = getHighlightedPlan(sub.tier);
  const isYearly = billing === 'yearly';

  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    userId: string;
    planInfo: PlanInfo;
    isSetupMode?: boolean;
  } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  const [prorataData, setProrataData] = useState<Record<string, { amount: number; percent: number }>>({});
  const [confirmChange, setConfirmChange] = useState<{ plan: Plan; prorata: { amount: number; percent: number } } | null>(null);
  const trialTriggered = useRef(false);

  // Toggle refs for proper sizing
  const monthlyRef = useRef<HTMLButtonElement>(null);
  const yearlyRef = useRef<HTMLButtonElement>(null);
  const [togglePos, setTogglePos] = useState({ left: 2, width: 0 });

  useEffect(() => {
    if (monthlyRef.current && yearlyRef.current) {
      const ref = !isYearly ? monthlyRef.current : yearlyRef.current;
      setTogglePos({ left: ref.offsetLeft, width: ref.offsetWidth });
    }
  }, [isYearly]);

  // Reset checkout when billing changes
  useEffect(() => {
    if (checkoutData) {
      setCheckoutData(null);
      setSelectedPlan(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing]);

  // Fetch prorata data for plan changes
  useEffect(() => {
    const fetchProrataData = async () => {
      if (!profile?.id || sub.isFree) return;
      const promises = PLANS.map(async (plan) => {
        try {
          const res = await fetch(`/api/stripe/change-subscription?userId=${profile.id}&plan=${plan.id}`);
          if (res.ok) {
            const data = await res.json();
            return { planId: plan.id, data: { amount: data.prorataAmount || 0, percent: data.prorataPercent || 0 } };
          }
        } catch { /* ignore */ }
        return null;
      });
      const results = await Promise.all(promises);
      const prorataMap: Record<string, { amount: number; percent: number }> = {};
      results.forEach(r => { if (r) prorataMap[r.planId] = r.data; });
      setProrataData(prorataMap);
    };
    fetchProrataData();
  }, [profile?.id, sub.isFree, sub.tier]);

  /* ─── Trial without card activation ─── */
  const handleTrialActivation = async () => {
    if (!profile?.id) return;
    setTrialLoading(true);
    try {
      // Simple fingerprint from browser
      const fp = btoa(
        `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
      ).slice(0, 64);

      const res = await fetch('/api/trial/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', fingerprint: fp }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Essai activé ! Profitez de Pro pendant 7 jours.');
        setTimeout(() => { window.location.href = '/dashboard?trial=true'; }, 800);
      } else {
        toast.error(data.error || "Impossible d'activer l'essai");
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || 'Erreur');
    } finally {
      setTrialLoading(false);
    }
  };

  /* ─── URL-based trial trigger ─── */
  useEffect(() => {
    if (trialTriggered.current) return;
    if (!profile?.id) return;
    if (sub.tier !== 'free') return;

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const planParam = params.get('plan');
    const trialParam = params.get('trial');

    if (planParam && trialParam === 'true') {
      trialTriggered.current = true;
      window.history.replaceState({}, '', '/paywall');
      handleTrialActivation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  /* ─── Select plan for checkout ─── */
  const handleSelect = async (planId: string) => {
    if (planId === sub.tier) return;
    const selectedPlan = PLANS.find(p => p.id === planId);
    if (!selectedPlan || !profile?.id) return;

    // If user has real Stripe subscription, show prorata confirmation
    const hasRealStripeSubscription = !sub.isFree && sub.tier !== 'free' && !!profile?.stripe_subscription_id;
    if (hasRealStripeSubscription) {
      const prorata = prorataData[planId] || { amount: 0, percent: 0 };
      setConfirmChange({ plan: selectedPlan, prorata });
      return;
    }

    // Free user: show Stripe checkout
    setLoading(planId);
    setSelectedPlan(selectedPlan);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, yearly: isYearly }),
      });
      const data = await res.json();

      if (data.clientSecret) {
        const planInfo: PlanInfo = {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price: (isYearly ? selectedPlan.yearlyPrice : selectedPlan.price).replace('€', ''),
          priceNote: getPriceNote(selectedPlan, isYearly),
          features: selectedPlan.features.filter(f => f.included).slice(0, 4).map(f => f.label),
        };
        setCheckoutData({ clientSecret: data.clientSecret, userId: profile?.id ?? '', planInfo });
      } else {
        toast.error(data.error || "Impossible de créer l'abonnement");
        setSelectedPlan(null);
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || 'Erreur');
      setSelectedPlan(null);
    } finally {
      setLoading(null);
    }
  };

  /* ─── Confirm plan change (prorata) ─── */
  const confirmPlanChange = async () => {
    if (!confirmChange || !profile?.id) return;
    const { plan } = confirmChange;
    setConfirmChange(null);
    setLoading(plan.id);
    setSelectedPlan(plan);

    try {
      const res = await fetch('/api/stripe/change-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, yearly: isYearly }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        toast.success('Abonnement mis à jour avec succès !');
        setTimeout(() => window.location.reload(), 1500);
      } else if (data.clientSecret) {
        const planInfo: PlanInfo = {
          id: plan.id, name: plan.name,
          price: (isYearly ? plan.yearlyPrice : plan.price).replace('€', ''),
          priceNote: getPriceNote(plan, isYearly),
          features: plan.features.filter(f => f.included).slice(0, 4).map(f => f.label),
        };
        setCheckoutData({ clientSecret: data.clientSecret, userId: profile.id, planInfo });
        setLoading(null);
        return;
      } else {
        toast.error(data.error || "Impossible de changer l'abonnement");
        setSelectedPlan(null);
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || 'Erreur');
      setSelectedPlan(null);
    } finally {
      setLoading(null);
    }
  };

  const handleBack = () => {
    setCheckoutData(null);
    setSelectedPlan(null);
  };

  const remainingInvoices = sub.invoicesRemaining ?? 0;

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className={cn(
      "min-h-screen pb-24 px-4 sm:px-6 lg:px-8 py-6 md:py-8",
      isDark
        ? "bg-[#09090B]"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-50"
    )}>

      {/* Back Button — dual theme */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={router.back}
        className={cn(
          "mb-4 inline-flex items-center gap-2 text-sm w-fit transition-colors",
          isDark
            ? "text-zinc-500 hover:text-zinc-200"
            : "text-gray-500 hover:text-gray-900"
        )}
      >
        <ArrowLeft size={14} /> Retour
      </motion.button>

      <PaywallHeader onCTAClick={() => {}} />

      {/* ═══ FREE USER ALERTS ═══ */}
      {sub.isFree && !sub.isTrialActive && (
        <>
          {/* Trial Banner — Cardless, no Stripe */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-6 max-w-3xl"
          >
            <div
              onClick={handleTrialActivation}
              className={cn(
                "block group cursor-pointer",
                "relative overflow-hidden rounded-2xl border-2 p-5 transition-all",
                isDark
                  ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
                  : "border-emerald-300 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-emerald-50 shadow-xl shadow-emerald-200/50 hover:shadow-2xl hover:shadow-emerald-300/60"
              )}
            >
              <div className="relative flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg"
                >
                  {trialLoading
                    ? <Loader2 size={24} className="animate-spin" />
                    : <Sparkles size={24} className="fill-current" />
                  }
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "text-lg font-bold",
                      isDark ? "text-emerald-400" : "text-emerald-700"
                    )}>
                      Essai Gratuit 7 Jours
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                      "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                    )}>
                      Sans carte
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-zinc-400" : "text-gray-600"
                  )}>
                    Testez toutes les fonctionnalités Pro pendant 7 jours. Aucune carte requise.
                  </p>
                  <div className={cn(
                    "flex items-center gap-2 text-sm font-semibold mt-1",
                    isDark ? "text-emerald-400" : "text-emerald-700"
                  )}>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    <span>Commencer maintenant</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Usage Alert — dual theme */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mb-8 max-w-3xl"
          >
            <div className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-5",
              remainingInvoices > 0
                ? isDark
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"
                : isDark
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-red-50"
            )}>
              <div className="relative flex items-start gap-4">
                <motion.div
                  animate={remainingInvoices > 0 ? { rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg",
                    remainingInvoices > 0
                      ? isDark ? "bg-emerald-500/15" : "bg-gradient-to-br from-primary/20 to-primary/10"
                      : isDark ? "bg-red-500/15" : "bg-gradient-to-br from-red-100 to-red-200"
                  )}
                >
                  {remainingInvoices > 0
                    ? <Zap size={22} className="text-primary" />
                    : <Lock size={22} className={isDark ? "text-red-400" : "text-red-500"} />
                  }
                </motion.div>
                <div className="flex-1">
                  <h3 className={cn(
                    "text-lg font-bold mb-1",
                    remainingInvoices > 0
                      ? isDark ? "text-emerald-400" : "text-primary"
                      : isDark ? "text-red-400" : "text-red-700"
                  )}>
                    {remainingInvoices > 0 ? 'Plan Gratuit' : 'Limite atteinte'}
                  </h3>
                  <p className={cn("text-sm mb-3", isDark ? "text-zinc-400" : "text-gray-700")}>
                    {remainingInvoices > 0
                      ? `Vous pouvez créer encore ${remainingInvoices} facture${remainingInvoices > 1 ? 's' : ''} ce mois-ci.`
                      : 'Vous avez atteint votre limite de 3 factures mensuelles.'}
                  </p>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-gray-600")}>
                        {sub.invoiceCount} / 3 factures
                      </span>
                      <span className={cn(
                        "font-bold",
                        remainingInvoices > 0
                          ? isDark ? "text-emerald-400" : "text-primary"
                          : isDark ? "text-red-400" : "text-red-500"
                      )}>
                        {remainingInvoices > 0 ? `${remainingInvoices} restantes` : 'Limite atteinte'}
                      </span>
                    </div>
                    <div className={cn(
                      "h-2 rounded-full overflow-hidden",
                      isDark ? "bg-white/[0.06]" : "bg-gray-200"
                    )}>
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          remainingInvoices > 0
                            ? "bg-gradient-to-r from-primary to-primary-dark"
                            : "bg-gradient-to-r from-red-400 to-red-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${(sub.invoiceCount / 5) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: InfinityIcon, text: 'Illimité avec Pro' },
                      { icon: Sparkles, text: 'IA incluse' },
                    ].map((item, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                        isDark
                          ? "bg-white/[0.04] border-white/[0.06]"
                          : "bg-white/60 backdrop-blur-sm border-gray-200/50"
                      )}>
                        <item.icon size={14} className={isDark ? "text-zinc-500" : "text-gray-500"} />
                        <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-gray-700")}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ═══ PAID USER ALERT ═══ */}
      {!sub.isFree && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-8 max-w-3xl"
        >
          <div className={cn(
            "flex items-center gap-4 rounded-2xl border p-4",
            isDark
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"
          )}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"
            >
              <Award size={22} className="text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">
                Plan {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} actif
              </p>
              <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-gray-600")}>
                Accès illimité à toutes les fonctionnalités
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ LOI 4: BILLING TOGGLE ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          "flex flex-col items-center gap-3 mb-8",
          checkoutData && "invisible pointer-events-none h-0 mb-0 overflow-hidden"
        )}
      >
        <div className={cn(
          "relative inline-flex items-center p-1 rounded-full border shadow-md",
          isDark
            ? "bg-[#111113] border-white/[0.08]"
            : "bg-gray-100 border-gray-200/60"
        )}>
          <motion.div
            className={cn("absolute top-1 bottom-1 rounded-full shadow-md", isDark ? "bg-[#1B1B1D]" : "")}
            animate={{
              left: togglePos.left - 1,
              width: togglePos.width + 2,
              background: isYearly
                ? 'linear-gradient(135deg, #059669, #047857)'
                : isDark
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          <button
            ref={monthlyRef}
            onClick={() => setBilling('monthly')}
            className={cn(
              "relative z-10 px-6 sm:px-7 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200",
              !isYearly ? "text-white" : isDark ? "text-zinc-500 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Mensuel
          </button>
          <button
            ref={yearlyRef}
            onClick={() => setBilling('yearly')}
            className={cn(
              "relative z-10 px-6 sm:px-7 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-2",
              isYearly ? "text-white" : isDark ? "text-zinc-500 hover:text-zinc-300" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Annuel
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-black rounded-full tracking-wide transition-all duration-200",
              isYearly
                ? "bg-white/25 text-white"
                : isDark
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-emerald-100 text-emerald-700"
            )}>
              -20%
            </span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isYearly && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border",
                isDark
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-emerald-50 border-emerald-200"
              )}
            >
              <BadgePercent size={14} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
              <span className={cn(
                "text-xs font-semibold",
                isDark ? "text-emerald-400" : "text-emerald-700"
              )}>
                Économisez jusqu'à {PLANS[2].yearlySavings}/an avec le plan annuel
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ CONFIRMATION MODAL (Plan Change) — dual theme ═══ */}
      <AnimatePresence>
        {confirmChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmChange(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "rounded-2xl shadow-2xl max-w-md w-full p-6",
                isDark ? "bg-[#111113] border border-white/[0.08]" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                  confirmChange.plan.gradient
                )}>
                  <confirmChange.plan.icon size={24} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
                    Changer vers {confirmChange.plan.name} ?
                  </h3>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>
                    Confirmez le changement de plan
                  </p>
                </div>
              </div>

              <div className={cn("rounded-xl p-4 mb-4", isDark ? "bg-white/[0.04]" : "bg-gray-50")}>
                <div className="flex justify-between mb-2">
                  <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-600")}>Nouveau prix</span>
                  <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>
                    {isYearly ? confirmChange.plan.yearlyPrice : confirmChange.plan.price}/mois
                  </span>
                </div>
                {confirmChange.prorata.amount > 0 && (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-600")}>Prorata</span>
                      <span className={cn("text-sm font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>
                        {confirmChange.prorata.amount.toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-600")}>Période restante</span>
                      <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>
                        {confirmChange.prorata.percent}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className={cn(
                "flex items-start gap-2 p-3 rounded-xl mb-5",
                isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"
              )}>
                <AlertTriangle size={16} className={isDark ? "text-amber-400 flex-shrink-0 mt-0.5" : "text-amber-600 flex-shrink-0 mt-0.5"} />
                <p className={cn("text-xs", isDark ? "text-amber-400" : "text-amber-700")}>
                  Le changement sera facturé immédiatement par prorata sur votre méthode de paiement actuelle.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmChange(null)}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors",
                    isDark
                      ? "border-white/[0.08] text-zinc-400 hover:bg-white/[0.04]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmPlanChange}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{
                    background: confirmChange.plan.id === 'pro'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : confirmChange.plan.id === 'business'
                        ? 'linear-gradient(135deg, #1e40af, #3730a3)'
                        : 'linear-gradient(135deg, #9333ea, #6d28d9)'
                  }}
                >
                  Confirmer le changement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CHECKOUT VIEW OR PLANS GRID ═══ */}
      <AnimatePresence mode="wait">
        {checkoutData && selectedPlan ? (
          /* ─── CHECKOUT: Sticky summary + Stripe form ─── */
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto"
          >
            {/* LOI 6: Sticky Summary — desktop only */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:sticky lg:top-8 lg:self-start"
            >
              <button
                onClick={handleBack}
                className={cn(
                  "mb-4 inline-flex items-center gap-2 text-sm transition-colors",
                  isDark ? "text-zinc-500 hover:text-zinc-200" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <ArrowLeft size={14} /> Changer de plan
              </button>

              <div className={cn(
                "rounded-2xl border-2 overflow-hidden",
                isDark
                  ? "bg-[#111113] border-white/[0.08] shadow-xl"
                  : "bg-white border-gray-200 shadow-xl"
              )}>
                {/* Plan header gradient */}
                <div className={cn("p-6 pb-7 bg-gradient-to-br", selectedPlan.gradient)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <selectedPlan.icon size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{selectedPlan.name}</h2>
                        {selectedPlan.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white rounded-full uppercase tracking-wider border border-white/30">
                            {selectedPlan.badge}
                          </span>
                        )}
                        {isYearly && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400/30 text-white rounded-full">
                            -20%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 mt-0.5">{selectedPlan.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={isYearly ? 'y' : 'm'}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="text-4xl font-black text-white"
                      >
                        {isYearly ? selectedPlan.yearlyPrice : selectedPlan.price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-base text-white/60 mb-1">/ mois</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-white/70 mt-1">
                      {selectedPlan.yearlySavings} économisés/an · Facturé annuellement
                    </p>
                  )}
                </div>

                {/* Features list */}
                <div className="p-5">
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider mb-3",
                    isDark ? "text-zinc-600" : "text-gray-400"
                  )}>
                    Inclus dans ce plan
                  </p>
                  <div className="space-y-2.5">
                    {selectedPlan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {feat.included ? (
                          <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        ) : (
                          <Circle size={16} className={cn("flex-shrink-0 mt-0.5", isDark ? "text-zinc-700" : "text-gray-300")} strokeWidth={2} />
                        )}
                        <span className={cn(
                          "text-sm",
                          feat.included
                            ? isDark ? "text-zinc-300" : "text-gray-700"
                            : isDark ? "text-zinc-600" : "text-gray-400"
                        )}>
                          {feat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stripe Payment Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className={cn(
                "rounded-2xl border-2 p-6 md:p-8",
                isDark
                  ? "bg-[#111113] border-white/[0.08] shadow-xl"
                  : "bg-white border-gray-200 shadow-xl"
              )}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
                    <Shield size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className={cn("text-lg font-black", isDark ? "text-white" : "text-gray-900")}>
                      Paiement sécurisé
                    </h2>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>
                      Crypté et protégé par Stripe
                    </p>
                  </div>
                </div>

                <EmbeddedCheckout
                  clientSecret={checkoutData.clientSecret}
                  userId={checkoutData.userId}
                  planInfo={checkoutData.planInfo}
                  isSetupMode={checkoutData.isSetupMode || false}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ─── PLANS GRID ─── */
          <motion.div
            key="plans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto"
          >
            {PLANS.map((plan, index) => {
              const isHighlighted = plan.id === highlighted;
              const isCurrent = plan.id === sub.tier;
              const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === sub.tier);
              const isLoading = loading === plan.id;
              const prorata = prorataData[plan.id] || { amount: 0, percent: 0 };

              return (
                <OptimizedPricingCard
                  key={plan.id}
                  plan={plan}
                  isHighlighted={isHighlighted}
                  isCurrent={isCurrent}
                  isLoading={isLoading}
                  isDowngrade={isDowngrade}
                  onClick={() => handleSelect(plan.id)}
                  delay={index * 0.1}
                  billing={billing}
                  userCount="+2,500"
                  prorataAmount={prorata.amount}
                  prorataPercent={prorata.percent}
                  currentPlan={sub.tier}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Continue free link ═══ */}
      {sub.isFree && !checkoutData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mt-6"
        >
          <button
            onClick={router.back}
            className={cn(
              "text-sm underline underline-offset-4 transition-colors",
              isDark ? "text-zinc-600 hover:text-zinc-400" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Continuer gratuitement (3 factures/mois)
          </button>
        </motion.div>
      )}

      {/* ═══ LOI 7: Footer — Micro-reassurance ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mx-auto mt-12 max-w-2xl flex flex-wrap items-center justify-center gap-3 text-sm"
      >
        {[
          { icon: Shield, label: 'Paiement sécurisé Stripe' },
          { icon: RefreshCw, label: 'Annulation en 1 clic' },
          { icon: CreditCard, label: 'RGPD compliant' },
        ].map((badge, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border",
              isDark
                ? "bg-[#111113]/50 border-white/[0.06]"
                : "bg-white/50 backdrop-blur-sm border-gray-200"
            )}
          >
            <badge.icon size={15} className="text-primary" />
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>
              {badge.label}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
