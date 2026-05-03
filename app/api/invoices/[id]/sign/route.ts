import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createFreeEidasSignature } from '@/lib/eidas-free-solution';

/**
 * API de signature de facture conforme eIDAS (AdES)
 * POST /api/invoices/[id]/sign
 *
 * Implémente la signature électronique conforme au règlement eIDAS (UE) N° 910/2014
 * Niveau Avancé (AdES) - 100% GRATUIT
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { signatureDataUrl, signerName, signerEmail } = await req.json();
    const { id } = await params;

    // Récupérer l'adresse IP pour traçabilité
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // User Agent pour identification du dispositif
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Récupérer les infos de la facture pour le contexte
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single();

    if (!invoice) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      );
    }

    // Créer la signature conforme eIDAS (AdES - GRATUIT)
    const eidasResult = await createFreeEidasSignature({
      documentId: id,
      documentType: 'invoice',
      signerName: signerName || invoice.client?.name || 'Client',
      signerEmail: signerEmail || invoice.client?.email,
      signatureDataUrl,
      ipAddress: ip,
      userAgent
    });

    // Créer une notification pour l'utilisateur
    await supabase.from('notifications').insert({
      user_id: invoice.user_id,
      type: 'invoice_signed',
      title: `Facture signée — ${invoice.number}`,
      body: `La facture de ${invoice.total?.toFixed(2) || '0'}€ a été signée par ${signerName || 'le client'}. Conformité eIDAS (AdES)`,
      link: `/invoices/${id}`,
      metadata: {
        signatureId: eidasResult.signatureId,
        eidasLevel: 'advanced',
        verificationUrl: eidasResult.verificationUrl
      }
    });

    return NextResponse.json({
      success: true,
      signatureUrl: eidasResult.signatureUrl,
      signatureId: eidasResult.signatureId,
      verificationUrl: eidasResult.verificationUrl,
      eidasLevel: 'advanced',
      eidasCompliant: true,
      timestamp: eidasResult.timestamp
    });
  } catch (error: any) {
    console.error('Erreur signature facture:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la signature' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invoices/[id]/sign
 * Retourne les informations de configuration eIDAS
 */
export async function GET() {
  return NextResponse.json({
    eidas: {
      regulation: 'Règlement (UE) N° 910/2014',
      level: 'advanced (AdES)',
      legalValue: 'Reconnu juridiquement dans l\'UE pour les transactions B2B',
      cost: 'GRATUIT',
      features: [
        '✅ Lien unique au signataire',
        '✅ Identification du signataire (IP, User Agent)',
        '✅ Horodatage certifié (RFC 3161)',
        '✅ Hash SHA-256 du document',
        '✅ Journal immuable (10 ans)',
        '✅ URL de vérification publique'
      ],
      compliance: 'Conforme eIDAS niveau Avancé (AdES)'
    }
  });
}
