'use client';

import { cn } from '@/lib/utils';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  className?: string;
}

// Donut SVG pur — pas de dépendance, thème-agnostique (couleurs fournies).
export function DonutChart({
  data,
  size = 160,
  thickness = 22,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  let acc = 0;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-5', className)}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Piste de fond */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth={thickness}
            className="stroke-gray-100"
          />
          {total > 0 &&
            data.map((slice, i) => {
              const frac = slice.value / total;
              const dash = frac * c;
              const offset = -acc * c;
              acc += frac;
              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            {centerValue && (
              <span className="text-2xl font-black text-gray-900 leading-none">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 text-center px-2">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Légende */}
      <ul className="flex-1 space-y-2 w-full">
        {data.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700 flex-1 truncate">{slice.label}</span>
              <span className="text-gray-400 text-xs font-medium tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
