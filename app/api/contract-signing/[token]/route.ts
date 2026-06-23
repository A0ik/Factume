import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/signing-token';
import { dbToContractTemplate } from '@/lib/labor-law/contract-data-utils';

const TABLE_MAP: Record<string, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // ARGOS (HMAC) — vérifie la signature du token, renvoie l'UUID à chercher en BDD.
    const tokenId = verifyToken(token);
    if (!tokenId) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
    }
    const admin = createAdminClient();

    // Chercher le token
    const { data: tokenRecord, error: tokenError } = await admin
      .from('contract_signing_tokens')
      .select('*')
      .eq('token', tokenId)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
    }

    // Verifier expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 });
    }

    // Verifier si deja signe
    if (tokenRecord.signed_at) {
      return NextResponse.json({ error: 'already_signed', signedAt: tokenRecord.signed_at }, { status: 200 });
    }

    // Incrémenter le compteur de vues et mettre à jour last_viewed_at
    await admin
      .from('contract_signing_tokens')
      .update({
        view_count: (tokenRecord.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    // Logger la vue (si c'est une nouvelle vue, pas un rechargement)
    // On peut le faire de manière asynchrone sans bloquer la réponse
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    // Fire and forget - ignorer les erreurs de log
    (async () => {
      try {
        await admin.from('contract_signature_logs').insert({
          contract_id: tokenRecord.contract_id,
          contract_type: tokenRecord.contract_type,
          token_id: tokenRecord.id,
          event_type: 'link_opened',
          ip_address: ipAddress,
          user_agent: req.headers.get('user-agent') || null,
          metadata: { view_count: (tokenRecord.view_count || 0) + 1 },
        });
      } catch {
        // Ignorer les erreurs de log
      }
    })();

    // Recuperer le contrat
    const tableName = TABLE_MAP[tokenRecord.contract_type];
    if (!tableName) {
      return NextResponse.json({ error: 'Type de contrat invalide' }, { status: 400 });
    }

    const { data: contract, error: contractError } = await admin
      .from(tableName)
      .select('*')
      .eq('id', tokenRecord.contract_id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }

    // Recuperer le profil employeur
    const { data: profile } = await admin
      .from('profiles')
      .select('company_name, logo_url, accent_color, first_name, last_name, email')
      .eq('id', tokenRecord.user_id)
      .single();

    return NextResponse.json({
      contract: { ...contract, contract_type: tokenRecord.contract_type },
      contractType: tokenRecord.contract_type,
      profile: profile || null,
      tokenRecord: {
        id: tokenRecord.id,
        employee_email: tokenRecord.employee_email,
        expires_at: tokenRecord.expires_at,
        signed_at: tokenRecord.signed_at,
        view_count: (tokenRecord.view_count || 0) + 1,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API Error]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
