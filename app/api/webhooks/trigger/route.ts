import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

function getInternalSecret() {
  const secret = process.env.WEBHOOK_INTERNAL_SECRET;
  if (!secret) throw new Error('WEBHOOK_INTERNAL_SECRET environment variable is required');
  return secret;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== getInternalSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId: string; event: string; data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, event, data } = body;
  if (!userId || !event) {
    return NextResponse.json({ error: 'Missing userId or event' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('[webhook/trigger] Failed to fetch endpoints:', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const matchingEndpoints = (endpoints || []).filter(
    (ep: { events: string[] }) => ep.events.includes(event),
  );

  if (matchingEndpoints.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No matching endpoints' });
  }

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const results = await Promise.allSettled(
    matchingEndpoints.map(async (ep: { url: string; id: string }) => {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Facturme-Webhooks/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${ep.url}`);
      }
      return ep.id;
    }),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`[webhook/trigger] event=${event} sent=${succeeded} failed=${failed}`);

  return NextResponse.json({ sent: succeeded, failed, total: matchingEndpoints.length });
}
