import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// Helper pour logger les événements de signature
async function logQuoteSignatureEvent(
  admin: any,
  quoteId: string,
  eventType: string,
  tokenId: string,
  metadata: Record<string, any> = {},
  req?: NextRequest
) {
  try {
    await admin.from('quote_signature_logs').insert({
      quote_id: quoteId,
      token_id: tokenId,
      event_type: eventType,
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent') || null,
      metadata,
    });
  } catch (err) {
    console.error('Erreur log signature devis:', err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { signatureDataUrl, signerName } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    if (!signatureDataUrl || !signerName) {
      return NextResponse.json({ error: 'Données de signature manquantes' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Récupérer le token
    const { data: tokenRecord, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    // Vérifier si le token n'est pas expiré
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Log la signature
    await logQuoteSignatureEvent(
      admin,
      tokenRecord.quote_id,
      'quote_signed',
      tokenRecord.id,
      { signerName, signatureSize: signatureDataUrl.length },
      req
    );

    // Mettre à jour le token avec les infos de signature
    await admin
      .from('quote_signing_tokens')
      .update({
        signed_at: new Date().toISOString(),
        signer_name: signerName,
        signature_data_url: signatureDataUrl,
      })
      .eq('id', tokenRecord.id);

    // Mettre à jour le statut du devis
    await admin
      .from('invoices')
      .update({
        status: 'accepted', // Le devis est accepté une fois signé
        signed_at: new Date().toISOString(),
        signed_by: signerName,
        client_signature_url: signatureDataUrl,
      })
      .eq('id', tokenRecord.quote_id);

    return NextResponse.json({
      success: true,
      message: 'Devis signé avec succès'
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
