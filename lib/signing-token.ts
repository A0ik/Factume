import { createHmac, timingSafeEqual } from 'crypto';

// ARGOS (sécurité) — Non-répudiation des liens de signature contrat/devis.
// Les tokens sont stockés en BDD sous forme d'UUID v4 (déjà imprévisibles : 122 bits
// d'entropie, sufisant contre une énumération). La signature HMAC ajoute une défense
// contre une FUITE DE BDD : sans le secret serveur, un attaquant ne peut pas forger un
// lien valide même en lisant la table des tokens.
//
// Design SANS RUPTURE :
//  - DOCUMENT_SIGNING_SECRET non configuré (ou < 16 chars) → HMAC désactivé, l'URL porte
//    l'UUID brut. La signature reste 100 % fonctionnelle (sécurité = entropie UUID).
//  - Anciens liens déjà envoyés (UUID brut, pas de '.') → toujours acceptés (legacy).
//  - Nouveaux liens ('<uuid>.<hmac>') → HMAC vérifié en temps constant.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(): string | null {
  const s = process.env.DOCUMENT_SIGNING_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** Signe un UUID de token → URL `<uuid>.<hmac>` (ou UUID brut si secret absent). */
export function signToken(uuid: string): string {
  const secret = getSecret();
  if (!secret) return uuid;
  const hmac = createHmac('sha256', secret).update(uuid).digest('hex');
  return `${uuid}.${hmac}`;
}

/**
 * Vérifie un token d'URL et renvoie l'UUID à chercher en BDD, ou null si invalide.
 * Accepte '<uuid>.<hmac>' (nouveau) et '<uuid>' (legacy / secret absent).
 */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const dot = token.lastIndexOf('.');
  if (dot === -1) {
    // Legacy : UUID brut (lien envoyé avant le HMAC, ou secret absent lors du sign).
    return UUID_RE.test(token) ? token : null;
  }

  const uuid = token.slice(0, dot);
  const hmac = token.slice(dot + 1);
  if (!UUID_RE.test(uuid)) return null;

  const secret = getSecret();
  if (!secret) return uuid; // secret retiré en prod → on tolère (graceful).

  const expected = createHmac('sha256', secret).update(uuid).digest('hex');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? uuid : null;
}
