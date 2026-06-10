'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import { setSessionToken } from '@/hooks/useCabinetFetch';
import type { Cabinet, CabinetMember, CabinetClient } from '@/types';

interface CabinetInvoice {
  id: string;
  number: string;
  client_id: string;
  status: string;
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  objet: string | null;
  items: any[];
}

interface CabinetEmployee {
  id: string;
  client_id: string;
  last_name: string;
  first_name: string;
  gender: string | null;
  birth_date: string | null;
  job_title: string | null;
  contract_type: string;
  salary_brut_monthly: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
}

interface CabinetMission {
  id: string;
  client_id: string;
  mission_type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  monthly_fee: number | null;
  status: string;
  responsible: string | null;
}

interface CabinetLegalAct {
  id: string;
  client_id: string;
  act_type: string;
  description: string | null;
  act_date: string;
  status: string;
  responsible: string | null;
}

interface CabinetDeadline {
  id: string;
  client_id: string | null;
  deadline_type: string;
  description: string;
  deadline_date: string;
  priority: string;
  status: string;
  responsible: string | null;
}

interface CabinetSocialTracking {
  id: string;
  client_id: string;
  month: number;
  year: number;
  nb_employees: number;
  bs_issued: number;
  bs_validated: number;
  dsn_status: string | null;
  contracts_count: number;
  amendments_count: number;
  at_mp: boolean;
  observations: string | null;
}

interface CabinetState {
  cabinet: Cabinet | null;
  cabinets: Cabinet[];
  activeCabinetId: string | null;
  members: CabinetMember[];
  clients: CabinetClient[];
  invoices: CabinetInvoice[];
  employees: CabinetEmployee[];
  missions: CabinetMission[];
  legalActs: CabinetLegalAct[];
  deadlines: CabinetDeadline[];
  socialTracking: CabinetSocialTracking[];
  loading: boolean;

  hydrateFromCache: () => void;
  fetchCabinets: () => Promise<void>;
  fetchCabinet: () => Promise<void>;
  createCabinet: (name: string, siret?: string) => Promise<Cabinet | null>;
  updateCabinet: (data: Partial<Cabinet>) => Promise<void>;
  switchCabinet: (cabinetId: string) => Promise<void>;
  deleteCabinet: (cabinetId: string) => Promise<void>;
  inviteClient: (email: string) => Promise<void>;
  removeClient: (clientUserId: string) => Promise<void>;
  fetchClientData: (clientUserId: string) => Promise<any>;

  fetchInvoices: (filters?: Record<string, string>) => Promise<void>;
  fetchEmployees: (filters?: Record<string, string>) => Promise<void>;
  fetchMissions: (filters?: Record<string, string>) => Promise<void>;
  fetchLegalActs: (filters?: Record<string, string>) => Promise<void>;
  fetchDeadlines: (filters?: Record<string, string>) => Promise<void>;
  fetchSocialTracking: (month: number, year: number, clientId?: string) => Promise<void>;
}

