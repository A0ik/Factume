'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Calendar, Clock, FileText, ExternalLink } from 'lucide-react';
import { getRenewalHistory, getRenewedChain } from '@/lib/services/contract-renewal-service';
import { ContractRenewal } from '@/types';
import Link from 'next/link';

interface ContractRenewalHistoryProps {
  contractId: string;
  onClose: () => void;
}

export function ContractRenewalHistory({ contractId, onClose }: ContractRenewalHistoryProps) {
  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);
  const [chain, setChain] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [contractId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, chainData] = await Promise.all([
        getRenewalHistory(contractId),
        getRenewedChain(contractId),
      ]);
      setRenewals(historyData);
      setChain(chainData);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
    } finally {
      setLoading(false);
    }
  };

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
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-white/10 overflow-hidden max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Historique des renouvellements</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{chain.length + renewals.length} renouvellement(s)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : renewals.length === 0 && chain.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">Aucun renouvellement</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline */}
                <div className="relative">
                  {/* Vertical line */}
                  {(chain.length > 0 || renewals.length > 0) && (
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}

                  {/* Original contract marker */}
                  <div className="flex items-start gap-4 mb-6 relative">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center z-10 border-4 border-white dark:border-slate-900">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="font-medium text-gray-900 dark:text-white">Contrat original</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Point de départ</p>
                    </div>
                  </div>

                  {/* Renewals */}
                  {chain.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-4 mb-6 relative">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center z-10 border-4 border-white dark:border-slate-900">
                        <RefreshCw className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Renouvellement #{item.renewal_number}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(item.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Link
                            href={`/contracts/${item.renewed_contract_id}?type=${item.contract_type}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            title="Voir le contrat"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            Du {new Date(item.contract?.contract_end_date || item.contract?.end_date || '-').toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {item.contract && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              {item.contract.document_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
