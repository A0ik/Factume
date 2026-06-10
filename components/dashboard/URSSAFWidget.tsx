'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, CalendarClock, ChevronRight, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  type MicroRegime,
  URSSAF_RATES_2026,
  REGIME_SHORT_LABELS,
  getCurrentQuarter,
  getDaysUntilDeadline,
  calculateURSSAFReserve,
  mapFiscalRegime,
} from '@/lib/urssaf-calculator';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// URSSAF Widget — Dashboard Card
// Killer #1 : "URSSAF One-Click"
// Affiche la réserve URSSAF à mettre de côté, le régime, et la deadline
// ---------------------------------------------------------------------------

interface URSSAFWidgetData {
  regime: MicroRegime;
  regimeLabel: string;
  urssafRate: number;
  quarterRevenue: number;
  reserveAmount: number;
  percentage: number;
  daysUntilDeadline: number;
  quarterLabel: string;
}

export default function URSSAFWidget() {
  const profile = useAuthStore(state => state.profile);
  const [data, setData] = useState<URSSAFWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) { setLoading(false); return; }

      const regime = mapFiscalRegime(
        (profile as any)?.regime_fiscal,
        profile.legal_status,
      );

      if (!regime) { setLoading(false); return; }

      try {
        // Fetch current quarter's paid invoices for revenue
        const { quarter, year } = getCurrentQuarter();
        const quarterStartMonth = (quarter - 1) * 3;
        const startDate = new Date(year, quarterStartMonth, 1).toISOString();
        const endDate = new Date(year, quarterStartMonth + 3, 0).toISOString(); // last day of quarter

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        // We need the server client for user-scoped queries, but since this is a widget
        // that runs client-side, we'll use a simplified approach via an API call
        const res = await fetch(`/api/dashboard/urssaf-data?startDate=${startDate}&endDate=${endDate}`);
        let quarterRevenue = 0;

        if (res.ok) {
          const result = await res.json();
          quarterRevenue = result.totalRevenue || 0;
        }

        const { deadline } = getCurrentQuarter();
        const reserve = calculateURSSAFReserve(quarterRevenue, regime);

        setData({
          regime,
          regimeLabel: REGIME_SHORT_LABELS[regime],
          urssafRate: URSSAF_RATES_2026[regime],
          quarterRevenue,
          reserveAmount: reserve.reserveAmount,
          percentage: reserve.percentage,
          daysUntilDeadline: getDaysUntilDeadline(deadline),
          quarterLabel: `T${quarter} ${year}`,
        });
      } catch (e) {
        console.error('[URSSAFWidget] Error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0F0F12] border border-white/[0.06] p-5 animate-pulse">
        <div className="h-4 bg-white/[0.04] rounded w-24 mb-4" />
        <div className="h-8 bg-white/[0.04] rounded w-32 mb-2" />
        <div className="h-3 bg-white/[0.04] rounded w-40" />
      </div>
    );
  }

  if (!data) return null; // Régime non-micro → pas de widget

  const deadlineColor = data.daysUntilDeadline < 0
    ? 'text-red-400'
    : data.daysUntilDeadline <= 15
    ? 'text-amber-400'
    : 'text-zinc-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-[#0F0F12] border border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Shield size={15} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Réserve URSSAF</h3>
            <p className="text-[10px] text-zinc-500">{data.regimeLabel} · {data.urssafRate}%</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold', deadlineColor)}>
          <CalendarClock size={13} />
          {data.daysUntilDeadline < 0
            ? 'Dépassé'
            : data.daysUntilDeadline === 0
            ? "Aujourd'hui"
            : `${data.daysUntilDeadline}j`}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Main number */}
        <div className="flex items-end gap-2 mb-3">
          <p className="text-2xl font-black text-zinc-100">{formatCurrency(data.reserveAmount)}</p>
          {data.percentage > 0 && (
            <span className="text-xs text-zinc-500 mb-1">({data.percentage}% du CA)</span>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Montant à mettre de côté · {data.quarterLabel}
        </p>

        {/* Progress bar */}
        {data.quarterRevenue > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-500">CA du trimestre</span>
              <span className="text-zinc-400 font-semibold">{formatCurrency(data.quarterRevenue)}</span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (data.reserveAmount / data.quarterRevenue) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {data.quarterRevenue === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <Info size={13} className="text-zinc-600 flex-shrink-0" />
            <p className="text-[11px] text-zinc-500">Aucun CA enregistré ce trimestre</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
