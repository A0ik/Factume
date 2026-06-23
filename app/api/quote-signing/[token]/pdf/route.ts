import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/signing-token';
import { generatePdfBuffer, getDocLabel } from '@/lib/pdf';

/**
 * Route PUBLIQUE de génération PDF d'un devis (coté client signataire).
 * Pas d'auth : l'accès est autorisé par le token de signature (valide + non expiré).
 * Utilise le générateur canonique generatePdfBuffer (pdf-lib puis @react-pdf/renderer).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // ARGOS (HMAC) — vérifie la signature du token.
    const tokenId = verifyToken(token);
    if (!tokenId) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: tokenRecord, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .select('id, quote_id, expires_at, signed_at')
      .eq('token', tokenId)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    // Le PDF reste consultable même après signature (utile au client).
    // On ne bloque que l'expiration.
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    const { data: quote, error: quoteError } = await admin
      .from('invoices')
      .select('*')
      .eq('id', tokenRecord.quote_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', quote.user_id)
      .single();

    const pdfBytes = await generatePdfBuffer(quote, profile);
    const label = getDocLabel(quote);
    const safeNumber = String(quote.number || quote.id).replace(/[^\w-]/g, '-');
    const filename = `${label}_${safeNumber}.pdf`;

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[quote-signing/pdf] erreur:', err?.message);
    return NextResponse.json(
      { error: 'Impossible de générer le PDF.' },
      { status: 500 }
    );
  }
}
