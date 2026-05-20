import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  getRequisition,
  getAccount,
  getAccountIban,
  deleteRequisition,
} from '@/lib/nordigen/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requisitionId = searchParams.get('ref');

    if (!requisitionId) {
      return NextResponse.redirect(
        new URL('/settings/banking?error=no_requisition', request.url)
      );
    }

    const requisition = await getRequisition(requisitionId);

    if (requisition.status !== 'LN') {
      return NextResponse.redirect(
        new URL('/settings/banking?error=not_completed', request.url)
      );
    }

    const accountId = requisition.accounts?.[0];
    if (!accountId) {
      return NextResponse.redirect(
        new URL('/settings/banking?error=no_account', request.url)
      );
    }

    const account = await getAccount(accountId, requisition.secret || '');
    const ibanData = await getAccountIban(accountId, requisition.secret || '');

    const institutions = await fetch(
      `https://ob.nordigen.com/api/v2/institutions/${requisition.institution_id}/`,
      {
        headers: {
          'Authorization': `Bearer ${requisition.secret || ''}`,
        },
      }
    ).then(r => r.json());

    const admin = createAdminClient();

    const { data: pendingConnection } = await admin
      .from('nordigen_connections')
      .select('*')
      .eq('account_id', requisitionId)
      .eq('status', 'pending')
      .single();

    if (!pendingConnection) {
      return NextResponse.redirect(
        new URL('/settings/banking?error=no_pending_connection', request.url)
      );
    }

    const { error: updateError } = await admin
      .from('nordigen_connections')
      .update({
        institution_id: requisition.institution_id,
        institution_name: institutions.name || 'Banque connectée',
        account_id: accountId,
        account_iban: ibanData.iban,
        account_name: account.owner_name || 'Compte bancaire',
        status: 'active',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingConnection.id);

    if (updateError) {
      console.error('Error updating connection:', updateError);
    }

    await deleteRequisition(requisitionId);

    return NextResponse.redirect(
      new URL('/settings/banking?success=connected', request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL('/settings/banking?error=callback_failed', request.url)
    );
  }
}
