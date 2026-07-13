import OpenAI from 'openai';

/**
 * CIBLE 1 — Embeddings pour la mémoire Copilot (RAG sémantique pgvector).
 *
 * Provider : OpenRouter (endpoint OpenAI-compatible) — la clé OPENROUTER_API_KEY
 * est déjà utilisée par le copilot LLM, donc aucune nouvelle clé à configurer.
 * Modèle : openai/text-embedding-3-small (1536-d) → correspond à la colonne vector(1536).
 *   Overridable via OPENROUTER_EMBEDDING_MODEL (attention à la dimension !).
 *
 * RÉSILIENCE AVANT TOUT (« sans rien casser ») :
 *   - Si OPENROUTER_API_KEY est absente, toutes les fonctions retournent null / noop.
 *     La colonne copilot_memory.embedding reste NULL et le recall retombe sur
 *     pg_trgm (mots-clés) — comportement inchangé.
 *   - Si l'appel OpenRouter échoue (réseau, quota), on retourne null (pas de crash).
 */

let _client: OpenAI | null = null;
let _checked = false;
let _available = false;

function getClient(): OpenAI | null {
  if (!_checked) {
    _checked = true;
    _available = !!process.env.OPENROUTER_API_KEY;
  }
  if (!_available) return null;
  if (!_client) {
    _client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        // Headers OpenRouter (classement/ranking) — cohérent avec le route copilot LLM.
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me',
        'X-Title': 'Factu.me Copilot',
      },
    });
  }
  return _client;
}

/** Vrai si les embeddings sont activés (clé OpenRouter présente). */
export function embeddingsAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Génère un embedding 1536-d via OpenRouter. Null si pas de clé ou échec.
 * (input tronqué à 8000 char — limite conservative sous le token cap du modèle.)
 */
export async function embed(text: string): Promise<number[] | null> {
  const client = getClient();
  if (!client || !text) return null;
  try {
    const res = await client.embeddings.create({
      // ATTENTION : préfixe « openai/ » requis côté OpenRouter.
      // Dimension = 1536 → DOIT correspondre au vector(1536) de la table.
      model: process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return res.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Format string pour insertion pgvector via PostgREST : '[0.1,0.2,...]'.
 * Null si pas d'embedding disponible (la colonne restera NULL).
 */
export async function embedForInsert(text: string): Promise<string | null> {
  const v = await embed(text);
  if (!v || !v.length) return null;
  return `[${v.join(',')}]`;
}

/**
 * Parse un vecteur retourné par PostgREST (string '[...]' ou déjà un tableau).
 * Null si vide / invalide.
 */
export function parseVector(v: any): number[] | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? (v as number[]) : null;
  if (typeof v === 'string') {
    const s = v.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!s) return null;
    const arr = s.split(',').map((x) => Number(x));
    if (arr.some((n) => !isFinite(n))) return null;
    return arr;
  }
  return null;
}

/** Similarité cosinus entre deux vecteurs de même dimension. 0..1 (ou -1..1). */
export function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || !a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
