const DISPOSABLE_DOMAINS = new Set([
  'guerrillamail.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'sharklasers.com', 'spam4.me', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'tempmail.io', 'temp-mail.com',
  'throwaway.email', 'throwawaymail.com', 'mailinator.com', 'mailinator2.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'jetable.org', 'jetable.fr',
  'maildrop.cc', 'maildrop.xyz', 'mailnesia.com', 'tempail.com',
  'dispostable.com', 'trashmail.com', 'trashmail.io', 'trashmail.ws',
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
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}
