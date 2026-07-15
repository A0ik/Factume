import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';
import { cabinetInvoiceToPdfInputs } from '@/lib/cabinet-pdf';
import { generatePdfBuffer } from '@/lib/pdf-server';

export const maxDuration = 60;

/**
 * ASTRÉE (CIBLE 2b) — Téléchargement / aperçu PDF d'une facture d'honoraires cabinet.
 * Réutilise le moteur pdf-lib unifié via la normalisation lib/cabinet-pdf.
 * Auth Bearer (cohérent avec les autres routes cabinet). ?mode=preview → inline.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;

    const { data: ci, error } = await admin
      .from('cabinet_invoices')
      .select('*')
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .maybeSingle();
    if (error || !ci) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Destinataire (client cabinet lié) pour le bloc FACTURÉ À.
    let client = null;
    if (ci.client_id) {
      const { data: c } = await admin
        .from('cabinet_clients')
        .select('*, profile:profiles!client_user_id(id, email, company_name, first_name, last_name)')
        .eq('id', ci.client_id)
        .eq('cabinet_id', cabinet.id)
        .maybeSingle();
      client = c;
    }

    const { invoice, profile } = cabinetInvoiceToPdfInputs(ci, client, cabinet);

    const pdfBuffer = await Promise.race([
      generatePdfBuffer(invoice, profile),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 30000),
      ),
    ]);

    const filename = `${(ci.number || id).replace(/[/\r\n"']/g, '-')}.pdf`;
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
    console.error('[cabinet-invoices-pdf] Error:', error.message);
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 });
  }
}
