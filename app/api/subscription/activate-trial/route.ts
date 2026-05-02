import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile to check if they have a valid Stripe subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, is_trial_active, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only allow trial activation if there's a valid Stripe subscription
    // The trial should be activated via Stripe webhook, not this endpoint
    if (!profile.stripe_subscription_id) {
      return NextResponse.json({
        error: 'Trial can only be activated after completing payment',
        requiresPayment: true,
        redirectTo: '/paywall?plan=business&trial=true'
      }, { status: 402 });
    }

    // If user already has a valid subscription, check if trial is already active
    if (profile.is_trial_active) {
      return NextResponse.json({
        error: 'Trial is already active',
        trialActive: true
      }, { status: 400 });
    }

    // If they have a subscription but trial is not active yet,
    // it means the webhook hasn't processed yet - tell them to wait
    return NextResponse.json({
      error: 'Payment is being processed. Your trial will activate automatically once payment is confirmed.',
      pending: true
    }, { status: 202 });

  } catch (error) {
    console.error('Error in activate-trial route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
