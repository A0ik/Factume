import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { generatePdfBuffer } from '@/lib/pdf-server';

export const maxDuration = 60;

/**
 * ASTRÉE (CIBLE 2b-tenant) — Téléchargement PDF d'une facture LOCATAIRE (table
 * `invoices`) depuis le cabinet. La facture appartient au compte du client lié ;
 * l'émetteur du PDF est donc le client (son profil), pas le cabinet.
 *
 * Sécurité : on vérifie que le client appartient au cabinet ET que la facture
 * appartient bien au user_id du client lié (sinon 404). Fin de l'im passe read-only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; invoiceId: string }> },
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Cabinet non trouvé' }, { status: 404 });

    const { clientId, invoiceId } = await params;

    // 1. Le client appartient bien à ce cabinet.
    const { data: client } = await admin
      .from('cabinet_clients')
      .select('id, client_user_id, cabinet_id')
      .eq('id', clientId)
      .eq('cabinet_id', cabinet.id)
      .maybeSingle();
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    // 2. La facture locataire.
    const { data: invoice, error } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }
    // 3. Elle doit appartenir au compte du client lié.
    if (!client.client_user_id || invoice.user_id !== client.client_user_id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // 4. Profil émetteur = le client (sa propre facture).
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', invoice.user_id)
      .maybeSingle();

    const pdfBuffer = await Promise.race([
      generatePdfBuffer(invoice, profile),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 30000),
      ),
    ]);

    const filename = `${(invoice.number || invoiceId).replace(/[/\r\n"']/g, '-')}.pdf`;
    const mode = req.nextUrl.searchParams.get('mode');
    const disposition = mode === 'preview'
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[cabinet-client-invoice-pdf] Error:', error.message);
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 });
  }
}
