/**
 * Rate limiter for edge runtime.
 *
 * Supports both Upstash Redis (production) and in-memory (development) backends.
 *
 * PRODUCTION: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for
 * distributed rate limiting across serverless instances. Without Redis, the
 * in-memory fallback is unreliable in serverless environments (Vercel, AWS Lambda)
 * because each invocation may run on a different instance.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ---------------------------------------------------------------------------
// Redis singleton (lazy initialization, edge-compatible)
// ---------------------------------------------------------------------------
let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      _redis = new Redis({ url, token });
    } else {
      _redis = null;
    }
  } catch {
    _redis = null;
  }
  return _redis;
}

// ---------------------------------------------------------------------------
// Upstash rate limiters (cached by limit:window configuration)
// ---------------------------------------------------------------------------
const _limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowSeconds}`;
  let limiter = _limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    });
    _limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// In-memory fallback (for development / no-Redis environments)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
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
// Async rate limiting (uses Upstash Redis when available, falls back to in-memory)
// Use this in middleware for production-grade distributed rate limiting.
// ---------------------------------------------------------------------------

export async function rateLimitAsync(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const windowSeconds = Math.ceil(options.windowMs / 1000);
  const limiter = getLimiter(options.limit, windowSeconds);

  if (limiter) {
    try {
      const result = await limiter.limit(options.key);
      return {
        success: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      };
    } catch (err) {
      // Redis error — fail open (allow request) rather than blocking all users
      console.error('[rate-limit] Redis error, allowing request through (fail-open):', err);
      return { success: true, remaining: 999, resetTime: Date.now() + options.windowMs };
    }
  }

  // No Redis configured
  if (process.env.NODE_ENV === 'production') {
    // CRITICAL: Fail open in production — better to lose rate limiting than block all users
    console.error('[rate-limit] CRITICAL: No Redis in production — rate limiting DISABLED (fail-open). Set UPSTASH_REDIS_REST_URL.');
    return { success: true, remaining: 999, resetTime: Date.now() + options.windowMs };
  }

  // Development: use in-memory fallback (works locally, unreliable in serverless)
  return rateLimit(options);
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
 * Generate a stable fingerprint for rate limiting when IP is unavailable.
 *
 * Priority: real IP > header-based fingerprint > fallback.
 * The fingerprint uses user-agent, accept-language, sec-ch-ua and accept-encoding
 * to distinguish different users sharing the same network (VPN, proxy, CDN).
 * Uses djb2 hash — fast, no crypto dependency, sufficient for bucketing.
 */
export function getClientFingerprint(req: { headers: { get: (name: string) => string | null } }): string {
  const ip = getClientIp(req);
  if (ip !== 'unknown') return ip;

  // Build fingerprint from available headers
  const ua = req.headers.get('user-agent') || '';
  const lang = req.headers.get('accept-language') || '';
  const secUa = req.headers.get('sec-ch-ua') || '';
  const encoding = req.headers.get('accept-encoding') || '';

  const raw = `${ua}|${lang}|${secUa}|${encoding}`;
  if (!raw.replace(/\|/g, '')) return 'fp:fallback'; // truly empty headers

  // djb2 hash — fast non-cryptographic hash for bucketing
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  return `fp:${Math.abs(hash).toString(36)}`;
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
