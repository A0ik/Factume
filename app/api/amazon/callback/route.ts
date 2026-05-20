import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getAccessToken, getMarketplaceParticipations } from '@/lib/amazon/sp-api-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const sellingPartnerId = searchParams.get('selling_partner_id');
    const spapiOAuthCode = searchParams.get('spapi_oauth_code');

    if (!state || !spapiOAuthCode) {
      return NextResponse.redirect(
        new URL('/settings/amazon?error=missing_params', request.url)
      );
    }

    const admin = createAdminClient();

    // Find pending connection using state as lookup key
    const { data: pendingConnection } = await admin
      .from('amazon_connections')
      .select('*')
      .eq('seller_id', state)
      .eq('status', 'pending')
      .single();

    if (!pendingConnection) {
      return NextResponse.redirect(
        new URL('/settings/amazon?error=no_pending_connection', request.url)
      );
    }

    // Exchange OAuth code for refresh token
    const tokenResponse = await fetch(
      'https://api.amazon.com/auth/o2/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: spapiOAuthCode,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/amazon/callback`,
          client_id: process.env.AMAZON_CLIENT_ID,
          client_secret: process.env.AMAZON_CLIENT_SECRET,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange OAuth code');
    }

    const tokenData = await tokenResponse.json();

    const accessTokenData = await getAccessToken(tokenData.refresh_token);

    const participations = await getMarketplaceParticipations(
      accessTokenData.access_token
    );

    if (!participations || participations.length === 0) {
      throw new Error('No marketplace participations found');
    }

    await admin
      .from('amazon_connections')
      .update({
        seller_id: sellingPartnerId || participations[0].marketplaceId,
        refresh_token: tokenData.refresh_token,
        access_token: accessTokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        status: 'active',
        seller_name: 'Amazon Seller',
      })
      .eq('id', pendingConnection.id);

    return NextResponse.redirect(
      new URL('/settings/amazon?success=connected', request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL('/settings/amazon?error=callback_failed', request.url)
    );
  }
}
