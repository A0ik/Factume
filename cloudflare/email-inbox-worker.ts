/**
 * Cloudflare Email Worker — Import factures par email (factu.me)
 * --------------------------------------------------------------------------
 * Reçoit les emails envoyés à factures+<token>@factu.me, extrait les pièces
 * jointes (factures/reçus) via postal-mime, et les POST vers l'API factu.me
 * /api/inbox/email-import qui déclenche l'OCR Gemini + crée la dépense.
 *
 * Déploiement : voir cloudflare/EMAIL_INBOX_SETUP.md
 *
 * Variables/secret Cloudflare (wrangler) :
 *   APP_URL                 = https://factu.me
 *   INBOX_WEBHOOK_SECRET    = <shared secret — doit matcher Vercel INBOX_WEBHOOK_SECRET>
 *   INBOX_PREFIX (opt)      = factures (défaut)
 *   INBOX_DOMAIN (opt)      = factu.me (défaut)
 */
import PostalMime from 'postal-mime';

interface ForwardableEmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream;
  setReject(reason?: string): void;
  reply(message: string): Promise<void>;
}

interface Env {
  APP_URL: string;
  INBOX_WEBHOOK_SECRET: string;
  INBOX_PREFIX?: string;
  INBOX_DOMAIN?: string;
}

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
]);

function u8ToB64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function toB64(content: unknown): string | null {
  if (typeof content === 'string') {
    // postal-mime peut renvoyer déjà en base64 (selon version) — on tente de valider.
    return content;
  }
  if (content instanceof Uint8Array) return u8ToB64(content);
  if (ArrayBuffer.isView(content)) return u8ToB64(new Uint8Array(content.buffer, content.byteOffset, content.byteLength));
  if (content instanceof ArrayBuffer) return u8ToB64(new Uint8Array(content));
  return null;
}

function extractToken(to: string, prefix: string, domain: string): string | null {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = to.match(new RegExp(`${esc(prefix)}\\+([a-z0-9]+)@${esc(domain)}`, 'i'));
  return m ? m[1].toLowerCase() : null;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const prefix = env.INBOX_PREFIX || 'factures';
    const domain = env.INBOX_DOMAIN || 'factu.me';
    const token = extractToken(message.to, prefix, domain);
    if (!token) {
      message.setReject('Adresse sans token valide');
      return;
    }

    const raw = await new Response(message.raw).arrayBuffer();
    const email = await new PostalMime().parse(raw);

    const attachments: Array<{ filename: string; content_type: string; data_b64: string }> = [];
    for (const a of email.attachments || []) {
      const mime = (a.mimeType || '').toLowerCase();
      if (!ALLOWED.has(mime)) continue;
      const b64 = toB64((a as any).content);
      if (!b64) continue;
      attachments.push({ filename: a.filename || 'piece', content_type: mime, data_b64: b64 });
      if (attachments.length >= 5) break; // plafond anti-abus
    }

    if (attachments.length === 0) return; // pas de PJ exploitable

    const appUrl = (env.APP_URL || 'https://factu.me').replace(/\/$/, '');
    try {
      const res = await fetch(`${appUrl}/api/inbox/email-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inbox-secret': env.INBOX_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          token,
          from_email: message.from,
          from_name: email.from?.name || '',
          attachments,
        }),
      });
      if (!res.ok) {
        console.error('[email-inbox] import failed', res.status, await res.text());
      }
    } catch (err) {
      console.error('[email-inbox] exception', err);
    }
  },
};
