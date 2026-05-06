import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-pennylane-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 401 });
    }

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
