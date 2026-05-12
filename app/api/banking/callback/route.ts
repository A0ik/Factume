import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getRequisition,
  getAccount,
  getAccountIban,
  deleteRequisition,
  storeNordigenConnection,
} from '@/lib/nordigen/client';

/**
 * GET /api/banking/callback
 * Handle OAuth callback from Nordigen after user connects their bank
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requisitionId = searchParams.get('ref');

    if (!requisitionId) {
      return NextResponse.redirect(
        new URL('/settings/banking?error=no_requisition', request.url)
      );
    }

    // Get requisition details
    const requisition = await getRequisition(requisitionId);

    if (requisition.status !== 'LN') {
      return NextResponse.redirect(
        new URL('/settings/banking?error=not_completed', request.url)
      );
    }

    // Get the first account ID from the requisition
    const accountId = requisition.accounts?.[0];
    if (!accountId) {
      return NextResponse.redirect(
        new URL('/settings/banking?error=no_account', request.url)
      );
    }

    // Get account details
    const account = await getAccount(accountId, requisition.secret || '');
    const ibanData = await getAccountIban(accountId, requisition.secret || '');

    // Get institution details
    const institutions = await fetch(
      `https://ob.nordigen.com/api/v2/institutions/${requisition.institution_id}/`,
      {
        headers: {
          'Authorization': `Bearer ${requisition.secret || ''}`,
        },
      }
    ).then(r => r.json());

    // Find the pending connection for this user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: pendingConnection } = await supabase
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

    // Update the connection with actual account details
    const { error: updateError } = await supabase
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

    // Clean up requisition
    await deleteRequisition(requisitionId);

    // Redirect back to settings
    return NextResponse.redirect(
      new URL('/settings/banking?success=connected', request.url)
    );
  } catch (error) {
    console.error('Error in bank callback:', error);
    return NextResponse.redirect(
      new URL('/settings/banking?error=callback_failed', request.url)
    );
  }
}
