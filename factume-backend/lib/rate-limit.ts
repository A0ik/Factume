import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limiters = new Map<string, RateLimitEntry>();

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = Date.now();
  const record = limiters.get(identifier);

  // Nettoyer les entrées expirées
  if (record && now > record.resetTime) {
    limiters.delete(identifier);
  }

  const current = limiters.get(identifier);

  if (!current || now > current.resetTime) {
    limiters.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    };
  }

  current.count++;
  return { allowed: true };
}

export function getIdentifier(req: NextRequest): string {
  // Essayer d'abord l'user ID depuis le header Authorization
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return `user:${authHeader.slice(7)}`;
  }

  // Sinon utiliser l'IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]
    || req.headers.get('x-real-ip')
    || 'unknown';
  return `ip:${ip}`;
}
