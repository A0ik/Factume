'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileEdit, Calendar, Download, Eye } from 'lucide-react';
import { getAmendments } from '@/lib/services/contract-amendment-service';
import { ContractAmendment, AmendmentType } from '@/types';
import Link from 'next/link';

interface ContractAmendmentListProps {
  contractId: string;
}

const AMENDMENT_LABELS: Record<AmendmentType, string> = {
  salary_change: 'Salaire',
  schedule_change: 'Horaires',
  location_change: 'Lieu',
  position_change: 'Poste',
  other: 'Autre',
};

export function ContractAmendmentList({ contractId }: ContractAmendmentListProps) {
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAmendments();
  }, [contractId]);

  const loadAmendments = async () => {
    setLoading(true);
    try {
      const data = await getAmendments(contractId);
      setAmendments(data);
    } catch (err) {
      console.error('Erreur lors du chargement des avenants:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Chargement...</div>;
  }

  if (amendments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Avenants</h3>
      {amendments.map((amendment) => (
        <div key={amendment.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-gray-500">{amendment.amendment_number}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  {AMENDMENT_LABELS[amendment.amendment_type]}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {amendment.document_status}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{amendment.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Effet: {new Date(amendment.effective_date).toLocaleDateString('fr-FR')}
                </div>
                <div>
                  {new Date(amendment.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/contracts/amendments/${amendment.id}`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Voir les détails"
              >
                <Eye className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
