import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { generatePdfBuffer } from '@/lib/pdf-server';

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { invoiceId } = await params;
    const admin = createAdminClient();

    const { data: invoice, error: invError } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const pdfBuffer = await Promise.race([
      generatePdfBuffer(invoice, profile),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 30000)
      ),
    ]);

    const filename = `${invoice.number.replace(/[/\r\n"']/g, '-')}.pdf`;

    // If mode=preview, use Content-Disposition: inline so browsers/iOS render it in iframe
    const mode = req.nextUrl.searchParams.get('mode');
    const disposition = mode === 'preview' ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        // PROMETHEUS (CIBLE 5) — empêche le sniff MIME (téléchargement strict).
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[download/pdf] Error:', error.message);
    return NextResponse.json(
      { error: 'Erreur lors de la generation du PDF' },
      { status: 500 }
    );
  }
}
