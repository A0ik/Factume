'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { changeLanguage } from '@/i18n';
import { isDisposableEmail } from '@/lib/disposable-emails';
import { useThemeStore } from '@/stores/themeStore';

let _authUnsubscribe: (() => void) | null = null;

// Clés localStorage à conserver après déconnexion (thème, préférences UI + contexte cabinet)
const PERSISTENT_KEYS = [
  'theme',
  'facturme_shortcuts_disabled',
  'factume_active_cabinet_id',   // MONOLITH LOI 1: le cabinet actif survit à la déconnexion
];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userId: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setProfile: (profile: Profile) => void;
  completeOnboarding: () => void;
  markTutorialSeen: () => void;
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
      // GUARDIAN (CIBLE 1) — transmet le thème choisi à l'onboarding pour persistance (trigger handle_new_user).
      const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
      const themePref: 'light' | 'dark' = storedTheme === 'light' ? 'light' : 'dark';
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password, options: { data: { cgu_accepted: true, cgu_accepted_at: new Date().toISOString(), theme_preference: themePref } } });
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

  // BASTION (CIBLE 2) — Vérification du code OTP reçu par email à l'inscription.
  // L'utilisateur n'est JAMAIS connecté tant que ce code n'est pas validé
  // (confirmations email activées côté Supabase → signUp ne crée pas de session).
  verifyEmailOtp: async (email, token) => {
    set({ loading: true });
    try {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token,
        type: 'email', // type 'email' = confirmation d'inscription (doc JS ref : "Verify Signup OTP")
      });
      if (error) throw error;
      // Une session valide n'est renvoyée QUE si le code est correct.
      if (data.user) {
        set({ user: data.user, session: data.session });
        await get().fetchProfile(data.user.id);
      }
    } finally { set({ loading: false }); }
  },

  resendSignupOtp: async (email) => {
    set({ loading: true });
    try {
      const { error } = await getSupabaseClient().auth.resend({ email, type: 'signup' });
      if (error) throw error;
    } finally { set({ loading: false }); }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      // PHOENIX FIX (CRISE 2) : l'ancien flux contournait Supabase (OAuth Google
      // direct avec redirect_uri=/auth/callback + response_type=code), MAIS la page
      // /auth/callback n'échangeait JAMAIS ce code → getSession() retournait null →
      // redirect /login → connexion Google totalement cassée.
      // On revient à l'OAuth Supabase natif : Supabase gère PKCE + échange + session.
      // La marque « Factu.me » reste visible sur l'écran de consentement Google
      // (configuré dans Google Cloud Console > OAuth consent screen) ; l'URL
      // supabase.co n'apparaît que comme un flash de redirection serveur.
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
      // Pas de reset loading : le navigateur s'apprête à naviguer vers Google.
    } catch (error) {
      set({ loading: false });
      throw error;
    }
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

  markTutorialSeen: () => {
    const { profile } = get();
    set({ profile: profile ? { ...profile, tutorial_wizard_seen: true } : null });
    // OVERDRIVE FIX: Persister en BDD, pas localStorage — le tuto ne doit JAMAIS réapparaître
    if (profile?.id) {
      getSupabaseClient()
        .from('profiles')
        .update({ tutorial_wizard_seen: true, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .then(({ error }) => {
          if (error) console.error('[markTutorialSeen] DB save error:', error.message);
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
      // GUARDIAN (CIBLE 1) — synchronise le thème depuis la préférence serveur (cross-device).
      if (data.theme_preference === 'light' || data.theme_preference === 'dark') {
        try { useThemeStore.getState().setTheme(data.theme_preference); } catch {}
      }
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
