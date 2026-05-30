import crypto from 'crypto';

/**
 * Generate an HMAC-SHA256 token for sharing invoices.
 * Includes a timestamp component so tokens can expire.
 * Format: <hex_hmac_24chars>_<base64_timestamp>
 */

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateShareToken(invoiceId: string): string {
  const secret = process.env.SHARE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Include a random nonce so tokens are non-deterministic
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${invoiceId}:${nonce}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
  const ts = Buffer.from(Date.now().toString()).toString('base64url');
  return `${hmac}_${ts}_${nonce}`;
}

/** Verify a share token — returns true if valid and not expired */
export function verifyShareToken(invoiceId: string, token: string): boolean {
  const parts = token.split('_');
  if (parts.length !== 3) return false;

  const [hmac, tsB64, nonce] = parts;

  // Check expiration
  try {
    const ts = Number(Buffer.from(tsB64, 'base64url').toString());
    if (Date.now() - ts > TOKEN_LIFETIME_MS) return false;
  } catch {
    return false;
  }

  // Verify HMAC
  const secret = process.env.SHARE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const payload = `${invoiceId}:${nonce}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Build the full share URL for an invoice */
export function buildShareUrl(invoiceId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
  const token = generateShareToken(invoiceId);
  return `${base}/api/share/${invoiceId}?t=${token}`;
}
