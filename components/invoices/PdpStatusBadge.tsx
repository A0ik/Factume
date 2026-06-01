'use client';

import { CheckCircle, AlertCircle, Clock, RefreshCw, Shield } from 'lucide-react';

type PdpStatus = 'not_transmitted' | 'transmitting' | 'transmitted' | 'pending_retry' | 'failed';

interface PdpStatusBadgeProps {
  status?: PdpStatus;
  transmittedAt?: string;
  className?: string;
  /** Compact mode for list views (smaller, no text) */
  compact?: boolean;
}

const PDP_CONFIG: Record<PdpStatus, {
  label: string;
  color: string;
  bg: string;
  icon: any;
}> = {
  not_transmitted: {
    label: 'Non transmise',
    color: 'text-slate-400',
    bg: 'bg-slate-100',
    icon: Shield,
  },
  transmitting: {
    label: 'Transmission...',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    icon: Clock,
  },
  transmitted: {
    label: 'Transmise légalement',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: CheckCircle,
  },
  pending_retry: {
    label: 'Retry en cours',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    icon: RefreshCw,
  },
  failed: {
    label: 'Échec transmission',
    color: 'text-red-500',
    bg: 'bg-red-50',
    icon: AlertCircle,
  },
};

export function PdpStatusBadge({ status, transmittedAt, className = '', compact = false }: PdpStatusBadgeProps) {
  if (!status || status === 'not_transmitted') return null;

  const config = PDP_CONFIG[status] || PDP_CONFIG.not_transmitted;
  const Icon = config.icon;

  if (compact) {
    // Compact mode: just an icon badge for list views
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${config.color} ${className}`}
        title={`E-invoicing: ${config.label}${transmittedAt ? ` — ${new Date(transmittedAt).toLocaleString('fr-FR')}` : ''}`}
      >
        <Icon size={11} className={status === 'transmitting' ? 'animate-pulse' : ''} />
        {!compact && config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color} ${config.bg} ${className}`}
      title={transmittedAt ? `Transmise le ${new Date(transmittedAt).toLocaleString('fr-FR')}` : undefined}
    >
      <Icon size={11} className={status === 'transmitting' || status === 'pending_retry' ? 'animate-pulse' : ''} />
      {status === 'transmitted' ? '✅ E-invoicing' : config.label}
    </span>
  );
}

/**
 * Tooltip détaillé pour le statut PDP
 * À afficher au hover/click sur le badge
 */
export function PdpStatusTooltip({ status, transmissionId, error, transmittedAt }: {
  status?: PdpStatus;
  transmissionId?: string;
  error?: string;
  transmittedAt?: string;
}) {
  if (!status || status === 'not_transmitted') return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-xs space-y-2 text-xs">
      <div className="flex items-center gap-2 font-bold text-sm">
        <PdpStatusBadge status={status} />
      </div>

      {transmissionId && (
        <div className="text-slate-500">
          <span className="font-medium">ID transmission :</span>{' '}
          <span className="font-mono text-[10px]">{transmissionId.slice(0, 16)}...</span>
        </div>
      )}

      {transmittedAt && (
        <div className="text-slate-500">
          <span className="font-medium">Transmise le :</span>{' '}
          {new Date(transmittedAt).toLocaleString('fr-FR')}
        </div>
      )}

      {error && (
        <div className="text-red-500 bg-red-50 p-2 rounded-lg">
          <span className="font-medium">Erreur :</span> {error}
        </div>
      )}

      <div className="text-slate-400 text-[10px] pt-1 border-t">
        Conformément à la loi française 2026 — Format Factur-X (EN 16931)
      </div>
    </div>
  );
}
