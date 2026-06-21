/**
 * OVERLORD (CIBLE 2) — Détection d'emails jetables + normalisation.
 *
 * Avant : 63 domaines en correspondance exacte, sans normalisation. Un utilisateur
 * pouvait générer une infinité d'identifiants via :
 *   - l'aliasing `user+tag@gmail.com` (Gmail livre dans la même boîte),
 *   - les points `j.d.o.e@gmail.com` (Gmail les ignore),
 *   - ou simplement un domaine jetable absent de la (petite) liste.
 *
 * Maintenant : canonicalisation de la partie locale (retrait du `+tag`, des points
 * pour les fournisseurs qui les ignorent) + liste élargie.
 */

const DISPOSABLE_DOMAINS = new Set([
  // — Origine (guerrilla, tempmail, yopmail…) —
  'guerrillamail.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'sharklasers.com', 'spam4.me', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'tempmail.io', 'temp-mail.com', 'tempr.email',
  'tempmailo.com', 'tempmailaddress.com', 'temp-mail.io',
  'throwaway.email', 'throwawaymail.com', 'throwawaymail.net', 'throwaway.org',
  'mailinator.com', 'mailinator2.com', 'mailinator.net',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yopmail.biz',
  'jetable.org', 'jetable.fr', 'jetable.net',
  'maildrop.cc', 'maildrop.xyz', 'mailnesia.com', 'tempail.com',
  'dispostable.com', 'trashmail.com', 'trashmail.io', 'trashmail.ws', 'trashmail.net',
  'incognitomail.org', 'incognitomail.com', 'mailcatch.com', 'mailexpire.com',
  'mohmal.com', 'mohmal.im', 'mytemp.email', 'mytempemail.com',
  'fakeinbox.com', 'tempinbox.com', 'getairmail.com', 'getnator.com',
  'mailscrap.com', 'mailshell.com', 'meltmail.com', 'mintemail.com',
  'notmailinator.com', 'obfusmail.com', 'receiveee.com', 'safetymail.info',
  'safetypost.de', 'scrapping.pro', 'selfdestructingmail.com',
  'sendspamhere.com', 'spamavert.com', 'spamfree24.org', 'spamgourmet.com',
  'spamhole.com', 'spammotel.com', 'trashymail.com', 'wegwerfmail.de',
  'wegwerfmail.net', 'mailnull.com', 'mailmoat.com', 'mailblocks.com',
  'emailondeck.com', 'crazymailing.com', 'emailis.fun', 'mfsa.info',
  // — Ajouts OVERLORD — fournisseurs jetables courants (2025-2026) —
  '10minutemail.com', '10minutemail.net', '1secmail.com', '1secmail.org',
  'mail.tm', 'mail.gw', 'guerrillamail.de',
  'burnermail.io', 'inboxbear.com', 'linshi-email.com', 'moakt.com',
  'discard.email', 'dropmail.me', 'edu.bear', 'fake-box.com', 'filzmail.com',
  'hulapla.com', 'inbox.lv', 'inboxhub.net', 'kahhhh.com', 'mbox.re',
  'messagebeamer.de', 'misterpinball.de', 'nada.email', 'naver.com',
  'owleyes.ch', 'piscby.com', 'pooae.com', 'portspam.com', 'rhyta.com',
  'smashmail.com', 'spambog.com', 'spambog.ru', 'supergreatmail.com',
  'teewars.org', 'trbvm.com', 'tmail.io', 'tmail.ws', 'trbvn.com',
  'vmani.com', 'webmail.co.za', 'wupl.com', 'yopmail.gq',
  '33mail.com', 'boximail.com', 'cientiblog.com', 'cleoteries.com',
]);

// Fournisseurs qui ignorent les points dans la partie locale (canonicalisation).
const DOTLESS_PROVIDERS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Canonicalise un email pour neutraliser lesAlias :
 *  - lowercasing + trim,
 *  - retrait du `+tag` (user+tag@… → user@…),
 *  - retrait des points pour les fournisseurs qui les ignorent (gmail).
 * Retourne l'email normalisé, ou null si syntaxe invalide.
 */
export function normalizeEmail(email: string): string | null {
  const trimmed = (email || '').trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);
  if (DOTLESS_PROVIDERS.has(domain)) local = local.replace(/\./g, '');
  if (!local) return null;
  return `${local}@${domain}`;
}

// GUARDIAN (CIBLE 3) — Couche heuristique regex, miroir du trigger backend
// (public.block_disposable_signup). Intercepte instantanément côté client les variants
// de temp-mail non listés explicitement. La BDD reste le mur dur (55 000+ domaines).
const DISPOSABLE_REGEX = /(temp[-_]?mail|throwaway|trash[-_]?mail|mailinator|guerrilla|yopmail|10minute|fake[-_]?box|disposable|mail[-_]?drop|incognito[-_]?mail|burner[-_]?mail|getairmail|mailnesia|sharklasers|spambog|discard\.|dropmail|tempinbox|mintemail|mohmal|nada\.email|notmailinator|spam4\.me)/;

export function isDisposableEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const domain = normalized.split('@')[1];
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  if (DISPOSABLE_REGEX.test(domain)) return true;
  return false;
}
