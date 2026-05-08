/**
 * In-memory rate limiter for API routes.
 *
 * Uses a Map with TTL-based cleanup. Each identifier (e.g. IP or user ID)
 * gets a sliding window counter. Entries are lazily cleaned on access and
 * periodically via a background sweep to avoid scanning the full map on every call.
 *
 * Usage:
 *   const { success, remaining, reset } = rateLimit(req.ip ?? 'anonymous', 60, 60_000);
 *   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup: only sweep expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  /** Whether the request is within the allowed limit */
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Timestamp (ms) when the window resets */
  reset: number;
}

/**
 * Rate limit a given identifier.
 *
 * @param identifier  Unique key (IP address, user ID, etc.)
 * @param limit       Max requests allowed in the window (default: 60)
 * @param windowMs    Window duration in milliseconds (default: 60_000 = 1 min)
 * @returns           Result with success, remaining count, and reset timestamp
 */
export function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60_000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  // No entry or expired window -> start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, reset: resetAt };
  }

  // Within the current window
  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

/**
 * Extract the client IP address from a NextRequest.
 * Handles various proxy headers (X-Forwarded-For, CF-Connecting-IP, etc.)
 *
 * @param req  NextRequest object
 * @returns    Client IP address or 'unknown' if not detectable
 */
export function getClientIp(req: NextRequest): string {
  // Check for Vercel / X-Forwarded-For header (most common)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is the original client IP
    return forwardedFor.split(',')[0].trim();
  }

  // Check for Cloudflare
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Check for other common headers
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Check for X-Client-IP (used by some proxies)
  const xClientIp = req.headers.get('x-client-ip');
  if (xClientIp) {
    return xClientIp;
  }

  // Fall back to remote address (if available)
  // Note: In serverless environments, this may not be available
  const ip = req.headers.get('x-vercel-forwarded-for');
  if (ip) {
    return ip;
  }

  return 'unknown';
}

/**
 * Apply rate limiting to an API route based on client IP.
 * Returns an error response if rate limit is exceeded, otherwise null.
 *
 * Usage in API routes:
 *   const rateLimitError = applyIpRateLimit(req, 10, 60_000);
 *   if (rateLimitError) return rateLimitError;
 *
 * @param req      NextRequest object
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns        NextResponse with 429 status if limit exceeded, null otherwise
 */
export function applyIpRateLimit(
  req: NextRequest,
  limit: number = 60,
  windowMs: number = 60_000
): Response | null {
  const ip = getClientIp(req);
  const result = rateLimit(ip, limit, windowMs);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    );
  }

  return null;
}

/**
 * Apply rate limiting to an API route based on user ID.
 * Returns an error response if rate limit is exceeded, otherwise null.
 *
 * Usage in API routes:
 *   const rateLimitError = applyUserIdRateLimit(userId, 20, 60_000);
 *   if (rateLimitError) return rateLimitError;
 *
 * @param userId   User ID to rate limit
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns        Response object with 429 status if limit exceeded, null otherwise
 */
export function applyUserIdRateLimit(
  userId: string,
  limit: number = 60,
  windowMs: number = 60_000
): Response | null {
  const result = rateLimit(`user:${userId}`, limit, windowMs);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    );
  }

  return null;
}
