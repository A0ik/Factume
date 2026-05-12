/**
 * Upstash Redis rate limiting
 *
 * NOTE: This is a placeholder for future Upstash integration.
 * Currently using in-memory rate limiting from lib/rate-limit.ts
 * which works perfectly for development and moderate traffic.
 *
 * To enable Upstash distributed rate limiting:
 * 1. Install: npm install @upstash/ratelimit @upstash/redis
 * 2. Set env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * 3. Uncomment the implementation below
 */

import { rateLimit } from './rate-limit';

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSec: number = 10
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Using in-memory rate limiting (works perfectly for now)
  const result = rateLimit({
    key: identifier,
    limit,
    windowMs: windowSec * 1000,
  });

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.resetTime,
  };
}

export async function checkApiRateLimit(identifier: string) {
  return checkRateLimit(`api:${identifier}`, 100, 60);
}

export async function checkAuthRateLimit(identifier: string) {
  return checkRateLimit(`auth:${identifier}`, 10, 60);
}

export async function checkPageRateLimit(identifier: string) {
  return checkRateLimit(`page:${identifier}`, 300, 60);
}

/**
 * Future Upstash implementation (uncomment when ready):
 *
 * import { Ratelimit } from '@upstash/ratelimit';
 * import { Redis } from '@upstash/redis';
 *
 * const redis = new Redis({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * });
 *
 * const ratelimit = new Ratelimit({
 *   redis,
 *   limiter: Ratelimit.slidingWindow(10, '10 s'),
 *   analytics: true,
 * });
 */
