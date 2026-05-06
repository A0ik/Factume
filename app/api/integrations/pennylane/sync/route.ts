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

    const client = new PennylaneClient(integration.config.api_key);
    const suppliers = await client.fetchSuppliers();

    let synced = 0;
    for (const supplier of suppliers) {
      const exists = await admin
        .from('vendor_mappings')
        .select('id')
        .eq('user_id', user.id)
        .ilike('vendor_name_pattern', supplier.name)
        .maybeSingle();

      if (!exists) {
        await admin.from('vendor_mappings').insert({
          user_id: user.id,
          vendor_name_pattern: supplier.name,
          account_code: '401000',
          account_name: `Fournisseur ${supplier.name}`,
        });
        synced++;
      }
    }

    await admin
      .from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id);

    return NextResponse.json({ success: true, suppliersSynced: synced, totalSuppliers: suppliers.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
