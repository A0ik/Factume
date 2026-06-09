import { createAdminClient } from '@/lib/supabase-server';

/**
 * TOLL — Shared subscription status utility.
 * Returns the user's subscription tier and derived boolean flags.
 * Used by API routes to enforce plan limits server-side.
 */
export async function getUserSubscriptionStatus(userId: string) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial_active, voice_usage_count, voice_usage_month')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const isTrial = profile?.is_trial_active === true || tier === 'trial';
  const isFree = (tier === 'free' || !tier) && !isTrial;
  const isPaid = ['solo', 'pro', 'business'].includes(tier) && !isTrial;
  const isProOrAbove = ['pro', 'business'].includes(tier) && !isTrial;
  const isBusiness = tier === 'business' && !isTrial;

  // Voice usage for free tier (1 per month)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const voiceUsedThisMonth = isFree && profile?.voice_usage_month === currentMonth
    ? (profile?.voice_usage_count || 0)
    : 0;
  const canUseVoice = isPaid || isTrial || (isFree && voiceUsedThisMonth < 1);

  return {
    tier,
    isTrial,
    isFree,
    isPaid,
    isProOrAbove,
    isBusiness,
    voiceUsedThisMonth,
    canUseVoice,
    profile,
  };
}

/**
 * Increment voice usage counter for free-tier users.
 * Called after a successful voice processing to enforce the 1/month limit.
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
