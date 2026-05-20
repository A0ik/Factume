import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminClient();

    // Resolve the token — admin client needed to read portal tokens
    const { data: portalToken, error: tokenError } = await admin
      .from('client_portal_tokens')
      .select('client_id, user_id, expires_at, client:clients(*)')
      .eq('token', token)
      .single();

    if (tokenError || !portalToken) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    // Check token expiry
    if (portalToken.expires_at && new Date(portalToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Profile of the freelancer — only expose public-facing fields
    const { data: profile } = await admin
      .from('profiles')
      .select('company_name,address,city,postal_code,country,phone,siret,logo_url,accent_color,language,currency,payment_terms')
      .eq('id', portalToken.user_id)
      .single();

    // All non-draft invoices for this client
    const { data: invoices } = await admin
      .from('invoices')
      .select('id, number, status, issue_date, due_date, total, currency, paid_at, items:invoice_items(*)')
      .eq('client_id', portalToken.client_id)
      .eq('user_id', portalToken.user_id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      client: portalToken.client,
      profile,
      invoices: invoices || [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
