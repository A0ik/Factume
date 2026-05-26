import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Routes publiques explicites (pas besoin d'auth)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
];

// Routes API/pages publiques par préfixe
const PUBLIC_PREFIXES = [
  '/api/stripe/webhook',
  '/api/share/',
  '/api/client-portal/',
  '/api/contract-signing/',
  '/api/integrations/pennylane/webhook',
  '/api/bank-feed/callback',
  '/api/cron/',
  '/api/health',
  '/api/eidas/verify/',
  '/api/sumup/webhook',
  '/share/',
  '/client/',
  '/sign/',
  '/workspace/join',
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
    `script-src 'self' 'nonce-${nonce}' blob: https://www.googletagmanager.com https://unpkg.com${isDev ? " 'unsafe-eval'" : ''}`,
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

  let rlLimit = 300;
  let rlWindow = 60_000;
  if (isApiRoute) { rlLimit = 100; rlWindow = 60_000; }
  if (isAuthRoute) { rlLimit = 5; rlWindow = 3_600_000; }
  if (pathname === '/api/stripe/trial-subscription') { rlLimit = 3; rlWindow = 86_400_000; }
  if (isCrawler) { rlLimit = 5000; rlWindow = 60_000; }

  const rl = rateLimit({ key: `mw:${ip}:${pathname.startsWith('/api/') ? 'api' : isAuthRoute ? 'auth' : 'page'}`, limit: rlLimit, windowMs: rlWindow });
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.resetTime - Date.now()) / 1000);
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  // Racine toujours publique
  if (pathname === '/') return res;

  // Chemins publics exacts ou par préfixe
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return res;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return res;

  // Vérifier si Supabase est configuré
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables in middleware');
    return res;
  }

  // N'effectuer la vérification auth que pour les routes protégées
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return res;

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
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
