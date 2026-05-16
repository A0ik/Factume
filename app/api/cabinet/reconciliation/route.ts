import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { transactionId, clientUserId, status } = await req.json();
    if (!transactionId || !clientUserId || !status) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 });
    }

    // Verify the accountant has access to this client
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const clients = await getCabinetClients(cabinet.id);
    const isClientOfCabinet = clients.some((c: any) => c.client_user_id === clientUserId && c.status === 'active');
    if (!isClientOfCabinet) {
      return NextResponse.json({ error: 'Client non autorise' }, { status: 403 });
    }

    // Update the transaction status
    const { error } = await admin
      .from('bank_transactions')
      .update({ status })
      .eq('id', transactionId)
      .eq('user_id', clientUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
