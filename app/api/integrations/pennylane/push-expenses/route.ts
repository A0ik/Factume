import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { PennylaneClient } from '@/lib/pennylane-client';
import { getCategoryAccountCode } from '@/lib/plan-comptable';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { expense_ids } = await req.json();
    if (!expense_ids?.length) return NextResponse.json({ error: 'Aucune dépense sélectionnée' }, { status: 400 });

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

    const { data: expenses } = await admin
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .in('id', expense_ids);

    if (!expenses?.length) return NextResponse.json({ error: 'Aucune dépense trouvée' }, { status: 404 });

    const client = new PennylaneClient(integration.config.api_key);
    const results: Array<{ id: string; success: boolean; external_id?: string; error?: string }> = [];

    for (const expense of expenses) {
      try {
        const accountCode = getCategoryAccountCode(expense.category);
        const vatRate = expense.vat_rate || 20;
        const amountHt = expense.amount / (1 + vatRate / 100);
        const vatAmount = expense.amount - amountHt;

        const result = await client.pushSupplierInvoice({
          vendor: expense.vendor || expense.label || 'Fournisseur inconnu',
          amount_ht: Math.round(amountHt * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          total_ttc: expense.amount,
          date: expense.date,
          category: expense.category || 'other',
          account_code: accountCode,
          vat_rate: vatRate,
          payment_method: expense.payment_method,
        });

        await admin
          .from('expenses')
          .update({ notes: `${expense.notes || ''} [exported:pennylane:${new Date().toISOString()}]` })
          .eq('id', expense.id);

        results.push({ id: expense.id, success: true, external_id: result.id });
      } catch (err: any) {
        results.push({ id: expense.id, success: false, error: err.message });
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
