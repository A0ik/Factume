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
    .select('subscription_tier, is_trial_active, voice_usage_count, voice_usage_month, monthly_invoice_count, invoice_month, ocr_usage_count, ocr_usage_month')
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

  // MERCURE — Current month OCR multi-invoice usage (Business fair-use 500/mois)
  const ocrUsedThisMonth = isBusiness && profile?.ocr_usage_month === currentMonth
    ? (profile?.ocr_usage_count || 0)
    : 0;

  // Current month invoice count
  const monthlyInvoiceCount = profile?.invoice_month === currentMonth
    ? (profile?.monthly_invoice_count || 0)
    : 0;

  const voiceLimit = checkLimit(tier, 'voiceCommandsPerMonth', voiceUsedThisMonth, isTrial);
  const ocrLimit = checkLimit(tier, 'ocrInvoicesPerMonth', ocrUsedThisMonth, isTrial);
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
    // MERCURE : voix illimitée Pro+ ; fair-use 50/mois gratuit (checkLimit → allowed si null)
    canUseVoice: voiceLimit.allowed,
    maxVoice: voiceLimit.max,
    voiceRemaining: voiceLimit.remaining,
    ocrUsedThisMonth,
    canUseOcr: ocrLimit.allowed,
    maxOcr: ocrLimit.max,
    ocrRemaining: ocrLimit.remaining,
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
 * @deprecated MERCURE (juin 2026) — remplacé par consumeVoiceQuota (atomique + pré-check).
 * Conservé pour rétro-compat ; les nouvelles routes doivent appeler consumeVoiceQuota.
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

// ════════════════════════════════════════════════════════════════════════════
// MERCURE (juin 2026) — Quotas anti-abus SANS friction.
// Ces helpers appellent des RPC SECURITY DEFINER (check + incrément atomiques).
// Ils REMPLACENT les rate-limits per-minute qui bloquaient les users rapides :
// un cap mensuel ne bloque JAMAIS un usage légitime rapide, il borne juste le total.
// Fail-open sur erreur DB : on ne pénalise pas un user légitime lors d'une panne
// (le cap mensuel reste la protection dure ; une erreur DB = Supabase down = auth down).
// ════════════════════════════════════════════════════════════════════════════

export type QuotaResult = {
  allowed: boolean;
  count?: number | null;
  limit?: number | null;
  remaining?: number | null;
  code?: string;
  error?: string;
};

/** Consommer 1 quota vocal (atomique). free=50/mois, payant/essai=illimité. À appeler AVANT la transcription. */
export async function consumeVoiceQuota(userId: string): Promise<QuotaResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('consume_voice_quota', { p_user_id: userId });
  if (error) return { allowed: true, error: error.message };
  return (data ?? { allowed: true }) as QuotaResult;
}

/** Consommer N quotas OCR multi-factures (atomique, par lot). Business=500/mois. count = nb de factures du lot. */
export async function consumeOcrQuota(userId: string, count: number): Promise<QuotaResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('consume_ocr_quota', { p_user_id: userId, p_count: count });
  if (error) return { allowed: true, error: error.message };
  return (data ?? { allowed: true }) as QuotaResult;
}

/** Acquérir un slot IA concurrentiel (max 2 en vol/compte, stale-guard 120s). best-effort / fail-open. */
export async function acquireAiSlot(userId: string): Promise<{ allowed: boolean }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('try_acquire_ai_slot', { p_user_id: userId });
    if (error) return { allowed: true };
    return (data ?? { allowed: true }) as { allowed: boolean };
  } catch {
    return { allowed: true };
  }
}

/** Relâcher un slot IA concurrentiel. À appeler dans un finally (idempotent). */
export async function releaseAiSlot(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.rpc('release_ai_slot', { p_user_id: userId });
  } catch {
    /* best-effort : le stale-guard 120s libèrera le slot si on oublie */
  }
}
