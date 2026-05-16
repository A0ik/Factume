import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-pennylane-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 401 });
    }

    // Validate HMAC-SHA256 signature
    const PENNYLANE_WEBHOOK_SECRET = process.env.PENNYLANE_WEBHOOK_SECRET;
    if (!PENNYLANE_WEBHOOK_SECRET) {
      console.error('PENNYLANE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const computed = createHmac('sha256', PENNYLANE_WEBHOOK_SECRET).update(rawBody).digest('hex');
    try {
      if (!timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
        return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const admin = createAdminClient();

    if (body.event === 'supplier_invoice.payment_status_changed' && body.supplier_invoice) {
      const externalRef = body.supplier_invoice.reference;
      if (externalRef && body.supplier_invoice.payment_status === 'paid') {
        const { data: expenses } = await admin
          .from('expenses')
          .select('id, notes')
          .like('notes', `%exported:pennylane%${externalRef}%`)
          .limit(1);

        if (expenses?.[0]) {
          await admin
            .from('expenses')
            .update({ notes: `${(expenses[0] as { id: string; notes?: string }).notes || ''} [paid_via_pennylane:${new Date().toISOString()}]` })
            .eq('id', expenses[0].id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
