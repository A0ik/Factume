/**
 * OVERLORD (CIBLE 4) — Diagnostics Stripe.
 *
 * BUT : capturer la cause réelle du 500 « Erreur interne du serveur » déclenché
 * au clic Pro/Business, SANS jamais fuiter de secret. On loggue uniquement la
 * PRÉSENCE (booléen) des variables d'env attendues + le mode de la clé secrète,
 * et la structure de l'erreur Stripe (type/code/message/stack).
 *
 * Hypothèse principale (à confirmer par le log) : STRIPE_SECRET_KEY absent ou
 * encore sk_test_, et/ou STRIPE_BUSINESS_*_PRICE_ID manquants.
 */

const STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_YEARLY_PRICE_ID',
  'STRIPE_BUSINESS_MONTHLY_PRICE_ID',
  'STRIPE_BUSINESS_YEARLY_PRICE_ID',
] as const;

/** Loggue la présence (jamais la valeur) des variables Stripe attendues + le mode de clé. */
export function logStripeEnv(route: string): void {
  const presence: Record<string, boolean> = {};
  for (const key of STRIPE_ENV_KEYS) {
    const val = process.env[key];
    presence[key] = typeof val === 'string' && val.trim().length > 0;
  }
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const secretMode = secret.startsWith('sk_live_')
    ? 'live'
    : secret.startsWith('sk_test_')
      ? 'TEST (sk_test_)'
      : secret
        ? 'UNKNOWN_FORMAT'
        : 'MISSING';
  console.error(`[stripe-diag:${route}] env presence`, { ...presence, secretMode });
}

/** Loggue une erreur Stripe/serveur de façon structurée (type/code/status/message/stack). */
export function logStripeError(route: string, error: unknown): void {
  const err = error as Error & { type?: string; code?: string; statusCode?: number };
  console.error(`[stripe-diag:${route}] ERROR`, {
    type: err?.type ?? null,
    code: err?.code ?? null,
    statusCode: err?.statusCode ?? null,
    message: err?.message ?? String(error),
    stack: err?.stack ?? null,
  });
}
