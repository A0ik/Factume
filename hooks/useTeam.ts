'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

export interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  invited_at: string | null;
  accepted_at: string | null;
  user_id: string | null;
}

export function useTeam() {
  const profile = useAuthStore((s) => s.profile);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!profile || profile.subscription_tier !== 'business') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/team/members');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const invite = useCallback(async (email: string, role: 'admin' | 'member' | 'viewer') => {
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setInviting(false);
    }
  }, [fetchMembers]);

  const remove = useCallback(async (memberId: string) => {
    try {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [fetchMembers]);

  const updateRole = useCallback(async (memberId: string, role: 'admin' | 'member' | 'viewer') => {
    try {
      const res = await fetch('/api/team/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await fetchMembers();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [fetchMembers]);

  return { members, loading, inviting, invite, remove, updateRole, refresh: fetchMembers };
}
