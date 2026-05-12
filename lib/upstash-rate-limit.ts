import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;
let redis: Redis | null = null;

function getUpstashClient() {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('Upstash credentials not found, falling back to in-memory rate limiting');
      return null;
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

export function getRateLimiter() {
  if (!ratelimit) {
    const client = getUpstashClient();

    if (!client) {
      return null;
    }

    ratelimit = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: 'factume-ratelimit',
    });
  }

  return ratelimit;
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  window: string = '10 s'
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const rateLimiter = getRateLimiter();

  if (!rateLimiter) {
    // Fallback to in-memory rate limiting from lib/rate-limit.ts
    const { rateLimit: memoryCheck } = await import('./rate-limit');
    const result = memoryCheck({
      key: `upstash-fallback:${identifier}`,
      limit,
      windowMs: parseInt(window) * 1000 || 10000,
    });
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.resetTime,
    };
  }

  const result = await rateLimiter.limit(identifier);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function checkApiRateLimit(identifier: string) {
  return checkRateLimit(`api:${identifier}`, 100, '60 s');
}

export async function checkAuthRateLimit(identifier: string) {
  return checkRateLimit(`auth:${identifier}`, 10, '60 s');
}

export async function checkPageRateLimit(identifier: string) {
  return checkRateLimit(`page:${identifier}`, 300, '60 s');
}
