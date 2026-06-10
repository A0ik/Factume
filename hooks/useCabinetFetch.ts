'use client';

import { getSupabaseClient } from '@/lib/supabase';

// ─── In-memory cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(url: string): string {
  return url;
}

export function clearCabinetCache(url?: string) {
  if (url) {
    cache.delete(getCacheKey(url));
  } else {
    cache.clear();
  }
}

// ─── Session token cache ──────────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiry = 0; // epoch ms

async function getSessionToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  // Reuse token for 5 minutes (unless forced refresh)
  if (!forceRefresh && _token && now < _tokenExpiry) return _token;

  try {
    const supabase = getSupabaseClient();
    // LOI 1 (SENTINEL) : Si le token est potentiellement expiré, forcer un refresh.
    // On utilise refreshSession() au lieu de getSession() pour obtenir un token frais.
    const { data: { session } } = forceRefresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession();
    if (session?.access_token) {
      _token = session.access_token;
      _tokenExpiry = now + 5 * 60_000;
      return _token;
    }
  } catch {}
  return null;
}

export function setSessionToken(token: string) {
  _token = token;
  _tokenExpiry = Date.now() + 5 * 60_000;
}

// ─── Fetch with retry + cache ─────────────────────────────────────────────────

const BACKOFF_MS = [500, 1_000, 2_000];

export interface CabinetFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip cache for this request */
  noCache?: boolean;
  /** Parse response as JSON key (default: auto-detect first key) */
  dataKey?: string;
}

export async function cabinetFetch<T>(
  url: string,
  options: CabinetFetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders, signal, noCache, dataKey } = options;

  // Check cache for GET requests
  if (method === 'GET' && !noCache) {
    const cached = cache.get(getCacheKey(url));
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  const token = await getSessionToken();
  if (!token) throw new Error('Non authentifié');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    // Check if aborted before attempting
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      // Handle 429 — respect Retry-After
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10) * 1000;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, retryAfter || BACKOFF_MS[attempt]));
          continue;
        }
        throw new Error('Trop de requêtes — réessayez dans quelques secondes');
      }

      if (!res.ok) {
        // LOI 1 (SENTINEL) : Si 401, le token est expiré → forcer un refresh et retry
        if (res.status === 401 && attempt < 2) {
          const freshToken = await getSessionToken(true);
          if (freshToken) {
            headers.Authorization = `Bearer ${freshToken}`;
            continue; // Retry with fresh token
          }
        }
        const { error } = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        throw new Error(error || `Erreur ${res.status}`);
      }

      const json = await res.json();

      // Extract data from response
      let data: T;
      if (dataKey) {
        data = json[dataKey];
      } else if (typeof json === 'object' && json !== null) {
        // Auto-detect: take the first array value, or the whole object
        const keys = Object.keys(json);
        const arrayKey = keys.find(k => Array.isArray(json[k]));
        data = arrayKey ? json[arrayKey] : json;
      } else {
        data = json;
      }

      // Cache GET responses
      if (method === 'GET' && !noCache) {
        cache.set(getCacheKey(url), { data, timestamp: Date.now() });
      }

      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
      }
    }
  }

  throw lastError || new Error('Erreur réseau');
}

// ─── Mutations (POST, PUT, PATCH, DELETE) — no cache ──────────────────────────

export async function cabinetMutation<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  return cabinetFetch<T>(url, {
    method,
    body,
    noCache: true,
    signal: options?.signal,
  });
}
