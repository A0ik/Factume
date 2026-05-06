'use client';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect, useCallback } from 'react';

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
}

interface ReferralData {
  code: string | null;
  shareLink: string;
  stats: ReferralStats;
  loading: boolean;
  generateCode: () => Promise<void>;
}

export function useReferral(): ReferralData {
  const profile = useAuthStore((s) => s.profile);
  const [code, setCode] = useState<string | null>(profile?.referral_code || null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
  });
  const [loading, setLoading] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const generateCode = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/referral/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      });
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
      }
    } catch (err) {
      console.error('[useReferral] generate error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/referral/stats?userId=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalReferrals: data.total ?? 0,
            completedReferrals: data.completed ?? 0,
            pendingReferrals: data.pending ?? 0,
          });
        }
      } catch {
        // stats endpoint may not exist yet
      }
    };

    if (profile.referral_code) {
      setCode(profile.referral_code);
      fetchStats();
    }
  }, [profile?.id, profile?.referral_code]);

  return {
    code,
    shareLink: code ? `${baseUrl}/signup?ref=${code}` : '',
    stats,
    loading,
    generateCode,
  };
}
