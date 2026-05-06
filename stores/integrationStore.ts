'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import type { Integration, BankConnection } from '@/types';

interface IntegrationState {
  integrations: Integration[];
  bankConnections: BankConnection[];
  loading: boolean;
  syncing: boolean;

  fetchIntegrations: () => Promise<void>;
  connectIntegration: (provider: string, config: Record<string, any>) => Promise<void>;
  disconnectIntegration: (provider: string) => Promise<void>;
  syncIntegration: (provider: string) => Promise<void>;
  fetchBankConnections: () => Promise<void>;
  connectBank: () => Promise<string | null>;
  disconnectBank: (connectionId: string) => Promise<void>;
  syncBankTransactions: (connectionId: string) => Promise<void>;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  bankConnections: [],
  loading: false,
  syncing: false,

  fetchIntegrations: async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const res = await fetch('/api/integrations/list', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { integrations } = await res.json();
      set({ integrations });
    }
  },

  connectIntegration: async (provider, config) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ loading: true });
    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Erreur connexion');
      await get().fetchIntegrations();
    } finally {
      set({ loading: false });
    }
  },

  disconnectIntegration: async (provider) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await fetch(`/api/integrations/${provider}/connect`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await get().fetchIntegrations();
  },

  syncIntegration: async (provider) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ syncing: true });
    try {
      await fetch(`/api/integrations/${provider}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await get().fetchIntegrations();
    } finally {
      set({ syncing: false });
    }
  },

  fetchBankConnections: async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const res = await fetch('/api/bank-feed/accounts', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { connections } = await res.json();
      set({ bankConnections: connections });
    }
  },

  connectBank: async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const res = await fetch('/api/bank-feed/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      return url;
    }
    return null;
  },

  disconnectBank: async (connectionId) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await fetch('/api/bank-feed/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ connectionId }),
    });
    await get().fetchBankConnections();
  },

  syncBankTransactions: async (connectionId) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ syncing: true });
    try {
      await fetch('/api/bank-feed/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ connectionId }),
      });
      await get().fetchBankConnections();
    } finally {
      set({ syncing: false });
    }
  },
}));
