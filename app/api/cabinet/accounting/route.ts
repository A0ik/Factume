import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

// PROMÉTHÉE (CIBLE 3 — C1+C2) — Agrégation comptable partagée d'un client cabinet :
// TVA (CA3) + compte de résultat + grand livre. Source = les factures/dépenses du
// TENANT lié (client_user_id). Un client manuel (sans tenant lié) renvoie des zéros.

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const now = new Date();
    const startDate = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endDate = to || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    let clientUserId: string | null = null;
    let clientName = 'Client';
    if (clientId) {
      const clients = await getCabinetClients(cabinet.id);
      const client: any = clients.find((c: any) => c.id === clientId);
      if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
      clientUserId = client.client_user_id;
      clientName = client.company_name || client.contact_name || client.profile?.company_name || 'Client';
    }

    const result: any = {
      clientName, clientId,
      period: { from: startDate, to: endDate },
      hasTenantData: !!clientUserId,
      tva: { collectee: 0, deductible: 0, aPayer: 0, credit: 0 },
      compteResultat: { produits: 0, charges: 0, resultat: 0 },
      chargesByCategory: [] as any[],
      operations: [] as any[],
    };
    if (!clientUserId) return NextResponse.json(result);

    // Ventes (factures du tenant lié)
    const { data: invs, error: invErr } = await admin
      .from('invoices')
      .select('id, number, subtotal, vat_amount, total, status, issue_date, client_name_override')
      .eq('user_id', clientUserId)
      .eq('document_type', 'invoice')
      .is('deleted_at', null)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate);
    if (invErr) console.warn('[cabinet/accounting] invoices:', invErr.message);

    const tvaCollectee = (invs || []).reduce((s: number, i: any) => s + (Number(i.vat_amount) || 0), 0);
    const produits = (invs || []).reduce((s: number, i: any) => s + (Number(i.subtotal) || 0), 0);

    // Achats (dépenses du tenant lié)
    const { data: exps, error: expErr } = await admin
      .from('expenses')
      .select('id, vendor, amount, vat_amount, category, date, is_deductible')
      .eq('user_id', clientUserId)
      .gte('date', startDate)
      .lte('date', endDate);
    if (expErr) console.warn('[cabinet/accounting] expenses:', expErr.message);

    const deductibleExps = (exps || []).filter((e: any) => e.is_deductible !== false);
    const tvaDeductible = deductibleExps.reduce((s: number, e: any) => s + (Number(e.vat_amount) || 0), 0);
    const htOf = (e: any) => {
      const ht = (Number(e.amount) || 0) - (Number(e.vat_amount) || 0);
      return ht > 0 ? ht : Number(e.amount) || 0;
    };
    const charges = deductibleExps.reduce((s: number, e: any) => s + htOf(e), 0);

    // Charges par catégorie (pour le détail du CR)
    const byCat: Record<string, number> = {};
    for (const e of deductibleExps) {
      const k = e.category || 'Autres';
      byCat[k] = (byCat[k] || 0) + htOf(e);
    }
    result.chargesByCategory = Object.entries(byCat).map(([category, amount]) => ({ category, amount }));

    const diff = tvaCollectee - tvaDeductible;
    result.tva = { collectee: tvaCollectee, deductible: tvaDeductible, aPayer: Math.max(0, diff), credit: Math.max(0, -diff) };
    result.compteResultat = { produits, charges, resultat: produits - charges };

    // Grand livre : opérations fusionnées (détail / crédit)
    const ops: any[] = [];
    for (const i of (invs || [])) {
      ops.push({
        id: i.id, date: i.issue_date, type: 'vente',
        label: `Vente ${i.number || ''}`.trim(), tiers: i.client_name_override || '',
        account: 'Ventes', debit: 0, credit: Number(i.subtotal) || 0,
      });
    }
    for (const e of (exps || [])) {
      ops.push({
        id: e.id, date: e.date, type: 'achat',
        label: e.vendor || 'Dépense', tiers: '',
        account: e.category || 'Achats', debit: htOf(e), credit: 0,
      });
    }
    ops.sort((a, b) => (a.date < b.date ? 1 : -1));
    result.operations = ops;

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[cabinet/accounting] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
