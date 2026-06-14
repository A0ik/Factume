'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Building2, Calendar, User, Euro, Trash2, Eye, FileEdit, Copy, Send, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { ContractSummary, ContractType } from '@/types';
import { ContractStatusBadge, ContractTypeBadge } from './ContractStatusBadge';
import Link from 'next/link';

interface Props {
  contract: ContractSummary;
  onDelete?: (id: string, type: ContractType) => void;
  onDuplicate?: (id: string, type: ContractType) => void;
}

export function ContractCard({ contract, onDelete, onDuplicate }: Props) {
  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  // Check if there's an active signing request
  const expiresAt = contract.signing_token_expires_at;
  const hasActiveSigning = expiresAt ? new Date(expiresAt) > new Date() : false;
  const signingExpires = hasActiveSigning && expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

  // FIXER (AUDIT) — suivi de l'échéance du contrat (CDD arrivant à expiration).
  // Rend visible une donnée qui n'était qu'au niveau data-layer (cron d'expiration).
  const liveStatuses = ['active', 'signed', 'pending_signature'];
  const endDaysLeft = contract.end_date
    ? Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / 86400000)
    : null;
  const isEndingSoon = endDaysLeft !== null && endDaysLeft >= 0 && endDaysLeft <= 30 && liveStatuses.includes(contract.status);
  const isExpired = endDaysLeft !== null && endDaysLeft < 0 && (contract.status === 'active' || contract.status === 'signed');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm hover:shadow-md transition-all p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <ContractTypeBadge type={contract.contract_type} />
          {contract.contract_type === 'other' && contract.contract_category && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">{contract.contract_category}</span>
          )}
          <ContractStatusBadge status={contract.status} />
          {hasActiveSigning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Send className="w-3 h-3" />
              Signature envoyée
            </span>
          )}
          {(contract.renewal_count || 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <RefreshCw className="w-3 h-3" />
              R{(contract.renewal_count || 0)}
            </span>
          )}
          {isEndingSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock className="w-3 h-3" />
              {endDaysLeft === 0 ? "Expire aujourd'hui" : `Expire dans ${endDaysLeft} j`}
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3" />
              Échéance dépassée
            </span>
          )}
        </div>
        {contract.contract_number && (
          <span className="text-xs text-gray-500 font-mono">{contract.contract_number}</span>
        )}
      </div>

      {/* Signing status indicator */}
      {hasActiveSigning && (
        <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">En attente de signature</span>
            <span className="text-blue-600 dark:text-blue-400">• Expire le {signingExpires}</span>
          </div>
          {contract.signing_view_count && contract.signing_view_count > 0 && (
            <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Vu {contract.signing_view_count} fois
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{contract.employee_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="w-4 h-4" />
          <span>{contract.company_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FileText className="w-4 h-4" />
          <span>{contract.job_title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{fmtDate(contract.start_date)}{contract.end_date ? ` → ${fmtDate(contract.end_date)}` : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
            <Euro className="w-4 h-4 text-primary" />
            {fmtMoney(contract.salary_amount)}{contract.salary_frequency === 'hourly' ? '/h' : contract.salary_frequency === 'monthly' ? '/mois' : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
        <Link href={`/contracts/${contract.id}?type=${contract.contract_type}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors">
          <Eye className="w-4 h-4" />Voir
        </Link>
        <Link href={`/contracts/${contract.id}/edit?type=${contract.contract_type}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          <FileEdit className="w-4 h-4" />Éditer
        </Link>
        {onDuplicate && (
          <button onClick={() => onDuplicate(contract.id, contract.contract_type)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Dupliquer" aria-label={`Dupliquer le contrat de ${contract.employee_name}`}>
            <Copy className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(contract.id, contract.contract_type)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Supprimer" aria-label={`Supprimer le contrat de ${contract.employee_name}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
