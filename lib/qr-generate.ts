import QRCode from 'qrcode';

/**
 * Generate a QR code as a PNG Buffer (for pdf-lib embedding).
 */
export async function generateQrBuffer(url: string): Promise<Buffer | null> {
  try {
    const buf = await QRCode.toBuffer(url, { type: 'png', width: 200, margin: 1, errorCorrectionLevel: 'M' });
    if (!buf || buf.length === 0) {
      console.warn('[qr-generate] toBuffer returned empty buffer for URL:', url.substring(0, 60));
      return null;
    }
    return buf;
  } catch (err) {
    console.error('[qr-generate] toBuffer failed:', (err as Error).message, 'URL:', url.substring(0, 60));
    return null;
  }
}

/**
 * Generate a QR code as a base64 data URL (for @react-pdf/renderer Image).
 */
export async function generateQrDataUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { width: 150, margin: 1, errorCorrectionLevel: 'M' });
  } catch (err) {
    console.error('[qr-generate] toDataURL failed:', (err as Error).message, 'URL:', url.substring(0, 60));
    return null;
  }
}
