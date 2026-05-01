import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Récupérer le token (sans jointure pour éviter les problèmes de relation)
    const { data: tokenRecord, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      console.error('Erreur récupération token:', tokenError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    // Vérifier si le token n'est pas expiré
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Vérifier si le devis a déjà été signé
    if (tokenRecord.signed_at) {
      return NextResponse.json({ error: 'already_signed' }, { status: 400 });
    }

    // Récupérer le devis séparément
    const { data: quote, error: quoteError } = await admin
      .from('invoices')
      .select('id, number, issue_date, due_date, total, status, notes, client_id, user_id')
      .eq('id', tokenRecord.quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('Erreur récupération devis:', quoteError);
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    // Récupérer le client si client_id existe
    let client = null;
    if (quote.client_id) {
      const { data: clientData } = await admin
        .from('clients')
        .select('name, email, phone, address, city, postal_code')
        .eq('id', quote.client_id)
        .single();
      client = clientData;
    } else {
      // Si pas de client_id, utiliser les données stockées dans le token
      client = {
        name: tokenRecord.client_name,
        email: tokenRecord.client_email,
        phone: null,
        address: null,
        city: null,
        postal_code: null,
      };
    }

    // Incrémenter le compteur de vues
    await admin
      .from('quote_signing_tokens')
      .update({ view_count: (tokenRecord.view_count || 0) + 1 })
      .eq('id', tokenRecord.id);

    // Récupérer le profil de l'utilisateur pour les couleurs
    const { data: profile } = await admin
      .from('profiles')
      .select('accent_color, company_name')
      .eq('id', quote.user_id)
      .single();

    return NextResponse.json({
      contract: quote,
      client,
      profile,
      tokenRecord: {
        id: tokenRecord.id,
        viewCount: (tokenRecord.view_count || 0) + 1,
        expiresAt: tokenRecord.expires_at,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
