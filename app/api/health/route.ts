import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<'ok' | 'down'> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return error ? 'down' : 'ok';
  } catch {
    return 'down';
  }
}

async function checkStripe(): Promise<'ok' | 'down'> {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return 'down';
    // Actually ping Stripe to confirm the key is valid and the API is reachable
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export async function GET() {
  const services: Record<string, 'ok' | 'down'> = {};
  let overall: 'ok' | 'degraded' | 'down' = 'ok';

  // Run checks in parallel
  const [dbStatus, stripeStatus] = await Promise.all([
    checkDatabase(),
    checkStripe(),
  ]);

  services.database = dbStatus;
  services.stripe = stripeStatus;

  if (dbStatus === 'down' || stripeStatus === 'down') {
    overall = dbStatus === 'down' && stripeStatus === 'down' ? 'down' : 'degraded';
  }

  return NextResponse.json(
    {
      status: overall,
      services,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
    { status: overall === 'down' ? 503 : 200 }
  );
}
