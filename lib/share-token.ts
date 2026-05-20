import crypto from 'crypto';

/**
 * Generate an HMAC-SHA256 token for sharing invoices.
 * Deterministic — the same invoiceId always produces the same token.
 */
export function generateShareToken(invoiceId: string): string {
  const secret = process.env.SHARE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return crypto.createHmac('sha256', secret).update(invoiceId).digest('hex').slice(0, 32);
}

/** Build the full share URL for an invoice */
export function buildShareUrl(invoiceId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
  const token = generateShareToken(invoiceId);
  return `${base}/api/share/${invoiceId}?t=${token}`;
}
