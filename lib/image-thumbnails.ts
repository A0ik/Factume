// ---------------------------------------------------------------------------
// Image Thumbnail Generator
// Creates optimized thumbnails for OCR documents to improve UI performance
// and reduce bandwidth usage
// ---------------------------------------------------------------------------

import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 300; // 300px max dimension
const THUMBNAIL_QUALITY = 80; // JPEG quality
const THUMBNAIL_MIME_TYPE = 'image/jpeg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThumbnailResult {
  buffer: Buffer;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Main: Generate thumbnail from image buffer
// ---------------------------------------------------------------------------

export async function generateThumbnail(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ThumbnailResult> {
  try {
    // Check if sharp is available
    let s: typeof sharp | null = null;
    try {
      s = sharp;
      // Test sharp
      sharp(Buffer.alloc(1));
    } catch {
      console.warn('[Thumbnail] Sharp not available, returning original');
      return {
        buffer: imageBuffer,
        mimeType,
        size: imageBuffer.length,
        width: 0,
        height: 0,
      };
    }

    if (!s) {
      return {
        buffer: imageBuffer,
        mimeType,
        size: imageBuffer.length,
        width: 0,
        height: 0,
      };
    }

    // Get original metadata
    const metadata = await s(imageBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Calculate thumbnail dimensions (maintain aspect ratio)
    let thumbnailWidth = THUMBNAIL_SIZE;
    let thumbnailHeight = THUMBNAIL_SIZE;

    if (originalWidth > originalHeight) {
      // Landscape
      thumbnailHeight = Math.round((originalHeight / originalWidth) * THUMBNAIL_SIZE);
    } else {
      // Portrait
      thumbnailWidth = Math.round((originalWidth / originalHeight) * THUMBNAIL_SIZE);
    }

    // Generate thumbnail
    const thumbnailBuffer = await s(imageBuffer)
      .resize(thumbnailWidth, thumbnailHeight, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return {
      buffer: thumbnailBuffer,
      mimeType: THUMBNAIL_MIME_TYPE,
      size: thumbnailBuffer.length,
      width: thumbnailWidth,
      height: thumbnailHeight,
    };

  } catch (error) {
    console.error('[Thumbnail] Generation failed:', error);
    // Return original on error
    return {
      buffer: imageBuffer,
      mimeType,
      size: imageBuffer.length,
      width: 0,
      height: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: Generate thumbnail URL path
// ---------------------------------------------------------------------------

export function getThumbnailPath(originalPath: string): string {
  // Convert: user-id/uuid_file.jpg -> user-id/thumbnails/uuid_file_thumb.jpg
  const parts = originalPath.split('/');
  if (parts.length < 2) {
    return originalPath;
  }

  const userId = parts[0];
  const fileName = parts.slice(1).join('/');
  const fileNameParts = fileName.split('.');
  const extension = fileNameParts.length > 1 ? fileNameParts.pop() : 'jpg';
  const baseName = fileNameParts.join('.');

  return `${userId}/thumbnails/${baseName}_thumb.${extension}`;
}

// ---------------------------------------------------------------------------
// Helper: Store thumbnail to Supabase
// ---------------------------------------------------------------------------

export async function uploadThumbnailToSupabase(
  supabase: any,
  userId: string,
  thumbnailBuffer: Buffer,
  originalPath: string
): Promise<{ path: string; url: string } | null> {
  try {
    const thumbnailPath = getThumbnailPath(originalPath);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: THUMBNAIL_MIME_TYPE,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Thumbnail] Upload failed:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(thumbnailPath);

    return {
      path: thumbnailPath,
      url: urlData.publicUrl,
    };

  } catch (error) {
    console.error('[Thumbnail] Upload to Supabase failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Batch thumbnail generation
// ---------------------------------------------------------------------------

export async function generateThumbnailsBatch(
  items: Array<{ buffer: Buffer; mimeType: string }>
): Promise<ThumbnailResult[]> {
  const results: ThumbnailResult[] = [];

  for (const item of items) {
    const result = await generateThumbnail(item.buffer, item.mimeType);
    results.push(result);
  }

  return results;
}
