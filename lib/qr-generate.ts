import QRCode from 'qrcode';

/**
 * Generate a QR code as a PNG Buffer (for pdf-lib embedding).
 */
export async function generateQrBuffer(url: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(url, { type: 'png', width: 200, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return null;
  }
}

/**
 * Generate a QR code as a base64 data URL (for @react-pdf/renderer Image).
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 150, margin: 1, errorCorrectionLevel: 'M' });
}
