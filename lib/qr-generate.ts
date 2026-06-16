import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────────────────────
// ATELIER (CIBLE 2) — QR code conforme aux normes de lisibilité 2026 (ISO 18004).
//
// Avant : width 200, margin 1, errorCorrectionLevel 'M'. Le margin:1 (= 1 module)
// était LE coup de grâce : la quiet zone normale est de 4 modules minimum, sinon
// aucun smartphone ne peut détecter les bords du code → non scannable. La faible
// taille (48pt ≈ 1,7 cm au rendu) et la correction 'M' sur une URL longue (200+
// chars) achevaient la densité.
//
// Maintenant :
//   • margin: 4          → quiet zone ISO 18004 respectée (détection des bords).
//   • errorCorrectionLevel: 'L' → capacité de données max → moins de modules pour
//     une URL donnée → code moins dense. Acceptable pour une impression propre
//     sur papier (la robustesse 'H' n'est utile qu'en environnement hostile).
//   • width: 400         → source haute résolution, reste net à ~2 cm de rendu.
//   • color haut contraste (encre #111827 sur blanc) → lisibilité scanner max.
// La payload est désormais l'URL COURTE factu.me/pay/<token> (~35 chars) quand un
// token existe — voir lib/pay-token.ts — ce qui réduit encore la densité.
// ─────────────────────────────────────────────────────────────────────────────

const QR_OPTS = {
  margin: 4,
  errorCorrectionLevel: 'L' as const,
  color: { dark: '#111827', light: '#ffffff' },
};

/**
 * Generate a QR code as a PNG Buffer (for pdf-lib embedding).
 */
export async function generateQrBuffer(url: string): Promise<Buffer | null> {
  try {
    const buf = await QRCode.toBuffer(url, { type: 'png', width: 400, ...QR_OPTS });
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
    return await QRCode.toDataURL(url, { width: 400, ...QR_OPTS });
  } catch (err) {
    console.error('[qr-generate] toDataURL failed:', (err as Error).message, 'URL:', url.substring(0, 60));
    return null;
  }
}
