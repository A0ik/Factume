import { NextRequest, NextResponse } from 'next/server';
import { generatePdfBuffer } from '@/lib/pdf';
import { Invoice, Profile } from '@/types';

export const maxDuration = 15;

/**
 * POST /api/pdf/preview
 * Server-side PDF preview generation for the document creation canvas.
 * Accepts invoice + profile data from the client and returns a PDF buffer.
 * This eliminates the need for @react-pdf/renderer on the client side
 * (no CSP 'unsafe-eval' required, works on ALL browsers including iOS Safari).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoice, profile } = body as { invoice: Invoice; profile: Profile };

    if (!invoice || !profile) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 },
      );
    }

    const pdfBuffer = await Promise.race([
      generatePdfBuffer(invoice, profile),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 10000),
      ),
    ]);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[pdf/preview] Error:', error.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'aperçu' },
      { status: 500 },
    );
  }
}
