import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { PennylaneClient } from '@/lib/pennylane-client';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { invoice_ids } = await req.json();
    if (!invoice_ids?.length) return NextResponse.json({ error: 'Aucune facture sélectionnée' }, { status: 400 });

    const { data: integration } = await admin
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'pennylane')
      .eq('status', 'connected')
      .single();

    if (!integration?.config?.api_key) {
      return NextResponse.json({ error: 'Pennylane non connecté' }, { status: 400 });
    }

    const { data: invoices } = await admin
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .in('id', invoice_ids);

    if (!invoices?.length) return NextResponse.json({ error: 'Aucune facture trouvée' }, { status: 404 });

    const client = new PennylaneClient(integration.config.api_key);
    const results: Array<{ id: string; success: boolean; external_id?: string; error?: string }> = [];

    for (const invoice of invoices) {
      try {
        const items = (invoice.items || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate || 20,
          account_code: '706000',
        }));

        const result = await client.pushCustomerInvoice({
          client_name: invoice.client_name_override || invoice.client_email || 'Client',
          amount_ht: invoice.subtotal,
          vat_amount: invoice.vat_amount,
          total_ttc: invoice.total,
          date: invoice.issue_date,
          due_date: invoice.due_date,
          invoice_number: invoice.number,
          items,
        });

        await admin
          .from('invoices')
          .update({ internal_notes: `${invoice.internal_notes || ''} [exported:pennylane:${new Date().toISOString()}]` })
          .eq('id', invoice.id);

        results.push({ id: invoice.id, success: true, external_id: result.id });
      } catch (err: any) {
        results.push({ id: invoice.id, success: false, error: err.message });
      }
    }

    await admin
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id);

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ success: true, pushed: successCount, total: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
