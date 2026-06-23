'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useThemeStore } from '@/stores/themeStore';
import type { TreasuryPrediction, TreasuryDataPoint } from '@/lib/treasury-predictor';

// ---------------------------------------------------------------------------
// Treasury Widget — 30-day cash flow forecast
// Killer #4: Copilot Factu — Treasury Prediction
// ---------------------------------------------------------------------------

export default function TreasuryWidget() {
  const [prediction, setPrediction] = useState<TreasuryPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  // APOLLON — source de vérité unique : `resolvedTheme` reflète toujours la classe
  // `.dark` réelle sur <html> (applyTheme). On ne lit plus `theme` (qui peut valoir
  // 'system') : conteneur (dark: variants) et graphe (JS) suivent ainsi le MÊME mode.
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#52525b' : '#9ca3af';
  const tooltipStyle = {
    background: isDark ? '#1a1a1e' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: '8px',
    fontSize: '11px',
    color: isDark ? '#e4e4e7' : '#111827',
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/copilot/treasury');
        if (res.ok) {
          const data = await res.json();
          setPrediction(data.prediction);
        }
      } catch (e) {
        console.error('[TreasuryWidget] Error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 animate-pulse">
        <div className="h-4 bg-gray-100 dark:bg-white/[0.04] rounded w-24 mb-4" />
        <div className="h-[120px] bg-gray-50 dark:bg-white/[0.02] rounded" />
      </div>
    );
  }

  if (!prediction) return null;

  const chartData = prediction.projection30.map((p: TreasuryDataPoint) => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    balance: p.predictedBalance,
    isNeg: p.isNegative,
  }));

  const hasAlert = prediction.alertDays.length > 0;
  const isPositive = prediction.minBalance30.amount >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isPositive ? 'bg-blue-500/10' : 'bg-red-500/10'
          )}>
            {isPositive
              ? <TrendingUp size={15} className="text-blue-400" />
              : <TrendingDown size={15} className="text-red-400" />
            }
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Prévision Trésorerie</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Projection 30 jours</p>
          </div>
        </div>
        {hasAlert && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold">
            <AlertTriangle size={11} />
            {prediction.alertDays.length}j à risque
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-5 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="treasuryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"} stopOpacity={1} />
                <stop offset="95%" stopColor={isPositive ? "rgba(16,185,129,0)" : "rgba(239,68,68,0)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [formatCurrency(value), 'Solde']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"}
              strokeWidth={1.5}
              fill="url(#treasuryGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Solde actuel</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(prediction.currentBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Min à 30j</p>
          <p className={cn(
            'text-sm font-bold',
            prediction.minBalance30.amount >= 0 ? 'text-blue-400' : 'text-red-400'
          )}>
            {formatCurrency(prediction.minBalance30.amount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Impayés</p>
          <p className="text-sm font-bold text-amber-400">{formatCurrency(prediction.totalOutstanding)}</p>
        </div>
      </div>
    </motion.div>
  );
}
