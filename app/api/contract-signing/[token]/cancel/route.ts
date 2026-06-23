import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/signing-token';

const TABLE_MAP: Record<string, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // ARGOS (HMAC) — vérifie la signature du token.
    const tokenId = verifyToken(token);
    if (!tokenId) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
    }
    const admin = createAdminClient();

    // Verifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le token avec les infos du contrat
    const { data: tokenRecord } = await admin
      .from('contract_signing_tokens')
      .select('*')
      .eq('token', tokenId)
      .single();

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Token introuvable' }, { status: 404 });
    }

    // Vérifier que le contrat appartient à l'utilisateur
    if (tokenRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Ne peut annuler que si pas encore signé
    if (tokenRecord.signed_at) {
      return NextResponse.json({ error: 'Ce contrat a déjà été signé, impossible d\'annuler' }, { status: 400 });
    }

    // Supprimer le token
    await admin
      .from('contract_signing_tokens')
      .delete()
      .eq('token', tokenId);

    // Remettre le statut du contrat à 'draft'
    const tableName = TABLE_MAP[tokenRecord.contract_type];
    if (tableName) {
      await admin
        .from(tableName)
        .update({ document_status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', tokenRecord.contract_id);
    }

    // Logger l'annulation
    try {
      await admin.from('contract_signature_logs').insert({
        contract_id: tokenRecord.contract_id,
        contract_type: tokenRecord.contract_type,
        token_id: tokenRecord.id,
        event_type: 'token_cancelled',
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
        metadata: { cancelled_by: user.id },
      });
    } catch { /* ignore log errors */ }

    return NextResponse.json({ success: true, message: 'Demande de signature annulée' });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
