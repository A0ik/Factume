'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { TreasuryPrediction, TreasuryDataPoint } from '@/lib/treasury-predictor';

// ---------------------------------------------------------------------------
// Treasury Widget — 30-day cash flow forecast
// Killer #4: Copilot Factu — Treasury Prediction
// ---------------------------------------------------------------------------

export default function TreasuryWidget() {
  const [prediction, setPrediction] = useState<TreasuryPrediction | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="rounded-2xl bg-[#0F0F12] border border-white/[0.06] p-5 animate-pulse">
        <div className="h-4 bg-white/[0.04] rounded w-24 mb-4" />
        <div className="h-[120px] bg-white/[0.02] rounded" />
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
      className="rounded-2xl bg-[#0F0F12] border border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
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
            <h3 className="text-sm font-bold text-zinc-100">Prévision Trésorerie</h3>
            <p className="text-[10px] text-zinc-500">Projection 30 jours</p>
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
                <stop offset="5%" stopColor={isPositive ? "rgba(59,130,246,0.3)" : "rgba(239,68,68,0.3)"} stopOpacity={1} />
                <stop offset="95%" stopColor={isPositive ? "rgba(59,130,246,0)" : "rgba(239,68,68,0)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a1e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#e4e4e7',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Solde']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "rgba(59,130,246,0.6)" : "rgba(239,68,68,0.6)"}
              strokeWidth={1.5}
              fill="url(#treasuryGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600">Solde actuel</p>
          <p className="text-sm font-bold text-zinc-100">{formatCurrency(prediction.currentBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-600">Min à 30j</p>
          <p className={cn(
            'text-sm font-bold',
            prediction.minBalance30.amount >= 0 ? 'text-blue-400' : 'text-red-400'
          )}>
            {formatCurrency(prediction.minBalance30.amount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-600">Impayés</p>
          <p className="text-sm font-bold text-amber-400">{formatCurrency(prediction.totalOutstanding)}</p>
        </div>
      </div>
    </motion.div>
  );
}
