import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
