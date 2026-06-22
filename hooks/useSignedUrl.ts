'use client';

import { useEffect, useState } from 'react';
import { isReceiptsPrivateUrl } from '@/lib/receipt-storage';

/**
 * ZEUS (CIBLE 2) — Résout une URL de justificatif en URL réellement lisible.
 *
 *  • URLs du bucket PRIVÉ `receipts` (pipeline OCR) → résolues en URL signée
 *    via /api/storage/signed-url (avec cache module-level à TTL court).
 *  • Tout le reste (blob:, data:, bucket public `assets`, URLs déjà signées…)
 *    est renvoyé tel quel.
 *
 * Retourne `{ url, loading }` pour pouvoir afficher un état de chargement
 * sans tomber sur le fallback « aucun aperçu » pendant la résolution.
 */

interface CacheEntry {
  url: string;
  expiresAt: number;
}
const signedUrlCache = new Map<string, CacheEntry>();

export function useSignedUrl(rawUrl: string | null | undefined): {
  url: string | null;
  loading: boolean;
} {
  const [resolved, setResolved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsSigning = isReceiptsPrivateUrl(rawUrl);

  useEffect(() => {
    if (!rawUrl) {
      setResolved(null);
      setLoading(false);
      return;
    }
    // Pas un justificatif du bucket privé : on laisse passer tel quel.
    if (!needsSigning) {
      setResolved(rawUrl);
      setLoading(false);
      return;
    }
    // Déjà résolu & encore valide ? On évite le re-fetch.
    const cached = signedUrlCache.get(rawUrl);
    if (cached && cached.expiresAt > Date.now()) {
      setResolved(cached.url);
      setLoading(false);
      return;
    }

    // Changement de source : on purge la valeur stale pour ne pas afficher
    // l'aperçu précédent pendant la résolution de la nouvelle URL signée.
    setResolved(null);
    let cancelled = false;
    setLoading(true);
    fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.signedUrl) {
          setResolved(data.signedUrl);
          const expiresIn = typeof data.expiresIn === 'number' ? data.expiresIn : 3600;
          // On garde une marge de 60 s avant l'expiration réelle.
          signedUrlCache.set(rawUrl, {
            url: data.signedUrl,
            expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
          });
        } else {
          setResolved(null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, needsSigning]);

  return { url: resolved, loading };
}
