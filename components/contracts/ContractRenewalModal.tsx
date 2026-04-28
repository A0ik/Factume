'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCw, Calendar, FileText, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { renewContract, getRenewalHistory } from '@/lib/services/contract-renewal-service';
import { ContractRenewal } from '@/types';
import { useAuthStore } from '@/stores/authStore';

interface ContractRenewalModalProps {
  contractId: string;
  contractType: string;
  currentEndDate?: string;
  contractNumber?: string;
  onClose: () => void;
  onRenewed?: (newContractId: string) => void;
}

export function ContractRenewalModal({
  contractId,
  contractType,
  currentEndDate,
  contractNumber,
  onClose,
  onRenewed,
}: ContractRenewalModalProps) {
  const { profile } = useAuthStore();
  const [newEndDate, setNewEndDate] = useState('');
  const [renewalReason, setRenewalReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ContractRenewal[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [contractId]);

  const loadHistory = async () => {
    const renewals = await getRenewalHistory(contractId);
    setHistory(renewals);
  };

  const handleRenew = async () => {
    if (!newEndDate) {
      toast.error('Veuillez sélectionner une nouvelle date de fin');
      return;
    }

    if (currentEndDate && new Date(newEndDate) <= new Date(currentEndDate)) {
      toast.error('La nouvelle date de fin doit être après la date actuelle');
      return;
    }

    if (!renewalReason.trim()) {
      toast.error('Veuillez indiquer la raison du renouvellement');
      return;
    }

    setLoading(true);
    try {
      const result = await renewContract(
        contractId,
        contractType as any,
        newEndDate,
        renewalReason,
        profile
      );

      if (result) {
        toast.success('Contrat renouvelé avec succès !');
        onRenewed?.(result.id);
        setTimeout(onClose, 1500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du renouvellement');
    } finally {
      setLoading(false);
    }
  };

  const minDate = currentEndDate
    ? new Date(new Date(currentEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Renouveler le contrat</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{contractNumber || 'Contrat'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Info current end date */}
            {currentEndDate && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date de fin actuelle : </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(currentEndDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            )}

            {/* New end date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nouvelle date de fin *</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={minDate}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Raison du renouvellement *</label>
              <textarea
                value={renewalReason}
                onChange={(e) => setRenewalReason(e.target.value)}
                rows={3}
                placeholder="Ex: Prolongation pour achèvement de projet, continuation de mission..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
              />
            </div>

            {/* History toggle */}
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                {showHistory ? 'Masquer' : 'Voir'} l'historique ({history.length})
              </button>
            )}

            {/* History */}
            {showHistory && history.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((renewal) => (
                  <div key={renewal.id} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Renouvellement #{renewal.renewal_number}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(renewal.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      {renewal.previous_end_date && (
                        <span>Du {new Date(renewal.previous_end_date).toLocaleDateString('fr-FR')}</span>
                      )}{' '}
                        → {new Date(renewal.new_end_date).toLocaleDateString('fr-FR')}
                    </div>
                    {renewal.renewal_reason && (
                      <p className="mt-1 text-gray-500 text-xs italic">&quot;{renewal.renewal_reason}&quot;</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Le nouveau contrat sera créé avec le numéro <code>{contractNumber || 'CTR'}-R{history.length + 1}</code> et
                devra être signé à nouveau par les deux parties.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleRenew}
              disabled={loading || !newEndDate || !renewalReason.trim()}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Renouvellement...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Renouveler</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
