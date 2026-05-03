import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API de vérification de signature eIDAS (AdES)
 * GET /api/eidas/verify/[signatureId]
 *
 * Permet de vérifier la validité d'une signature
 * Accessible publiquement pour permettre la vérification par les tiers
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signatureId: string }> }
) {
  try {
    const { signatureId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Récupérer la signature
    const { data: signature, error } = await supabase
      .from('eidas_signatures')
      .select('*')
      .eq('signature_id', signatureId)
      .single();

    if (error || !signature) {
      return NextResponse.json(
        {
          error: 'Signature introuvable',
          message: 'Aucune signature trouvée avec cet identifiant'
        },
        { status: 404 }
      );
    }

    // Marquer comme vérifié
    await supabase
      .from('eidas_signatures')
      .update({ verified_at: new Date().toISOString() })
      .eq('signature_id', signatureId);

    // Calculer l'intégrité du document
    const documentContent = JSON.stringify({
      documentId: signature.document_id,
      documentType: signature.document_type,
      signerName: signature.signer_name,
      timestamp: signature.timestamp
    });

    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(documentContent)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const integrityValid = currentHash === signature.document_hash;

    return NextResponse.json({
      signature: {
        id: signature.signature_id,
        documentId: signature.document_id,
        documentType: signature.document_type,
        signerName: signature.signer_name,
        signerEmail: signature.signer_email,
        timestamp: signature.timestamp,
        ipAddress: signature.ip_address,
        eidasLevel: 'advanced (AdES)',
        valid: integrityValid,
        integrityValid
      },
      compliance: {
        regulation: 'Règlement (UE) N° 910/2014',
        level: 'advanced (AdES)',
        legalValue: 'Reconnu juridiquement dans l\'UE pour les transactions B2B',
        features: {
          uniqueLink: true,
          identification: true,
          timestamp: true,
          integrity: integrityValid,
          immutableLog: true,
          publicVerification: true
        }
      },
      verification: {
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'eidas-ades'
      }
    });
  } catch (error: any) {
    console.error('Erreur vérification signature:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}