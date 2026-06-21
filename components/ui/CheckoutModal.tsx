'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import EmbeddedCheckout, { type PlanInfo } from '@/components/ui/EmbeddedCheckout';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Shield, RefreshCw, ArrowRight, Lock, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeStore } from '@/stores/themeStore';
import { PLANS, type PlanTier } from '@/lib/plans';

/* ═══════════════════════════════════════════════════════════════
   ALCHEMIST — CheckoutModal (tunnel de paiement on-site, no redirect)
   ───────────────────────────────────────────────────────────────
   3 modes, pilotés par le paywall :
     • 'payment' → nouvelle souscription (route /api/stripe/subscription)
                  → PaymentIntent → PaymentElement → confirmPayment
     • 'setup'   → essai gratuit 7j carte requise (route /api/stripe/trial-subscription)
                  → SetupIntent → PaymentElement → confirmSetup (0€ débité)
     • 'change'  → changement de plan existant (route /api/stripe/change-subscription)
                  → prorata natif Stripe, pas de saisie carte (méthode sauvegardée)

   Le conteneur reprend le design « glass checkout card » fourni :
   backdrop-blur, border-border/50, accent émeraude, réassurance PCI-DSS.
   L'INTÉRIEUR des champs carte est 100% géré par Stripe (PaymentElement) →
   conformité PCI-DSS, zéro PAN transite par nos serveurs.
   ═══════════════════════════════════════════════════════════════ */

export type CheckoutMode = 'payment' | 'setup' | 'change';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CheckoutMode;
  planId: Extract<PlanTier, 'pro' | 'business'>;
  billing: 'monthly' | 'yearly';
  /** tier actuel (mode change uniquement) */
  currentPlan?: string;
  userId?: string;
}

interface ProrataPreview {
  prorataAmount: number;
  prorataPercent: number;
  isUpgrade: boolean;
  remainingDays: number;
  currentPrice: number;
  newPrice: number;
}

/** Construit le récapitulatif plan affiché par EmbeddedCheckout. */
function buildPlanInfo(planId: 'pro' | 'business', billing: 'monthly' | 'yearly', mode: CheckoutMode): PlanInfo {
  const plan = PLANS[planId];
  const topFeatures = plan.features.slice(0, 4);

  if (mode === 'setup') {
    return {
      id: planId,
      name: plan.name,
      price: '0€',
      priceNote: `pendant 7 jours · puis ${formatCurrency(billing === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly)}/mois`,
      features: topFeatures,
    };
  }

  if (billing === 'yearly') {
    return {
      id: planId,
      name: plan.name,
      price: formatCurrency(plan.priceYearly / 12),
      priceNote: '/ mois · ' + formatCurrency(plan.priceYearly) + ' facturés/an',
      features: topFeatures,
    };
  }

  return {
    id: planId,
    name: plan.name,
    price: formatCurrency(plan.priceMonthly),
    priceNote: '/ mois · sans engagement',
    features: topFeatures,
  };
}

