'use client';
import { useAuthStore } from '@/stores/authStore';
import { useMemo } from 'react';
import {
  type PlanTier,
  type PlanConfig,
  resolveEffectiveTier,
  getPlanConfig,
  hasFeature,
  checkLimit,
  PLANS,
} from '@/lib/plans';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const tier = profile?.subscription_tier || 'free';
  const isTrialActive = profile?.is_trial_active || false;
  const trialEndDate = profile?.trial_end_date;
  const trialStartDate = profile?.trial_start_date;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyInvoiceCount = (profile?.invoice_month === currentMonth)
    ? (profile?.monthly_invoice_count || 0)
    : 0;

  // Resolve effective plan using MONOLITH central config
  const effectiveTier = useMemo(() => resolveEffectiveTier(tier, isTrialActive), [tier, isTrialActive]);
  const plan: PlanConfig = useMemo(() => getPlanConfig(tier, isTrialActive), [tier, isTrialActive]);

  // Calculate remaining trial time
  const trialRemaining = useMemo(() => {
    if (!isTrialActive || !trialEndDate) return null;
    const now = new Date();
    const end = new Date(trialEndDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, totalMs: diff };
  }, [isTrialActive, trialEndDate]);

  const isFree     = tier === 'free' && !isTrialActive;
  const isTrial    = tier === 'trial' || isTrialActive;
  const isSolo     = tier === 'solo';
  const isPro      = tier === 'pro';
  const isBusiness = tier === 'business';
  const isProOrAbove = tier === 'pro' || tier === 'business';

  const trialDocumentCount = profile?.trial_document_count || 0;
  const trialDocLimit = 3;

  // Voice usage tracking (free tier)
  const voiceUsedThisMonth = isFree
    ? (profile?.voice_usage_month === currentMonth ? (profile?.voice_usage_count || 0) : 0)
    : 0;

  // ── MONOLITH: Limit checks using central plan config ──
  const invoiceLimit = useMemo(
    () => checkLimit(tier, 'invoicesPerMonth', monthlyInvoiceCount, isTrialActive),
    [tier, monthlyInvoiceCount, isTrialActive],
  );

  const maxInvoices = plan.limits.invoicesPerMonth ?? Infinity;
  const invoicesRemaining = invoiceLimit.remaining;
  const isAtLimit = !invoiceLimit.allowed;

  return {
    // Tier info
    tier,
    effectiveTier,
    plan,                          // Full plan config from lib/plans.ts
    isFree,
    isTrial,
    isSolo,
    isPro,
    isBusiness,
    isProOrAbove,
    isTrialActive,
    trialRemaining,
    trialEndDate,
    trialStartDate,
    trialDocumentCount,
    trialDocLimit,
    trialDocsRemaining: isTrialActive ? Math.max(0, trialDocLimit - trialDocumentCount) : null,
    isTrialAtDocLimit: isTrialActive && trialDocumentCount >= trialDocLimit,

    // Computed flags (backward compat)
    effectiveIsPro:       effectiveTier === 'pro' || effectiveTier === 'business',
    effectiveIsBusiness:  effectiveTier === 'business',

    // Feature gates (from central config)
    canUseVoice:          plan.gates.voiceExpense || (isFree && voiceUsedThisMonth < (plan.limits.voiceCommandsPerMonth ?? 0)),
    voiceUsedThisMonth,
    canUseCustomTemplate: plan.gates.customTemplate,
    canUseRecurring:      plan.gates.recurringInvoices,
    canEditInvoice:       !isFree || isTrialActive,
    canDeleteInvoice:     !isFree && !isTrialActive,
    canUseContracts:      plan.gates.contracts,
    canUseCRM:            plan.gates.crmAccess,
    canUseURSSAF:         plan.gates.urssafOneClick,
    canUseCopilot:        plan.gates.copilotFactu,
    canUseComptableConnect: plan.gates.comptableConnect,
    hasWatermark:         plan.gates.watermarkPDF,

    // Limits
    maxInvoices,
    invoiceCount:         monthlyInvoiceCount,
    invoicesRemaining,
    isAtLimit,
    shouldNudgeUpgrade:   isFree && monthlyInvoiceCount >= 3,
    maxCabinets:          plan.limits.maxCabinets,
    maxClientsCRM:        plan.limits.maxClientsCRM ?? Infinity,
    maxWorkspaces:        plan.limits.maxCabinets,   // Backward compat alias

    // Utility
    canCreateWorkspace:   (count: number) => count < plan.limits.maxCabinets,

    // Feature gate helper — use in components: gated('urssafOneClick')
    gated: (feature: keyof import('@/lib/plans').PlanConfig['gates']) => !plan.gates[feature],
  };
}
