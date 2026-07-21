// ODIN (S2) — Options de sécurité des cookies d'auth Supabase pinnées explicitement.
// On ne fait PLUS confiance aux valeurs par défaut de @supabase/ssr : si elles changent
// un jour, ou si la prod devient joignable en HTTP, le drapeau `secure` ne régresse pas
// silencieusement. Les clés de sécurité ci-dessous surchargent toujours celles fournies
// par le SDK (httpOnly + sameSite + secure + path).
export const AUTH_COOKIE_SECURITY = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
