'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import type { Cabinet, CabinetMember, CabinetClient } from '@/types';

interface CabinetState {
  cabinet: Cabinet | null;
  members: CabinetMember[];
  clients: CabinetClient[];
  loading: boolean;

  fetchCabinet: () => Promise<void>;
  createCabinet: (name: string, siret?: string) => Promise<void>;
  updateCabinet: (data: Partial<Cabinet>) => Promise<void>;
  inviteClient: (email: string) => Promise<void>;
  removeClient: (clientUserId: string) => Promise<void>;
  fetchClientData: (clientUserId: string) => Promise<any>;
}

export const useCabinetStore = create<CabinetState>((set, get) => ({
  cabinet: null,
  members: [],
  clients: [],
  loading: false,

  fetchCabinet: async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ loading: true });
    try {
      const res = await fetch('/api/cabinet/clients', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { clients, cabinet } = await res.json();
        set({ clients, cabinet });
      }
    } finally {
      set({ loading: false });
    }
  },

  createCabinet: async (name, siret) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    set({ loading: true });
    try {
      const res = await fetch('/api/cabinet/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, siret }),
      });
      if (res.ok) {
        const { cabinet } = await res.json();
        set({ cabinet });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateCabinet: async (data) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const res = await fetch('/api/cabinet/clients', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Erreur lors de la mise à jour');
    }
    await get().fetchCabinet();
  },

  inviteClient: async (email) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const res = await fetch('/api/cabinet/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      await get().fetchCabinet();
    } else {
      const { error } = await res.json();
      throw new Error(error || 'Erreur');
    }
  },

  removeClient: async (clientUserId) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const res = await fetch('/api/cabinet/clients', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ clientUserId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Erreur lors de la suppression');
    }
    await get().fetchCabinet();
  },

  fetchClientData: async (clientUserId) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const res = await fetch(`/api/cabinet/clients/${clientUserId}/data`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) return await res.json();
    return null;
  },
}));
