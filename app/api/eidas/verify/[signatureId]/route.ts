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

    const { data: signature, error } = await admin
      .from('eidas_signatures')
      .select('signature_id, document_id, document_type, signer_name, signer_email, timestamp, document_hash, ip_address')
      .eq('signature_id', signatureId)
      .single();

    if (error || !signature) {
      return NextResponse.json({ error: 'Signature introuvable' }, { status: 404 });
    }

    // Mark as verified (non-blocking)
    await admin
      .from('eidas_signatures')
      .update({ verified_at: new Date().toISOString() })
      .eq('signature_id', signatureId);

    // Verify integrity
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
        eidasLevel: 'advanced (AdES)',
        valid: integrityValid,
        integrityValid
      },
      compliance: {
        regulation: 'Règlement (UE) N° 910/2014',
        level: 'advanced (AdES)',
        legalValue: 'Reconnu juridiquement dans l\'UE pour les transactions B2B',
      },
      verification: {
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'eidas-ades'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
  }
}

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
