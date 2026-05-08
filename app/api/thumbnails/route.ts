import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days cache

// ---------------------------------------------------------------------------
// GET handler - Generate and return thumbnail
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Get expense ID from URL
    // ------------------------------------------------------------------
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('id');

    if (!expenseId) {
      return NextResponse.json(
        { error: 'ID de dépense manquant' },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Fetch expense from database
    // ------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('receipt_url, receipt_storage_path')
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      return NextResponse.json(
        { error: 'Dépense introuvable' },
        { status: 404 }
      );
    }

    if (!expense.receipt_url || !expense.receipt_storage_path) {
      return NextResponse.json(
        { error: 'Aucune image associée' },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // 3. Download original image from Supabase Storage
    // ------------------------------------------------------------------
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(expense.receipt_storage_path);

    if (downloadError || !fileData) {
      console.error('[Thumbnail] Download error:', downloadError);
      return NextResponse.json(
        { error: 'Erreur de téléchargement de l\'image' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Generate thumbnail with Sharp
    // ------------------------------------------------------------------
    const originalBuffer = Buffer.from(await fileData.arrayBuffer());

    // Check if file is PDF (can't thumbnail PDF easily, return placeholder)
    if (expense.receipt_storage_path.endsWith('.pdf')) {
      // Return a simple placeholder for PDFs
      const svg = `
        <svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_WIDTH * 1.4}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="#9ca3af">
            PDF
          </text>
        </svg>
      `;

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': `public, max-age=${MAX_AGE}`,
        },
      });
    }

    // Generate thumbnail for images
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    // ------------------------------------------------------------------
    // 5. Return thumbnail with cache headers
    // ------------------------------------------------------------------
    return new NextResponse(thumbnailBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${MAX_AGE}, immutable`,
        'Content-Length': thumbnailBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Thumbnail] Error:', error);

    // Return error placeholder
    const svg = `
      <svg width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_WIDTH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fee2e2"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#ef4444">
          Erreur
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}
