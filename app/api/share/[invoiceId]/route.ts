import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

/**
 * GET /api/share/[invoiceId]?t=<hmac_token>
 *
 * Public share link for an invoice. Requires a valid HMAC token derived from
 * the invoice ID and a server-side secret. Without the token the request is
 * rejected — this prevents enumeration of invoice UUIDs.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;

  // --- HMAC token verification ---
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 403 });

  const expected = generateShareToken(invoiceId);
  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
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

/**
 * Generate an HMAC-SHA256 token for a given invoice ID.
 * Tokens are deterministic — the same invoice always produces the same token.
 * Re-exported from lib for use in other modules.
 */
import { generateShareToken } from '@/lib/share-token';