async function getAuthHeaders(maxRetries = 3): Promise<Record<string, string> | null> {
  const supabase = getSupabaseClient();
  for (let i = 0; i < maxRetries; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Share token with the fetch cache system
      setSessionToken(session.access_token);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };
      // MONOLITH: Transmettre le cabinet actif pour résolution serveur
      const activeId = localStorage.getItem(ACTIVE_CABINET_KEY);
      if (activeId) headers['x-active-cabinet-id'] = activeId;
      return headers;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

const ACTIVE_CABINET_KEY = 'factume_active_cabinet_id';
const CABINET_DATA_KEY = 'factume_cabinet_data';
const CABINET_CLIENTS_KEY = 'factume_cabinet_clients';
const CABINET_EMPLOYEES_KEY = 'factume_cabinet_employees';
let _fetchCabinetPromise: Promise<void> | null = null;
let _fetchClientsPromise: Promise<void> | null = null;
let _fetchEmployeesPromise: Promise<void> | null = null;

export const useCabinetStore = create<CabinetState>((set, get) => ({
  cabinet: null,
  cabinets: [],
  activeCabinetId: null,
  members: [],
  clients: [],
  invoices: [],
  employees: [],
  missions: [],
  legalActs: [],
  deadlines: [],
  socialTracking: [],
  loading: false,

  hydrateFromCache: () => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(CABINET_DATA_KEY);
      if (cached) set({ cabinet: JSON.parse(cached) });
      const activeId = localStorage.getItem(ACTIVE_CABINET_KEY);
      if (activeId) set({ activeCabinetId: activeId });
      const cachedClients = localStorage.getItem(CABINET_CLIENTS_KEY);
      if (cachedClients) set({ clients: JSON.parse(cachedClients) });
      const cachedEmployees = localStorage.getItem(CABINET_EMPLOYEES_KEY);
      if (cachedEmployees) set({ employees: JSON.parse(cachedEmployees) });
    } catch {}
  },

  fetchCabinets: async () => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/cabinet/list', { headers });
      if (res.ok) {
        const { cabinets } = await res.json();
        set({ cabinets: cabinets || [] });

        // If no active cabinet is set, pick the first one
        const currentActive = get().activeCabinetId;
        if (!currentActive && cabinets?.length > 0) {
          const firstId = cabinets[0].id;
          localStorage.setItem(ACTIVE_CABINET_KEY, firstId);
          set({ activeCabinetId: firstId });
        }
      }
    } catch {
      // Silently fail — cabinets list is non-critical
    }
  },

  fetchCabinet: async () => {
    // Deduplicate: if a fetch is already in progress, reuse it
    if (_fetchCabinetPromise) return _fetchCabinetPromise;

    const headers = await getAuthHeaders();
    if (!headers) return;

    _fetchCabinetPromise = (async () => {
      set({ loading: true });
      try {
        const res = await fetch('/api/cabinet/clients', { headers });
        if (res.ok) {
          const { clients, cabinet } = await res.json();
          // Keep existing cabinet if API returns null (race condition after creation)
          const existingCabinet = get().cabinet;
          const resolvedCabinet = cabinet || existingCabinet || null;
          set({ clients, cabinet: resolvedCabinet });
          if (resolvedCabinet) {
            try { localStorage.setItem(CABINET_DATA_KEY, JSON.stringify(resolvedCabinet)); } catch {}
            // MONOLITH: Sauvegarder active_cabinet_id en BDD + localStorage
            const currentActive = get().activeCabinetId;
            if (!currentActive || currentActive !== resolvedCabinet.id) {
              localStorage.setItem(ACTIVE_CABINET_KEY, resolvedCabinet.id);
              set({ activeCabinetId: resolvedCabinet.id });
            }
            // Sauvegarder en profil BDD (fire-and-forget)
            try {
              const supabase = getSupabaseClient();
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                supabase.from('profiles')
                  .update({ active_cabinet_id: resolvedCabinet.id, updated_at: new Date().toISOString() })
                  .eq('id', session.user.id)
                  .then(() => {});
              }
            } catch {}
          } else if (!existingCabinet) {
            try { localStorage.removeItem(CABINET_DATA_KEY); } catch {}
          }
          if (clients) {
            try { localStorage.setItem(CABINET_CLIENTS_KEY, JSON.stringify(clients)); } catch {}
          }
        } else {
          throw new Error(`Cabinet fetch failed: ${res.status}`);
        }
      } catch (err) {
        // On network error, try to restore from cache
        const cached = typeof window !== 'undefined' ? localStorage.getItem(CABINET_DATA_KEY) : null;
        if (cached && !get().cabinet) {
          try { set({ cabinet: JSON.parse(cached) }); } catch {}
        }
        throw err;
      } finally {
        set({ loading: false });
        _fetchCabinetPromise = null;
      }
    })();

    return _fetchCabinetPromise;
  },

  createCabinet: async (name, siret) => {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    set({ loading: true });
    try {
      const res = await fetch('/api/cabinet/clients', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name, siret }),
      });
      if (res.ok) {
        const { cabinet } = await res.json();
        set({ cabinet });
        if (cabinet) {
          try { localStorage.setItem(CABINET_DATA_KEY, JSON.stringify(cabinet)); } catch {}
        }

        // Auto-switch to newly created cabinet and refresh the list
        if (cabinet?.id) {
          localStorage.setItem(ACTIVE_CABINET_KEY, cabinet.id);
          set({ activeCabinetId: cabinet.id });
          // MONOLITH: Sauvegarder en BDD aussi
          try {
            const supabase = getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await supabase.from('profiles')
                .update({ active_cabinet_id: cabinet.id, updated_at: new Date().toISOString() })
                .eq('id', session.user.id);
            }
          } catch {}
          await get().fetchCabinets();
        }
        return cabinet;
      }
      return null;
    } finally {
      set({ loading: false });
    }
  },

  switchCabinet: async (cabinetId) => {
    localStorage.setItem(ACTIVE_CABINET_KEY, cabinetId);
    set({ activeCabinetId: cabinetId });

    // MONOLITH LOI 1: Persister le cabinet actif en BDD (survit à déconnexion)
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        supabase.from('profiles')
          .update({ active_cabinet_id: cabinetId, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.warn('[switchCabinet] profile update failed:', error.message);
          });
      }
    } catch {}

    // Refetch all data for the new cabinet
    const { fetchCabinet, fetchInvoices, fetchEmployees, fetchMissions, fetchLegalActs, fetchDeadlines } = get();
    await Promise.all([
      fetchCabinet(),
      fetchInvoices(),
      fetchEmployees(),
      fetchMissions(),
      fetchLegalActs(),
      fetchDeadlines(),
    ]);
  },

  deleteCabinet: async (cabinetId) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const res = await fetch('/api/cabinet/list', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ cabinetId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Erreur lors de la suppression du cabinet');
    }

    // Refresh the cabinets list
    await get().fetchCabinets();

    // If the deleted cabinet was active, switch to the first available
    const { activeCabinetId, cabinets } = get();
    if (activeCabinetId === cabinetId) {
      if (cabinets.length > 0) {
        await get().switchCabinet(cabinets[0].id);
      } else {
        localStorage.removeItem(ACTIVE_CABINET_KEY);
        set({ activeCabinetId: null, cabinet: null, clients: [], invoices: [], employees: [], missions: [], legalActs: [], deadlines: [], socialTracking: [] });
        try { localStorage.removeItem(CABINET_DATA_KEY); } catch {}
      }
    }
  },

  updateCabinet: async (data) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const res = await fetch('/api/cabinet/clients', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Erreur lors de la mise à jour');
    }
    await get().fetchCabinet();
  },

  inviteClient: async (email) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const res = await fetch('/api/cabinet/invite', {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    if (!headers) return;

    const res = await fetch('/api/cabinet/clients', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ clientUserId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'Erreur lors de la suppression');
    }
    await get().fetchCabinet();
  },

  fetchClientData: async (clientUserId) => {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    const res = await fetch(`/api/cabinet/clients/${clientUserId}/data`, { headers });
    if (res.ok) return await res.json();
    return null;
  },

  fetchInvoices: async (filters) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const params = new URLSearchParams(filters || {});
    const res = await fetch(`/api/cabinet/invoices?${params}`, { headers });
    if (res.ok) {
      const { invoices } = await res.json();
      set({ invoices: invoices || [] });
    }
  },

  fetchEmployees: async (filters) => {
    // Deduplicate: if a fetch is already in progress, reuse it
    if (_fetchEmployeesPromise && !filters) return _fetchEmployeesPromise;

    const headers = await getAuthHeaders();
    if (!headers) return;

    const doFetch = async () => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`/api/cabinet/employees?${params}`, { headers });
      if (res.ok) {
        const { employees } = await res.json();
        set({ employees: employees || [] });
        if (employees && !filters) {
          try { localStorage.setItem(CABINET_EMPLOYEES_KEY, JSON.stringify(employees)); } catch {}
        }
      }
    };

    if (!filters) {
      _fetchEmployeesPromise = doFetch().finally(() => { _fetchEmployeesPromise = null; });
      return _fetchEmployeesPromise;
    }
    return doFetch();
  },

  fetchMissions: async (filters) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const params = new URLSearchParams(filters || {});
    const res = await fetch(`/api/cabinet/missions?${params}`, { headers });
    if (res.ok) {
      const { missions } = await res.json();
      set({ missions: missions || [] });
    }
  },

  fetchLegalActs: async (filters) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const params = new URLSearchParams(filters || {});
    const res = await fetch(`/api/cabinet/legal?${params}`, { headers });
    if (res.ok) {
      const { acts } = await res.json();
      set({ legalActs: acts || [] });
    }
  },

  fetchDeadlines: async (filters) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const params = new URLSearchParams(filters || {});
    const res = await fetch(`/api/cabinet/deadlines?${params}`, { headers });
    if (res.ok) {
      const { deadlines } = await res.json();
      set({ deadlines: deadlines || [] });
    }
  },

  fetchSocialTracking: async (month, year, clientId) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (clientId) params.set('client_id', clientId);
    const res = await fetch(`/api/cabinet/social?${params}`, { headers });
    if (res.ok) {
      const { tracking } = await res.json();
      set({ socialTracking: tracking || [] });
    }
  },
}));
