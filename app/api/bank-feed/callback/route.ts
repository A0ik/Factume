import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/banking/connect?error=access_denied', req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/banking/connect?error=no_code', req.url));
    }

    if (!state) {
      return NextResponse.redirect(new URL('/banking/connect?error=missing_state', req.url));
    }

    const admin = createAdminClient();

    // Validate the state parameter against stored OAuth states to prevent user_id injection
    const { data: stateRecord, error: stateError } = await admin
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single();

    if (stateError || !stateRecord) {
      return NextResponse.redirect(new URL('/banking/connect?error=invalid_state', req.url));
    }

    // Check if the state token has expired
    if (new Date(stateRecord.expires_at) < new Date()) {
      // Clean up expired state
      await admin.from('oauth_states').delete().eq('state', state);
      return NextResponse.redirect(new URL('/banking/connect?error=expired_state', req.url));
    }

    // Use the validated user_id from the stored state, not from the callback parameter
    const validatedUserId = stateRecord.user_id;

    // Clean up the used state token (one-time use)
    await admin.from('oauth_states').delete().eq('state', state);

    const clientId = process.env.BRIDGE_CLIENT_ID;
    const clientSecret = process.env.BRIDGE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/banking/connect?error=config_missing', req.url));
    }

    const tokenRes = await fetch('https://api.bridgeapi.io/v2/authenticate', {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/banking/connect?error=token_failed', req.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const accountsRes = await fetch('https://api.bridgeapi.io/v2/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
        'Client-Secret': clientSecret,
      },
    });

    const accountsData = await accountsRes.json();
    const accounts = accountsData.resources || [];
    const firstAccount = accounts[0];

    if (firstAccount) {
      const bankName = firstAccount.bank?.name || 'Banque connectée';

      await admin.from('bank_connections').insert({
        user_id: validatedUserId,
        provider: 'bridge',
        connection_id: firstAccount.connection_id?.toString(),
        access_token: accessToken,
        bank_name: bankName,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      });
    }

    return NextResponse.redirect(new URL('/banking/connect?success=true', req.url));
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/banking/connect?error=${encodeURIComponent(err.message)}`, req.url));
  }
}
