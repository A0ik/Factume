'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cabinetFetch, clearCabinetCache } from './useCabinetFetch';

export interface UseCabinetDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseCabinetDataOptions {
  /** Pause fetching until cabinet is ready (default: true) */
  pauseUntilCabinetReady?: boolean;
  /** Custom data key to extract from JSON response */
  dataKey?: string;
  /** URL query params */
  params?: Record<string, string>;
  /** Disabled fetching entirely */
  disabled?: boolean;
  /** Don't use cache for this request */
  noCache?: boolean;
  /** Return the full JSON object as-is (skip auto-detect). Use for composite responses. */
  wholeObject?: boolean;
}

export function useCabinetData<T>(
  url: string | null,
  options: UseCabinetDataOptions = {},
): UseCabinetDataReturn<T> {
  const {
    pauseUntilCabinetReady = true,
    dataKey,
    params,
    disabled = false,
    noCache = false,
    wholeObject = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Build full URL with params
  const fullUrl = (() => {
    if (!url) return null;
    if (!params) return url;
    const qs = new URLSearchParams(params).toString();
    return `${url}?${qs}`;
  })();

  const fetchData = useCallback(async (bustCache = false) => {
    if (!fullUrl || disabled) return;

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await cabinetFetch<T>(fullUrl, {
        signal: controller.signal,
        dataKey,
        wholeObject,
        noCache: noCache || bustCache,
      });

      if (!mountedRef.current) return;
      if (!controller.signal.aborted) {
        setData(result);
        setError(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(err.message || 'Erreur de chargement');
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fullUrl, dataKey, disabled, noCache, wholeObject]);

  const refresh = useCallback(async () => {
    clearCabinetCache(fullUrl || undefined);
    await fetchData(true);
  }, [fullUrl, fetchData]);

  // Auto-fetch on mount and when URL changes
  useEffect(() => {
    mountedRef.current = true;
    if (disabled || !fullUrl) {
      setLoading(false);
      return;
    }

    // Small delay to let cabinet guard settle
    const timer = setTimeout(() => {
      fetchData();
    }, 50);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fullUrl, disabled, fetchData]);

  return { data, loading, error, refresh };
}

// Convenience hook for cabinet mutations (POST, PUT, PATCH, DELETE)
export function useCabinetMutation() {
  const mutate = useCallback(async <T>(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
  ): Promise<T> => {
    const { cabinetFetch: cf } = await import('./useCabinetFetch');
    // Use cabinetMutation from useCabinetFetch
    const { cabinetMutation } = await import('./useCabinetFetch');
    return cabinetMutation<T>(url, method, body);
  }, []);

  return { mutate };
}
