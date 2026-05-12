import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRequisition, storeNordigenConnection } from '@/lib/nordigen/client';

/**
 * POST /api/banking/link
 * Generate a link for user to connect their bank account
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { institutionId, redirectUri } = body;

    if (!redirectUri) {
      return NextResponse.json(
        { success: false, error: 'redirectUri is required' },
        { status: 400 }
      );
    }

    // Create Nordigen requisition
    const requisition = await createRequisition(
      `${process.env.NEXT_PUBLIC_APP_URL}${redirectUri}`,
      institutionId
    );

    // Store requisition ID temporarily (will be completed in callback)
    await supabase
      .from('nordigen_connections')
      .insert({
        user_id: user.id,
        institution_id: institutionId || 'PENDING',
        institution_name: 'En attente de connexion',
        account_id: requisition.id, // Store requisition ID temporarily
        status: 'pending',
      });

    return NextResponse.json({
      success: true,
      data: {
        link: requisition.link,
        requisitionId: requisition.id,
      },
    });
  } catch (error) {
    console.error('Error creating bank link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bank link' },
      { status: 500 }
    );
  }
}
