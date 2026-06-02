import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

// Routes publiques explicites (pas besoin d'auth)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
];

// Routes API/pages publiques par préfixe (webhooks, callbacks, public resources)
const PUBLIC_PREFIXES = [
  '/share/',
  '/client/',
  '/sign/',
  '/workspace/join',
];

// API routes that do NOT require authentication (webhooks, callbacks, public endpoints)
const PUBLIC_API_PREFIXES = [
  '/api/stripe/webhook',
  '/api/stripe-connect/callback',
  '/api/stripe/trial-subscription',
  '/api/share/',
  '/api/client-portal/',
  '/api/contract-signing/',
  '/api/quote-signing/',
  '/api/integrations/pennylane/webhook',
  '/api/bank-feed/callback',
  '/api/cron/',
  '/api/health',
  '/api/sumup/webhook',
  '/api/sumup/oauth',
  '/api/google/callback',
  '/api/google/oauth',
  '/api/email/inbound',
  '/api/webhooks/',
];

// Préfixes protégés : tout ce qui commence par ces segments nécessite une session
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/clients',
  '/crm',
  '/settings',
  '/recurring',
  '/paywall',
  '/workspace',
  '/notifications',
  '/help',
  '/expenses',
  '/products',
  '/calendar',
  '/accounting',
  '/activity',
  '/banking',
  '/capture',
  '/contracts',
  '/documents',
  '/trial',
  '/onboarding',
  '/data-health',
  '/integrations',
  '/cabinet',
];

export async function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID();
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Content Security Policy
  const isDev = process.env.NODE_ENV === 'development';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com https://unpkg.com${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https://factu.me https://*.supabase.co https://lh3.googleusercontent.com`,
    `font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com`,
    `connect-src 'self' blob: data: https://*.supabase.co https://supabase.co https://api.stripe.com https://maps.googleapis.com https://openrouter.ai https://*.ingest.sentry.io https://www.googletagmanager.com https://recherche-entreprises.api.gouv.fr wss://*.supabase.co wss://supabase.co${isDev ? ' ws://localhost:*' : ''}`,
    `frame-src 'self' blob: data: https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com`,
    `worker-src 'self' blob: data:`,
    `child-src 'self' blob: data:`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);

  // Expose nonce so layout can read it via headers()
  res.headers.set('x-nonce', nonce);

  // Rate limiting — exempt known search crawlers
  const userAgent = req.headers.get('user-agent') || '';
  const isCrawler = /googlebot|bingbot|yandexbot|duckduckbot|slurp|baiduspider|facebot|ia_archiver|mj12bot|ahrefsbot|semrushbot/i.test(userAgent);

  const ip = getClientIp(req);
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  // ── Rate Limiting (optimisé pour UX SaaS) ────────────────────────────────
  // RULE: Navigation pages (SSR) = NO rate limit. A user refreshing 30 times
  // should NEVER be blocked. Only auth routes and expensive API calls are limited.
  let shouldRateLimit = false;
  let rlLimit: number;
  let rlWindow: number;

  if (pathname === '/api/stripe/trial-subscription') {
    shouldRateLimit = true;
    rlLimit = 3;
    rlWindow = 86_400_000; // 3 per day — anti-abuse
  } else if (isAuthRoute) {
    shouldRateLimit = true;
    rlLimit = 10;
    rlWindow = 900_000; // 10 per 15 minutes — brute-force protection
  } else if (isApiRoute) {
    shouldRateLimit = true;
    rlLimit = 200;
    rlWindow = 60_000; // 200 per minute — generous for normal usage
  }
  // Page requests (SSR/ISR): NO rate limiting — users browse freely

  if (shouldRateLimit) {
    const rlGroup = pathname.startsWith('/api/cabinet') ? 'api-cabinet'
      : isApiRoute ? 'api'
      : 'auth';

    const rl = await rateLimitAsync({ key: `mw:${ip}:${rlGroup}`, limit: rlLimit!, windowMs: rlWindow! });

    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return new Response(JSON.stringify({
        error: 'Too Many Requests',
        message: `Trop de requêtes. Veuillez réessayer dans ${retryAfter} secondes.`,
      }), {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // Racine toujours publique (headers already set above)
  if (pathname === '/') return res;

  // Chemins publics exacts ou par préfixe (headers already set above)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return res;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return res;

  // API routes: public API routes are allowed through without auth
  if (pathname.startsWith('/api/')) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (isPublicApi) return res;
    // All other API routes require authentication (fall through to auth check below)
  }

  // Vérifier si Supabase est configuré
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables in middleware');
    return res;
  }

  // N'effectuer la vérification auth que pour les routes protégées ou API routes non publiques
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected && !isApiRoute) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookieList: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookieList.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // For API routes, return 401 JSON instead of redirecting
    if (isApiRoute) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
