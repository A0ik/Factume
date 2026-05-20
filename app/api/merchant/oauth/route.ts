import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider) {
    return NextResponse.json({ error: 'Provider required' }, { status: 400 });
  }

  // Auth check
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // Generate a secure state parameter with timestamp
  const state = Buffer.from(JSON.stringify({ provider, userId: user.id, timestamp: Date.now() })).toString('base64');

  // Set state cookie for CSRF protection in callback
  const oauthUrls: Record<string, string> = {
    amazon: 'https://sellercentral.amazon.com/ap/oa',
    orange: 'https://api.orange.com/oauth/v2/authorize',
    uber: 'https://login.uber.com/oauth/v2/authorize',
    apple: 'https://appleid.apple.com/auth/authorize',
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  };

  const authUrl = oauthUrls[provider];

  if (authUrl) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env[`MERCHANT_${provider.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/merchant/callback`,
      scope: getScopeForProvider(provider),
      state: state,
    });

    const res = NextResponse.redirect(`${authUrl}?${params.toString()}`);
    res.cookies.set('merchant_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    return res;
  }

  return NextResponse.json({
    message: 'OAuth flow not configured for this provider',
    provider,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { provider, credentials } = await req.json();

    const admin = createAdminClient();
    const { data: conn, error } = await admin
      .from('merchant_connections')
      .insert({
        user_id: user.id,
        provider,
        provider_account_id: `mock_${provider}_${Date.now()}`,
        credentials_encrypted: JSON.stringify(credentials),
        status: 'active',
        auto_import: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, connection: conn });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function getScopeForProvider(provider: string): string {
  const scopes: Record<string, string> = {
    amazon: 'sellingpartnerapi::migration',
    orange: 'openid profile email',
    uber: 'profile history request',
    apple: 'name email',
    google: 'openid profile email',
    microsoft: 'openid profile email',
  };
  return scopes[provider] || 'openid profile';
}
