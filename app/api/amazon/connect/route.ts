import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/amazon/connect
 * Initiate Amazon Seller Central connection
 */
export async function POST(request: NextRequest) {
  try {
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
    const { marketplaceId } = body;

    if (!marketplaceId) {
      return NextResponse.json(
        { success: false, error: 'marketplaceId is required' },
        { status: 400 }
      );
    }

    // Generate LWA authorization URL
    const state = crypto.randomUUID();
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/amazon/callback`;

    const authUrl = new URL('https://sellercentral.amazon.com/apps/authorize/consent');
    authUrl.searchParams.set('application_id', process.env.AMAZON_APP_ID!);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    // Store state temporarily for verification
    await supabase
      .from('amazon_connections')
      .insert({
        user_id: user.id,
        seller_id: state, // Temporary storage
        marketplace_id: marketplaceId,
        refresh_token: 'PENDING',
        status: 'pending',
      });

    return NextResponse.json({
      success: true,
      data: {
        authUrl: authUrl.toString(),
        state,
      },
    });
  } catch (error) {
    console.error('Error creating Amazon connection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
