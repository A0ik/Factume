import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { isDisposableEmail } from '@/lib/disposable-emails';

/**
 * POST /api/trial/activate
 *
 * Activate a 7-day free trial WITHOUT requiring a credit card.
 * Basic anti-abuse: fingerprint + email + IP check via activate_trial_check RPC.
 *
 * Expected body: { plan: string, fingerprint: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié. Veuillez vous reconnecter.' }, { status: 401 });
    }
    const userId = user.id;

    // 2. Parse body
    // MONOLITH: Plus de plan Solo — 'solo' legacy → 'pro'
    const { plan = 'pro', fingerprint } = await req.json();

    // Validate plan
    const validPlans = ['pro', 'business'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    }

    // 3. Get profile
    const supabase = createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
    }

    // 4. Block disposable emails
    if (profile.email && isDisposableEmail(profile.email)) {
      return NextResponse.json({
        error: 'Les adresses email jetables ne sont pas acceptées pour les essais.',
      }, { status: 400 });
    }

    // 5. Check if already has an active subscription (subscription_tier is the real column name)
    if (profile.subscription_tier && profile.subscription_tier !== 'free') {
      return NextResponse.json({
        error: 'Vous avez déjà un abonnement actif.',
      }, { status: 400 });
    }

    // 6. Use existing RPC for trial validation (checks IP, email, etc.)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null;

    try {
      const { data: trialCheck, error: trialCheckError } = await supabase
        .rpc('activate_trial_check', {
          p_user_id: userId,
          p_ip_address: clientIp || null,
        });

      if (trialCheckError) {
        console.warn('activate_trial_check RPC error:', trialCheckError.message);
      } else if (trialCheck && !trialCheck[0]?.can_activate) {
        return NextResponse.json({
          error: trialCheck?.[0]?.reason || 'Essai non disponible. Vous avez déjà utilisé votre période d\'essai.',
        }, { status: 400 });
      }
    } catch {
      // RPC might not exist — fall through to manual check
    }

    // 7. Manual fallback: check if user already used trial
    if (profile.has_used_trial) {
      return NextResponse.json({
        error: 'Vous avez déjà utilisé votre période d\'essai gratuite.',
      }, { status: 400 });
    }

    // 8. Fingerprint anti-abuse check
    if (fingerprint) {
      const { data: existingFp } = await supabase
        .from('profiles')
        .select('id')
        .eq('trial_fingerprint', fingerprint)
        .limit(1);

      if (existingFp && existingFp.length > 0) {
        return NextResponse.json({
          error: 'Un essai a déjà été activé sur cet appareil.',
        }, { status: 400 });
      }
    }

    // 9. Calculate trial dates
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 10. Activate trial — update profile with CORRECT column names
    const updateData: Record<string, unknown> = {
      subscription_tier: 'trial',        // TOLL FIX S2: Always 'trial' for consistency with Stripe trials
      trial_selected_plan: plan,         // Store the user's chosen plan separately for conversion
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      is_trial_active: true,
      has_used_trial: true,
      trial_fingerprint: fingerprint || null,
      trial_ip_address: clientIp || null,
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Trial activation update error:', updateError);
      // Fallback: minimal update
      const { error: minimalError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'trial',
          trial_selected_plan: plan,
          is_trial_active: true,
          has_used_trial: true,
          trial_ip_address: clientIp || null,
        })
        .eq('id', userId);

      if (minimalError) {
        return NextResponse.json({
          error: 'Erreur lors de l\'activation de l\'essai. Veuillez réessayer.',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      trialDays: 7,
      plan,
      trialEndsAt: trialEnd.toISOString(),
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Trial activation error:', err);
    return NextResponse.json({
      error: err.message || 'Une erreur est survenue. Veuillez réessayer.',
    }, { status: 500 });
  }
}
