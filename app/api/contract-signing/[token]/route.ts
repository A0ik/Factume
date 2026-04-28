import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

const TABLE_MAP: Record<string, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminClient();

    // Chercher le token
    const { data: tokenRecord, error: tokenError } = await admin
      .from('contract_signing_tokens')
      .select('*')
      .eq('token', token)
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
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
