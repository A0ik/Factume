import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn('[Supabase] Missing env vars — auth disabled. Landing page works fine.');
      return null as unknown as ReturnType<typeof createBrowserClient>;
    }
    _client = createBrowserClient(url, key);
  }
  return _client;
}

