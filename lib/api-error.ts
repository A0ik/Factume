/**
 * CITADEL: Centralized API error handler
 * Prevents leaking internal error details (stack traces, DB errors, API keys) to clients.
 * Logs the real error server-side, returns a generic French message to the client.
 */

const GENERIC_MESSAGES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Non authentifié',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  409: 'Conflit de données',
  422: 'Données invalides',
  429: 'Trop de requêtes',
  500: 'Erreur interne du serveur',
  502: 'Service temporairement indisponible',
  503: 'Service temporairement indisponible',
};

/**
 * Returns a sanitized JSON error response to the client.
 * Always logs the real error server-side for debugging.
 */
export function apiErrorResponse(error: unknown, status: number = 500): Response {
  // Always log the real error server-side
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[API Error ${status}]`, message, stack ? '\n' + stack : '');

  // Return generic message to client (never expose internals)
  const safeMessage = GENERIC_MESSAGES[status] || 'Erreur interne du serveur';
  return new Response(JSON.stringify({ error: safeMessage }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * For use with NextResponse.json() pattern — returns a safe error object.
 */
export function getSafeErrorMessage(status: number = 500): string {
  return GENERIC_MESSAGES[status] || 'Erreur interne du serveur';
}
