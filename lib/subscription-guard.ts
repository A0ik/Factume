import { createAdminClient } from '@/lib/supabase-server';
import {
  type PlanTier,
  type PlanConfig,
  resolveEffectiveTier,
  getPlanConfig,
  hasFeature,
  checkLimit,
} from '@/lib/plans';

/**
 * MONOLITH LOI 4+10 : Vérification serveur du plan d'abonnement.
 * Utilisé par les API routes et Server Actions.
 * Le client NE PEUT PAS contourner ces vérifications.
 */
export async function getUserSubscriptionStatus(userId: string) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial_active, voice_usage_count, voice_usage_month, monthly_invoice_count, invoice_month')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const isTrial = profile?.is_trial_active === true || tier === 'trial';
  const effectiveTier = resolveEffectiveTier(tier, isTrial);
  const plan = getPlanConfig(tier, isTrial);
  const isFree = effectiveTier === 'free';
  const isPaid = effectiveTier !== 'free';
  const isProOrAbove = effectiveTier === 'pro' || effectiveTier === 'business';
  const isBusiness = effectiveTier === 'business';

  // Current month voice usage
  const currentMonth = new Date().toISOString().slice(0, 7);
  const voiceUsedThisMonth = isFree && profile?.voice_usage_month === currentMonth
    ? (profile?.voice_usage_count || 0)
    : 0;

  // Current month invoice count
  const monthlyInvoiceCount = profile?.invoice_month === currentMonth
    ? (profile?.monthly_invoice_count || 0)
    : 0;

  const voiceLimit = checkLimit(tier, 'voiceCommandsPerMonth', voiceUsedThisMonth, isTrial);
  const invoiceLimit = checkLimit(tier, 'invoicesPerMonth', monthlyInvoiceCount, isTrial);

  return {
    tier,
    effectiveTier,
    plan,                // Full PlanConfig from lib/plans.ts
    isTrial,
    isFree,
    isPaid,
    isProOrAbove,
    isBusiness,
    voiceUsedThisMonth,
    canUseVoice: true, // LOI 3 (Le Hook Libre) : voix illimitée pour tous, y compris gratuit
    monthlyInvoiceCount,
    canCreateInvoice: invoiceLimit.allowed,
    invoicesRemaining: invoiceLimit.remaining,
    profile,
  };
}

/**
 * LOI 10 : Garde serveur — à utiliser dans chaque Server Action / API route.
 * Lance une erreur si la feature n'est pas disponible pour le plan de l'utilisateur.
 *
 * Usage:
 *   const sub = await getUserSubscriptionStatus(userId);
 *   requireFeature(sub, 'urssafOneClick');
 *   requireLimit(sub, 'invoicesPerMonth', sub.monthlyInvoiceCount);
 */
export function requireFeature(
  sub: Awaited<ReturnType<typeof getUserSubscriptionStatus>>,
  feature: keyof import('@/lib/plans').PlanConfig['gates'],
): void {
  if (!sub.plan.gates[feature]) {
    throw new Error(`PLAN_REQUIRED:${feature}:Cette fonctionnalité nécessite le plan ${feature === 'comptableConnect' || feature === 'multiUser' ? 'Business' : 'Pro'}.`);
  }
}

export function requireLimit(
  sub: Awaited<ReturnType<typeof getUserSubscriptionStatus>>,
  limit: keyof import('@/lib/plans').PlanConfig['limits'],
  currentValue: number,
): void {
  const result = checkLimit(sub.tier, limit, currentValue, sub.isTrial);
  if (!result.allowed) {
    throw new Error(`LIMIT_REACHED:${limit}:Limite atteinte (${currentValue}/${result.max}). Passez au plan supérieur.`);
  }
}

/**
 * Increment voice usage counter for free-tier users.
 */
export async function incrementVoiceUsage(userId: string) {
  const supabase = createAdminClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_usage_count, voice_usage_month')
    .eq('id', userId)
    .single();

  const count = profile?.voice_usage_month === currentMonth
    ? (profile?.voice_usage_count || 0) + 1
    : 1;

  await supabase
    .from('profiles')
    .update({ voice_usage_count: count, voice_usage_month: currentMonth })
    .eq('id', userId);
}