export default function CheckoutModal({
  open,
  onOpenChange,
  mode,
  planId,
  billing,
  currentPlan,
  userId,
}: CheckoutModalProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode change : aperçu du prorata + confirmation
  const [prorata, setProrata] = useState<ProrataPreview | null>(null);
  const [changing, setChanging] = useState(false);

  const planInfo = buildPlanInfo(planId, billing, mode);
  const plan = PLANS[planId];

  /* ─── Fetch du clientSecret (modes payment / setup) ─── */
  const fetchClientSecret = useCallback(async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    try {
      const endpoint = mode === 'setup' ? '/api/stripe/trial-subscription' : '/api/stripe/subscription';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, yearly: billing === 'yearly' }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Impossible d'initialiser le paiement.");
      }
      setClientSecret(data.clientSecret);
      setIsSetupMode(data.isSetupMode === true || mode === 'setup');
    } catch (e) {
      setError((e as Error).message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }, [mode, planId, billing]);

  /* ─── Fetch du prorata (mode change) ─── */
  const fetchProrata = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stripe/change-subscription?plan=${planId}`, { method: 'GET' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible de calculer le prorata.');
      setProrata({
        prorataAmount: data.prorataAmount ?? 0,
        prorataPercent: data.prorataPercent ?? 0,
        isUpgrade: data.isUpgrade ?? true,
        remainingDays: data.remainingDays ?? 0,
        currentPrice: data.currentPrice ?? 0,
        newPrice: data.newPrice ?? 0,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (!open) {
      // Reset à la fermeture
      setClientSecret(null);
      setError(null);
      setProrata(null);
      setLoading(false);
      return;
    }
    if (mode === 'change') {
      fetchProrata();
    } else {
      fetchClientSecret();
    }
  }, [open, mode, fetchClientSecret, fetchProrata]);

  /* ─── Confirmation changement de plan ─── */
  const confirmChange = async () => {
    setChanging(true);
    try {
      const res = await fetch('/api/stripe/change-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, yearly: billing === 'yearly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec du changement de plan.');
      toast.success(
        prorata?.isUpgrade
          ? `Plan ${plan.name} activé. Le différentiel a été facturé au prorata.`
          : `Plan ${plan.name} activé. Le crédit sera appliqué à votre prochaine facture.`,
      );
      onOpenChange(false);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChanging(false);
    }
  };

  /* ─── Succès paiement / essai → fermeture + redirection ─── */
  const handleSuccess = () => {
    const url = mode === 'setup' ? '/dashboard?trial=true' : '/dashboard?upgraded=1';
    setTimeout(() => {
      onOpenChange(false);
      window.location.href = url;
    }, 1600);
  };

  const titleMap: Record<CheckoutMode, string> = {
    setup: 'Démarrer votre essai gratuit',
    payment: `S'abonner au plan ${plan.name}`,
    change: `Passer au plan ${plan.name}`,
  };
  const descMap: Record<CheckoutMode, string> = {
    setup: '7 jours d\'essai · carte requise · 0€ débité aujourd\'hui. Annulable à tout moment.',
    payment: 'Paiement sécurisé sur factu.me · annulable en 1 clic · sans engagement.',
    change: 'Le prorata est calculé automatiquement à partir de votre période en cours.',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md gap-0 overflow-hidden rounded-2xl p-0',
          'border-border/50 bg-card/70 backdrop-blur-2xl',
          'shadow-2xl',
          isDark ? 'shadow-emerald-950/40' : 'shadow-emerald-500/10',
        )}
      >
        {/* Accent gradient top (signature) */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-700" />

        <DialogHeader className="space-y-1 px-6 pt-5 pb-3 text-center sm:text-center">
          <DialogTitle className="text-lg font-bold">
            {titleMap[mode]}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {descMap[mode]}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* État de chargement */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-500')}>
                {mode === 'change' ? 'Calcul du prorata…' : 'Préparation du paiement sécurisé…'}
              </p>
            </div>
          )}

          {/* Erreur globale */}
          {!loading && error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4',
                isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200',
              )}
            >
              <AlertCircle className={cn('mt-0.5 h-5 w-5 flex-shrink-0', isDark ? 'text-red-400' : 'text-red-500')} />
              <div className="flex-1">
                <p className={cn('text-sm font-medium', isDark ? 'text-red-300' : 'text-red-700')}>{error}</p>
                <button
                  onClick={() => (mode === 'change' ? fetchProrata() : fetchClientSecret())}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <RefreshCw size={12} /> Réessayer
                </button>
              </div>
            </motion.div>
          )}

          {/* Mode changement de plan : aperçu prorata + confirmation */}
          <AnimatePresence>
            {!loading && !error && mode === 'change' && prorata && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={cn(
                  'rounded-2xl border p-4',
                  isDark ? 'bg-[#111113] border-white/[0.08]' : 'bg-white border-gray-200',
                )}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Plan actuel</span>
                    <span className={cn('font-semibold capitalize', isDark ? 'text-zinc-200' : 'text-gray-700')}>
                      {currentPlan || '—'}
                    </span>
                  </div>
                  <div className="my-2 flex items-center justify-center text-emerald-500">
                    <ArrowRight size={18} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Nouveau plan</span>
                    <span className="font-bold text-emerald-500">{plan.name}</span>
                  </div>
                </div>

                <div className={cn(
                  'rounded-xl border p-4',
                  prorata.isUpgrade
                    ? isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                    : isDark ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-200',
                )}>
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className={prorata.isUpgrade ? 'text-emerald-500' : 'text-sky-500'} />
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', prorata.isUpgrade ? 'text-emerald-500' : 'text-sky-500')}>
                      {prorata.isUpgrade ? 'Surfacturation immédiate' : 'Crédit sur prochaine facture'}
                    </span>
                  </div>
                  <p className={cn('mt-2 text-2xl font-black', isDark ? 'text-white' : 'text-gray-900')}>
                    {prorata.isUpgrade ? '+' : '−'}{formatCurrency(prorata.prorataAmount)}
                  </p>
                  <p className={cn('mt-1 text-xs', isDark ? 'text-zinc-400' : 'text-gray-500')}>
                    Calculé au prorata des {prorata.remainingDays} jour{prorata.remainingDays > 1 ? 's' : ''} restant{prorata.remainingDays > 1 ? 's' : ''} ({prorata.prorataPercent}% de votre période).
                    {' '}Stripe calcule ce montant au centime près.
                  </p>
                </div>

                <button
                  onClick={confirmChange}
                  disabled={changing}
                  className="relative w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {changing ? (
                    <><Loader2 size={16} className="animate-spin" /> Confirmation…</>
                  ) : (
                    <><Check size={16} /> Confirmer le changement</>
                  )}
                </button>
                <p className={cn('flex items-center justify-center gap-1.5 text-[11px]', isDark ? 'text-zinc-500' : 'text-gray-400')}>
                  <Lock size={11} /> Aucune nouvelle saisie de carte — méthode sauvegardée
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modes paiement / essai : Stripe Elements (on-site) */}
          {!loading && !error && (mode === 'payment' || mode === 'setup') && clientSecret && (
            <EmbeddedCheckout
              clientSecret={clientSecret}
              userId={userId || ''}
              planInfo={planInfo}
              isSetupMode={isSetupMode}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        {/* Footer réassurance PCI-DSS */}
        {!loading && !error && (
          <div className={cn(
            'flex items-center justify-center gap-2 border-t px-6 py-3 text-[11px]',
            isDark ? 'border-white/[0.06] text-zinc-500' : 'border-gray-100 text-gray-400',
          )}>
            <Shield size={12} className="text-primary" />
            <span>Paiement chiffré · Stripe PCI-DSS Niveau 1 · données carte jamais stockées</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
