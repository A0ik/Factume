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
