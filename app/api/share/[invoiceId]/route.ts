import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { verifyShareToken } from '@/lib/share-token';

/**
 * GET /api/share/[invoiceId]?t=<token>
 *
 * Public share link for an invoice. Requires a valid token with expiration check.
 * Tokens are non-deterministic (random nonce) and expire after 30 days.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;

  // --- Token verification (with expiration) ---
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 403 });

  if (!verifyShareToken(invoiceId, token)) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: invoice, error } = await admin
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only expose public profile fields
  const { data: profile } = await admin
    .from('profiles')
    .select('company_name,address,city,postal_code,country,phone,siret,logo_url,accent_color,language,currency,payment_terms')
    .eq('id', invoice.user_id)
    .single();

  return NextResponse.json({ invoice, profile });
}
