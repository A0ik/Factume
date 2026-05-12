/**
 * In-memory rate limiter for edge runtime.
 *
 * Each Vercel edge function instance maintains its own Map.
 * This is sufficient for moderate traffic — for high-traffic production,
 * upgrade to Redis (Upstash) for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodic cleanup: sweep expired entries every 100 checks
let cleanupCounter = 0;

/**
 * Core rate limiting function using an options object.
 *
 * @param options.key      - Unique identifier (IP, user ID, route+IP, etc.)
 * @param options.limit    - Max requests allowed in the window
 * @param options.windowMs - Window duration in milliseconds
 * @returns                Result with success, remaining count, and reset timestamp
 */
export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): { success: boolean; remaining: number; resetTime: number } {
  const { key, limit, windowMs } = options;
  const now = Date.now();

  // Periodic cleanup to prevent memory leaks
  cleanupCounter++;
  if (cleanupCounter > 100) {
    cleanupCounter = 0;
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetTime) rateLimitMap.delete(k);
    }
  }

  const entry = rateLimitMap.get(key);

  // No entry or expired window -> start fresh
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  // Rate limit exceeded
  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Within limit, increment
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// ---------------------------------------------------------------------------
// Backward-compatible API (used by existing route handlers)
// ---------------------------------------------------------------------------

/** @deprecated Use rateLimit({ key, limit, windowMs }) instead */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Backward-compatible overload: positional arguments.
 * Existing callers use `rateLimit(identifier, limit, windowMs)`.
 *
 * @deprecated Prefer `rateLimit({ key, limit, windowMs })`
 */
export function rateLimitCompat(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60_000
): RateLimitResult {
  const result = rateLimit({ key: identifier, limit, windowMs });
  return { success: result.success, remaining: result.remaining, reset: result.resetTime };
}

// Re-export positional overload as the named export used by existing consumers.
// The options-based overload is the primary API; this compat layer keeps imports working.
export { rateLimitCompat as rateLimitPositional };

/**
 * Extract the client IP address from a NextRequest.
 * Handles various proxy headers (X-Forwarded-For, CF-Connecting-IP, etc.)
 */
export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
  // Vercel / X-Forwarded-For (most common)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Nginx / other proxies
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  // X-Client-IP (some proxies)
  const clientIp = req.headers.get('x-client-ip');
  if (clientIp) return clientIp;

  // Vercel-specific forwarded-for
  const vff = req.headers.get('x-vercel-forwarded-for');
  if (vff) return vff;

  return 'unknown';
}

/**
 * Apply IP-based rate limiting to an API route.
 * Returns a 429 Response if rate limit is exceeded, otherwise null.
 *
 * Usage in API routes:
 *   const rateLimitError = applyIpRateLimit(req, 10, 60_000);
 *   if (rateLimitError) return rateLimitError;
 */
export function applyIpRateLimit(
  req: { headers: { get: (name: string) => string | null } },
  limit: number = 60,
  windowMs: number = 60_000
): Response | null {
  const ip = getClientIp(req);
  const result = rateLimit({ key: ip, limit, windowMs });

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  return null;
}

/**
 * Apply rate limiting based on user ID.
 * Returns a 429 Response if rate limit is exceeded, otherwise null.
 *
 * Usage in API routes:
 *   const rateLimitError = applyUserIdRateLimit(userId, 20, 60_000);
 *   if (rateLimitError) return rateLimitError;
 */
export function applyUserIdRateLimit(
  userId: string,
  limit: number = 60,
  windowMs: number = 60_000
): Response | null {
  const result = rateLimit({ key: `user:${userId}`, limit, windowMs });

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  return null;
}
