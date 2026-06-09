import { createAdminClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/expire-trials
 *
 * Cron route to expire cardless trials whose trial_end_date has passed.
 * Called hourly by Vercel Cron or pg_cron.
 *
 * TOLL FIX S1: Ensures cardless trials are expired even if the user
 * doesn't visit the trial-status endpoint.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Call the existing expire_trials() RPC
    const { error: rpcError } = await supabase.rpc('expire_trials');
    if (rpcError) {
      console.error('[cron/expire-trials] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // 2. Count how many were expired for logging
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'trial')
      .lt('trial_end_date', new Date().toISOString())
      .eq('is_trial_active', true);

    if (count && count > 0) {
      console.warn(`[cron/expire-trials] ${count} trials still need expiration — may need manual check`);
    }

    console.log('[cron/expire-trials] Completed successfully');
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[cron/expire-trials] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
