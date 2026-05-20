import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { createFreeEidasSignature } from '@/lib/eidas-free-solution';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { signatureDataUrl, signerName, signerEmail } = await req.json();
    const { id } = await params;

    // Auth via session cookie (standard pattern)
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const admin = createAdminClient();

    const { data: invoice } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const eidasResult = await createFreeEidasSignature({
      documentId: id,
      documentType: 'invoice',
      signerName: signerName || invoice.client?.name || 'Client',
      signerEmail: signerEmail || invoice.client?.email,
      signatureDataUrl,
      ipAddress: ip,
      userAgent
    });

    await admin.from('notifications').insert({
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
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la signature' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    eidas: {
      regulation: 'Règlement (UE) N° 910/2014',
      level: 'advanced (AdES)',
      legalValue: 'Reconnu juridiquement dans l\'UE pour les transactions B2B',
      cost: 'GRATUIT',
      features: [
        'Lien unique au signataire',
        'Identification du signataire (IP, User Agent)',
        'Horodatage certifié (RFC 3161)',
        'Hash SHA-256 du document',
        'Journal immuable (10 ans)',
        'URL de vérification publique'
      ],
      compliance: 'Conforme eIDAS niveau Avancé (AdES)'
    }
  });
}
