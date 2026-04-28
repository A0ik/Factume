'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileEdit, Save, Euro, Clock, MapPin, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createAmendment, computeChanges } from '@/lib/services/contract-amendment-service';
import { AmendmentType, ContractType } from '@/types';
import { useAuthStore } from '@/stores/authStore';

interface ContractAmendmentModalProps {
  contractId: string;
  contractType: ContractType;
  contractData: any;
  onClose: () => void;
  onAmendmentCreated?: (amendmentId: string) => void;
}

const AMENDMENT_OPTIONS: { value: AmendmentType; label: string; icon: any }[] = [
  { value: 'salary_change', label: 'Changement de salaire', icon: Euro },
  { value: 'schedule_change', label: 'Horaires de travail', icon: Clock },
  { value: 'location_change', label: 'Lieu de travail', icon: MapPin },
  { value: 'position_change', label: 'Changement de poste', icon: Briefcase },
  { value: 'other', label: 'Autre modification', icon: FileEdit },
];

export function ContractAmendmentModal({
  contractId,
  contractType,
  contractData,
  onClose,
  onAmendmentCreated,
}: ContractAmendmentModalProps) {
  const { profile } = useAuthStore();
  const [amendmentType, setAmendmentType] = useState<AmendmentType | null>(null);
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic field state based on amendment type
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  const handleTypeSelect = (type: AmendmentType) => {
    setAmendmentType(type);
    // Reset fields
    setDynamicFields({});
    setDescription('');

    // Pre-fill description
    const option = AMENDMENT_OPTIONS.find(o => o.value === type);
    if (option) {
      setDescription(`${option.label} - ${new Date().toLocaleDateString('fr-FR')}`);
    }
  };

  const handleCreate = async () => {
    if (!amendmentType || !effectiveDate || !description.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Compute changes based on type
      const fieldsToTrack: Record<AmendmentType, string[]> = {
        salary_change: ['salary_amount', 'salary_frequency'],
        schedule_change: ['work_schedule', 'working_hours'],
        location_change: ['work_location'],
        position_change: ['job_title', 'contract_classification', 'working_hours'],
        other: [],
      };

      const changes = computeChanges(
        contractData,
        dynamicFields,
        fieldsToTrack[amendmentType] || []
      );

      if (Object.keys(changes).length === 0) {
        toast.error('Aucun changement détecté');
        setLoading(false);
        return;
      }

      const amendment = await createAmendment(
        contractId,
        contractType,
        amendmentType,
        changes,
        effectiveDate,
        description.trim()
      );

      if (amendment) {
        toast.success('Avenant créé avec succès !');
        onAmendmentCreated?.(amendment.id);
        setTimeout(onClose, 1500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de l\'avenant');
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicFields = () => {
    switch (amendmentType) {
      case 'salary_change':
        return (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nouveau salaire (€)</label>
              <input
                type="number"
                value={dynamicFields.salary_amount || ''}
                onChange={(e) => setDynamicFields({ ...dynamicFields, salary_amount: e.target.value })}
                placeholder="Ex: 2500"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </>
        );
      case 'schedule_change':
        return (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Horaires de travail</label>
              <input
                type="text"
                value={dynamicFields.work_schedule || ''}
                onChange={(e) => setDynamicFields({ ...dynamicFields, work_schedule: e.target.value })}
                placeholder="Ex: 39h hebdomadaires"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </>
        );
      case 'location_change':
        return (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lieu de travail</label>
              <input
                type="text"
                value={dynamicFields.work_location || ''}
                onChange={(e) => setDynamicFields({ ...dynamicFields, work_location: e.target.value })}
                placeholder="Nouvelle adresse"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </>
        );
      case 'position_change':
        return (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nouveau poste</label>
              <input
                type="text"
                value={dynamicFields.job_title || ''}
                onChange={(e) => setDynamicFields({ ...dynamicFields, job_title: e.target.value })}
                placeholder="Intitulé du poste"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </>
        );
      case 'other':
        return (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Champ personnalisé</label>
            <input
              type="text"
              value={dynamicFields.custom_field || ''}
              onChange={(e) => setDynamicFields({ ...dynamicFields, custom_field: e.target.value })}
              placeholder="Nom du champ"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
            <input
              type="text"
              value={dynamicFields.custom_value || ''}
              onChange={(e) => setDynamicFields({ ...dynamicFields, custom_value: e.target.value })}
              placeholder="Nouvelle valeur"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>
        );
      default:
        return null;
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
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileEdit className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Créer un avenant</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Modification du contrat</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Amendment type selection */}
            {!amendmentType ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type d'avenant *</label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENDMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleTypeSelect(option.value)}
                      className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 transition-all group text-left"
                    >
                      <option.icon className="w-5 h-5 text-gray-400 group-hover:text-primary mb-1" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Selected type badge */}
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl">
                  <button
                    onClick={() => setAmendmentType(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← Changer
                  </button>
                  <span className="text-sm font-medium text-primary">
                    {AMENDMENT_OPTIONS.find(o => o.value === amendmentType)?.label}
                  </span>
                </div>

                {/* Dynamic fields */}
                {renderDynamicFields()}

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Décrivez la modification..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                  />
                </div>

                {/* Effective date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date d'effet *</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    L'avenant sera créé au statut "brouillon". Vous devrez le générer en PDF et le faire signer par les deux parties avant qu'il soit appliqué au contrat.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {amendmentType && (
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                ) : (
                  <><Save className="w-4 h-4" /> Créer l'avenant</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
