import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreprocessResult {
  buffer: Buffer;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_WIDTH = 2000;
const MAX_HEIGHT = 3000;
const JPEG_QUALITY = 92;
const TRIM_THRESHOLD = 10;
const SATURATION_SAMPLE_SIZE = 10;
const SATURATION_LOW_THRESHOLD = 25;
const LOW_QUALITY_MIN_WIDTH = 500;
const LAPLACIAN_BLUR_THRESHOLD = 80;
const ASPECT_RATIO_SKEW_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// Graceful sharp loader – if the package is missing or broken we silently
// disable every preprocessing step and return the original buffer.
// ---------------------------------------------------------------------------

let sharpAvailable = true;

type SharpConstructor = typeof sharp;

function getSharp(): SharpConstructor | null {
  if (!sharpAvailable) return null;
  return sharp;
}

// Probe once at import time.  sharp throws synchronously when the native
// binary cannot be located, so we catch that here.
try {
  // A no-op call that forces native initialisation.
  sharp(Buffer.alloc(1));
} catch {
  sharpAvailable = false;
}

// ---------------------------------------------------------------------------
// Helper: detect low-quality images
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the image looks too small or too blurry for reliable OCR.
 */
export async function isLowQualityImage(buffer: Buffer): Promise<boolean> {
  const s = getSharp();
  if (!s) return false; // cannot analyse without sharp

  try {
    const pipeline = s(buffer);
    const metadata = await pipeline.metadata();

    // Very small images are almost never readable by OCR models.
    if (metadata.width != null && metadata.width < LOW_QUALITY_MIN_WIDTH) {
      return true;
    }

    // Laplacian-variance blur detection.
    // We compute the variance of a Laplacian kernel over the grayscale image.
    // Low variance = blurry image.
    const { data, info } = await pipeline
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    if (width < 3 || height < 3) return false;

    // Compute Laplacian variance.
    // Kernel (3x3):
    //   0  -1   0
    //  -1   4  -1
    //   0  -1   0
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian =
          -data[(y - 1) * width + x] +
          -data[y * width + (x - 1)] +
          4 * data[idx] +
          -data[y * width + (x + 1)] +
          -data[(y + 1) * width + x];

        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    if (count === 0) return false;

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;

    return variance < LAPLACIAN_BLUR_THRESHOLD;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: detect thermal / grayscale receipts
// ---------------------------------------------------------------------------

/**
 * Resizes to a tiny thumbnail and measures average saturation.
 * Thermal receipts have almost no colour (white paper, dark ink).
 */
async function isLikelyThermalReceipt(
  s: SharpConstructor,
  buffer: Buffer,
): Promise<boolean> {
  try {
    const { data, info } = await s(buffer)
      .resize(SATURATION_SAMPLE_SIZE, SATURATION_SAMPLE_SIZE, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // data is interleaved RGB (channels = 3)
    const channels = info.channels;
    if (channels < 3) return true; // already grayscale

    const pixelCount = info.width * info.height;
    let totalSaturation = 0;

    for (let i = 0; i < pixelCount; i++) {
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;

      // HSL saturation formula
      const delta = max - min;
      const saturation =
        delta === 0
          ? 0
          : delta / (lightness <= 127 ? max + min : 510 - max - min);

      totalSaturation += saturation;
    }

    const avgSaturation = (totalSaturation / pixelCount) * 100;
    return avgSaturation < SATURATION_LOW_THRESHOLD;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main preprocessing pipeline
// ---------------------------------------------------------------------------

/**
 * Preprocesses a receipt image for better OCR accuracy.
 *
 * Steps: auto-rotate, trim borders, perspective correction, contrast
 * enhancement, sharpen, optional grayscale for thermal receipts, resize,
 * and final JPEG output.
 *
 * If `sharp` is unavailable or any step fails the original buffer is returned
 * unchanged – this function **never throws**.
 */
export async function preprocessReceipt(
  buffer: Buffer,
  mimeType: string,
): Promise<PreprocessResult> {
  const s = getSharp();
  if (!s) {
    return { buffer, mimeType };
  }

  try {
    // ---- 1. Auto-rotate based on EXIF orientation ----
    let pipeline = s(buffer).rotate();

    // ---- 2. Auto-crop whitespace / borders ----
    pipeline = pipeline.trim({ threshold: TRIM_THRESHOLD });

    // ---- 3. Perspective correction (simplified) ----
    // If the image has an extreme aspect ratio it is likely a skewed photo.
    // We use extend + trim as a lightweight deskewing proxy.
    const metadata = await s(buffer).metadata();
    const w = metadata.width ?? 1;
    const h = metadata.height ?? 1;
    const aspect = Math.max(w, h) / Math.min(w, h);

    if (aspect > ASPECT_RATIO_SKEW_THRESHOLD) {
      pipeline = pipeline.extend({
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        background: { r: 255, g: 255, b: 255 },
      }).trim({ threshold: TRIM_THRESHOLD });
    }

    // ---- 4. Contrast enhancement ----
    pipeline = pipeline.normalise().linear(1.2, -10);

    // ---- 5. Sharpen ----
    pipeline = pipeline.sharpen(1, 1, 0.5);

    // ---- 6. Grayscale conversion for thermal receipts ----
    const thermal = await isLikelyThermalReceipt(s, buffer);
    if (thermal) {
      pipeline = pipeline.grayscale().linear(1.5, -30);
    }

    // ---- 7. Resize if too large ----
    const finalMeta = await pipeline.metadata();
    const fw = finalMeta.width ?? 0;
    const fh = finalMeta.height ?? 0;

    if (fw > MAX_WIDTH || fh > MAX_HEIGHT) {
      pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // ---- 8. Output as high-quality JPEG ----
    // Flatten transparency to white before JPEG encoding.
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

    const processedBuffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return {
      buffer: processedBuffer,
      mimeType: 'image/jpeg',
    };
  } catch {
    // Any failure: return the original image untouched.
    return { buffer, mimeType };
  }
}
