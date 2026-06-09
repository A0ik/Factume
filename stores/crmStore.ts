'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';

export type OpportunityStage = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type OpportunityPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Opportunity {
  id: string;
  user_id: string;
  client_id?: string | null;
  client_name: string;
  title: string;
  value: number;
  stage: OpportunityStage;
  probability: number;
  priority: OpportunityPriority;
  expected_close_date?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  source?: string | null;
  label?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmTask {
  id: string;
  opportunity_id: string;
  user_id: string;
  title: string;
  done: boolean;
  due_date?: string | null;
  created_at: string;
}

export interface CrmActivity {
  id: string;
  opportunity_id: string;
  user_id: string;
  type: 'note' | 'stage_change' | 'task' | 'email';
  content: string;
  created_at: string;
}

export type OpportunityInput = Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface CrmState {
  opportunities: Opportunity[];
  tasks: Record<string, CrmTask[]>;
  activities: Record<string, CrmActivity[]>;
  loading: boolean;
  fetchOpportunities: () => Promise<void>;
  createOpportunity: (data: OpportunityInput) => Promise<Opportunity>;
  updateOpportunity: (id: string, data: Partial<OpportunityInput>, logActivity?: string) => Promise<void>;
  deleteOpportunity: (id: string) => Promise<void>;
  fetchTasks: (opportunityId: string) => Promise<void>;
  addTask: (opportunityId: string, title: string, dueDate?: string) => Promise<CrmTask>;
  toggleTask: (task: CrmTask) => Promise<void>;
  deleteTask: (task: CrmTask) => Promise<void>;
  fetchActivities: (opportunityId: string) => Promise<void>;
  addActivity: (opportunityId: string, type: CrmActivity['type'], content: string) => Promise<void>;
  clearData: () => void;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  opportunities: [],
  tasks: {},
  activities: {},
  loading: false,

  clearData: () => set({ opportunities: [], tasks: {}, activities: {} }),

  fetchOpportunities: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const userId = session?.user?.id;
      let query = getSupabaseClient()
        .from('opportunities')
        .select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data } = await query.order('created_at', { ascending: false });
      set({ opportunities: data || [] });
    } finally { set({ loading: false }); }
  },

  createOpportunity: async (input) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient()
      .from('opportunities')
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ opportunities: [data, ...s.opportunities] }));
    // Log creation activity
    try {
      await getSupabaseClient().from('crm_activities').insert({
        opportunity_id: data.id, user_id: user.id,
        type: 'note', content: 'Opportunité créée',
      });
    } catch {}
    return data;
  },

  updateOpportunity: async (id, updates, logActivity) => {
    const { data, error } = await getSupabaseClient()
      .from('opportunities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ opportunities: s.opportunities.map((o) => (o.id === id ? data : o)) }));
    if (logActivity) {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (session?.user) {
        try {
          await getSupabaseClient().from('crm_activities').insert({
            opportunity_id: id, user_id: session.user.id,
            type: 'stage_change', content: logActivity,
          });
          // refresh activities
          get().fetchActivities(id);
        } catch {}
      }
    }
  },

  deleteOpportunity: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Non authentifié');
    const { error } = await getSupabaseClient().from('opportunities').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    set((s) => ({
      opportunities: s.opportunities.filter((o) => o.id !== id),
      tasks: Object.fromEntries(Object.entries(s.tasks).filter(([k]) => k !== id)),
      activities: Object.fromEntries(Object.entries(s.activities).filter(([k]) => k !== id)),
    }));
  },

  fetchTasks: async (opportunityId) => {
    const { data } = await getSupabaseClient()
      .from('crm_tasks')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true });
    set((s) => ({ tasks: { ...s.tasks, [opportunityId]: data || [] } }));
  },

  addTask: async (opportunityId, title, dueDate) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient()
      .from('crm_tasks')
      .insert({ opportunity_id: opportunityId, user_id: user.id, title, done: false, due_date: dueDate || null })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ tasks: { ...s.tasks, [opportunityId]: [...(s.tasks[opportunityId] || []), data] } }));
    return data;
  },

  toggleTask: async (task) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Non authentifié');
    const updated = { ...task, done: !task.done };
    await getSupabaseClient().from('crm_tasks').update({ done: updated.done }).eq('id', task.id).eq('user_id', userId);
    set((s) => ({
      tasks: {
        ...s.tasks,
        [task.opportunity_id]: (s.tasks[task.opportunity_id] || []).map((t) => t.id === task.id ? updated : t),
      },
    }));
  },

  deleteTask: async (task) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Non authentifié');
    await getSupabaseClient().from('crm_tasks').delete().eq('id', task.id).eq('user_id', userId);
    set((s) => ({
      tasks: {
        ...s.tasks,
        [task.opportunity_id]: (s.tasks[task.opportunity_id] || []).filter((t) => t.id !== task.id),
      },
    }));
  },

  fetchActivities: async (opportunityId) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const userId = session?.user?.id;
    let query = getSupabaseClient()
      .from('crm_activities')
      .select('*')
      .eq('opportunity_id', opportunityId);
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query.order('created_at', { ascending: false });
    set((s) => ({ activities: { ...s.activities, [opportunityId]: (data || []) as CrmActivity[] } }));
  },

  addActivity: async (opportunityId, type, content) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) return;
    const { data, error } = await getSupabaseClient()
      .from('crm_activities')
      .insert({ opportunity_id: opportunityId, user_id: user.id, type, content })
      .select()
      .single();
    if (error) return;
    set((s) => ({
      activities: {
        ...s.activities,
        [opportunityId]: [data as CrmActivity, ...(s.activities[opportunityId] || [])],
      },
    }));
  },
}));
