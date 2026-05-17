'use client';
import { useAuthStore } from '@/stores/authStore';
import { useMemo } from 'react';

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
  const isPro      = tier === 'pro'  || tier === 'business';
  const isBusiness = tier === 'business';

  const trialDocumentCount = profile?.trial_document_count || 0;
  const trialDocLimit = 3;

  // Trial users get full Pro features but limited to 3 documents
  const effectiveTier = isTrial ? 'pro' : tier;
  const effectiveIsFree = isFree;
  const effectiveIsPro = isTrial || isPro;
  const effectiveIsBusiness = isBusiness;

  return {
    tier,
    effectiveTier,
    effectiveIsPro,
    effectiveIsBusiness,
    isFree,
    isTrial,
    isSolo,
    isPro,
    isBusiness,
    isTrialActive,
    trialRemaining,
    trialEndDate,
    trialStartDate,
    trialDocumentCount,
    trialDocLimit,
    trialDocsRemaining: isTrialActive ? Math.max(0, trialDocLimit - trialDocumentCount) : null,
    isTrialAtDocLimit: isTrialActive && trialDocumentCount >= trialDocLimit,
    canUseVoice:          isSolo || effectiveIsPro || effectiveIsBusiness,
    canUseCustomTemplate: effectiveIsPro || effectiveIsBusiness,
    canUseRecurring:      effectiveIsPro || effectiveIsBusiness,
    canEditInvoice:       isSolo || effectiveIsPro || effectiveIsBusiness,
    canDeleteInvoice:     !isFree && !isTrialActive,
    canUseContracts:      effectiveIsPro || effectiveIsBusiness,
    canUseCRM:            effectiveIsPro || effectiveIsBusiness,
    maxInvoices:          isFree ? 5 : Infinity,
    invoiceCount:         monthlyInvoiceCount,
    invoicesRemaining:    isFree ? Math.max(0, 5 - monthlyInvoiceCount) : null,
    isAtLimit:            isFree ? monthlyInvoiceCount >= 5 : isTrialActive && trialDocumentCount >= trialDocLimit,
    maxWorkspaces:        effectiveIsBusiness ? Infinity : (effectiveIsPro || isTrial) ? 3 : 1,
    canCreateWorkspace:   (count: number) => effectiveIsBusiness || ((effectiveIsPro || isTrial) && count < 3) || count < 1,
  };
}
