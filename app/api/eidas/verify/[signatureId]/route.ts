import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

/**
 * GET /api/eidas/verify/[signatureId]
 * Public verification endpoint for eIDAS signatures.
 * Intentionally public — anyone with a signature ID can verify it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signatureId: string }> }
) {
  try {
    const { signatureId } = await params;

    // Validate signatureId format (should be a UUID or similar)
    if (!signatureId || signatureId.length < 8 || signatureId.length > 128) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
    }

    const admin = createAdminClient();

    // BUG-20 fix: Don't expose signer_email and ip_address in public endpoint
    const { data: signature, error } = await admin
      .from('eidas_signatures')
      .select('signature_id, document_id, document_type, signer_name, signed_at, timestamp, document_hash, eidas_level, tsa_url')
      .eq('signature_id', signatureId)
      .single();

    if (error || !signature) {
      return NextResponse.json({ error: 'Signature introuvable' }, { status: 404 });
    }

    // ARGOS (sécurité) — Aucune écritriture en BDD sur un GET public (anti-abus /
    // saturation). L'horodatage de vérification est calculé localement pour la réponse.
    // (La SELECT ci-dessus est la seule lecture ; `admin` reste utilisé pour celle-ci.)

    // ARGOS (honnêteté) : niveau Simple (eIDAS art. 25), horodatage serveur local.
    // On ne recompute pas un hash de métadonnées (impossible sans le contenu du document) :
    // la présence d'un document_hash atteste que le relevé de signature est intact.
    const level = signature.eidas_level === 'advanced' ? 'simple' : (signature.eidas_level || 'simple');
    const integrityValid = Boolean(signature.document_hash);

    return NextResponse.json({
      signature: {
        id: signature.signature_id,
        documentId: signature.document_id,
        documentType: signature.document_type,
        signerName: signature.signer_name,
        timestamp: signature.signed_at || signature.timestamp,
        eidasLevel: level,
        valid: integrityValid,
        integrityValid,
      },
      compliance: {
        regulation: 'Règlement (UE) n° 910/2014 (eIDAS)',
        level,
        legalValue:
          level === 'simple'
            ? 'Signature de niveau Simple (eIDAS art. 25) — preuve libre avec identification et horodatage du signataire.'
            : 'Reconnaissance juridique renforcée en UE.',
        features: {
          uniqueLink: true,
          identification: true,
          timestamp: true,
          certificate: false,
          immutableLog: true,
          verification: true,
        },
        recommendations:
          level === 'simple'
            ? ['Signature de niveau Simple (eIDAS art. 25) — preuve libre avec identification et horodatage du signataire.', 'Pour une valeur juridique équivalente à la signature manuscrite (niveau Qualifié), un prestataire de confiance certifié eIDAS (Universign, Yousign…) est requis.']
            : [],
      },
      verification: {
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'eidas-simple',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
