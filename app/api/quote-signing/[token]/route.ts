import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

interface TokenRecord {
  id: string;
  token: string;
  quote_id: string;
  expires_at: string;
  signed_at: string | null;
  view_count: number;
  client_name: string;
  client_email: string;
  quote: {
    id: string;
    number: string;
    issue_date: string;
    due_date: string;
    total: number;
    status: string;
    notes: string | null;
    client_id: string | null;
    user_id: string;
  };
}

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

    // Récupérer le token avec les données du devis
    const { data: tokenRecord, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .select(`
        *,
        quote:quote_id(
          id,
          number,
          issue_date,
          due_date,
          total,
          status,
          notes,
          client_id,
          user_id
        )
      `)
      .eq('token', token)
      .single() as { data: TokenRecord | null; error: any };

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

    // Récupérer le client si client_id existe
    let client = null;
    if (tokenRecord.quote.client_id) {
      const { data: clientData } = await admin
        .from('clients')
        .select('name, email, phone, address, city, postal_code')
        .eq('id', tokenRecord.quote.client_id)
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
      .eq('id', tokenRecord.quote.user_id)
      .single();

    return NextResponse.json({
      contract: tokenRecord.quote,
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
