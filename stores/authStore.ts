'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { changeLanguage } from '@/i18n';
import { isDisposableEmail } from '@/lib/disposable-emails';

let _authUnsubscribe: (() => void) | null = null;

// Clés localStorage à conserver après déconnexion (thème, préférences UI)
const PERSISTENT_KEYS = ['theme', 'facturme_shortcuts_disabled'];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userId: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setProfile: (profile: Profile) => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, session: null, profile: null, loading: false, initialized: false,

  initialize: async () => {
    // Guard: if Supabase is not configured (landing page, missing env vars),
    // skip auth init entirely so the page renders without crash.
    const client = getSupabaseClient();
    if (!client) {
      set({ initialized: true });
      return;
    }

    if (_authUnsubscribe) { _authUnsubscribe(); _authUnsubscribe = null; }

    // Setup listener BEFORE getSession to avoid race conditions
    let profileDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user, session });
        // Debounce fetchProfile to prevent duplicate calls
        const uid = session.user.id;
        if (profileDebounceTimer) clearTimeout(profileDebounceTimer);
        profileDebounceTimer = setTimeout(() => get().fetchProfile(uid), 300);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, profile: null });
      }
    });
    _authUnsubscribe = () => {
      subscription.unsubscribe();
      if (profileDebounceTimer) clearTimeout(profileDebounceTimer);
    };

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) { await client.auth.signOut(); }
      else if (session?.user) { set({ user: session.user, session }); await get().fetchProfile(session.user.id); }
    } catch (e: any) {
      if (e?.message?.includes('Refresh Token')) await client.auth.signOut();
    } finally { set({ initialized: true }); }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) { set({ user: data.user, session: data.session }); await get().fetchProfile(data.user.id); }
    } finally { set({ loading: false }); }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    if (isDisposableEmail(email)) throw new Error('Les adresses email jetables ne sont pas acceptées. Veuillez utiliser une adresse email valide.');
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password, options: { data: { cgu_accepted: true, cgu_accepted_at: new Date().toISOString() } } });
      if (error) throw error;
      if (!data.user) throw new Error('Erreur lors de la création du compte');
      set({ user: data.user, session: data.session });
      if (!data.session) throw new Error('CONFIRM_EMAIL');
      const { error: profileError } = await getSupabaseClient().from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        company_name: '',
        language: 'fr',
        onboarding_done: false,
        created_at: new Date().toISOString(),
      }).select().single();
      if (profileError) console.error('[signUp] profile creation warning:', profileError.message);
      return { userId: data.user.id };
    } finally { set({ loading: false }); }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } finally { set({ loading: false }); }
  },

  signOut: async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // Session may already be invalid — ignore errors
    }
    set({ user: null, session: null, profile: null });
    if (typeof window !== 'undefined') {
      // Conserver uniquement les préférences UI persistantes
      const saved: Record<string, string> = {};
      for (const key of PERSISTENT_KEYS) {
        const val = localStorage.getItem(key);
        if (val !== null) saved[key] = val;
      }
      localStorage.clear();
      for (const [key, val] of Object.entries(saved)) {
        localStorage.setItem(key, val);
      }
      // Note: window.location.href is intentional here - we want a full page reload after logout
      window.location.href = '/login';
    }
  },

  setProfile: (profile) => set({ profile }),

  completeOnboarding: () => {
    const { profile } = get();
    set({ profile: profile ? { ...profile, onboarding_done: true } : null });
    // ARBITER FIX: Sauvegarder onboarding_done en BDD, pas juste en local
    if (profile?.id) {
      getSupabaseClient()
        .from('profiles')
        .update({ onboarding_done: true, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .then(({ error }) => {
          if (error) console.error('[completeOnboarding] DB save error:', error.message);
        });
    }
  },

  fetchProfile: async (userId) => {
    const { data, error } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') return;
    if (data) {
      if (data.is_trial_active && data.trial_end_date && new Date(data.trial_end_date) < new Date()) {
        // Trial expiré : update local uniquement (le RPC expire_trials est restreint à service_role)
        set({ profile: { ...data, is_trial_active: false, subscription_tier: 'free' } });
      } else {
        set({ profile: data });
      }
      if (data.language) changeLanguage(data.language).catch(() => {});
      // Web Push enregistré en différé (30s) pour ne pas interrompre l'expérience
      setTimeout(() => registerWebPush(userId).catch(() => {}), 30_000);
    }
  },

  updateProfile: async (updates) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user ?? get().user;
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('profiles').upsert({ id: user.id, email: user.email ?? '', ...updates, updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    if (data) set({ profile: data });
  },
}));

async function registerWebPush(userId: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    // Ne demander la permission que si elle n'a pas déjà été accordée ou refusée
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
    await getSupabaseClient().from('profiles').update({ web_push_subscription: JSON.stringify(sub) }).eq('id', userId);
  } catch {}
}

function urlBase64ToUint8Array(b64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}
