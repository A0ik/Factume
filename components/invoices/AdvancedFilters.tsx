'use client';

import { useState } from 'react';
import { Filter, X, Calendar, DollarSign, Building2, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomSheet from '@/components/layout/BottomSheet';

export interface InvoiceFilters {
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  clientIds?: string[];
  statuses?: string[];
  searchQuery?: string;
}

interface AdvancedFiltersProps {
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
  clients: Array<{ id: string; name: string }>;
  onReset: () => void;
}

export function AdvancedFilters({ filters, onFiltersChange, clients, onReset }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof InvoiceFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.keys(filters).some(
    key => filters[key as keyof InvoiceFilters] !== undefined &&
          (Array.isArray(filters[key as keyof InvoiceFilters])
            ? (filters[key as keyof InvoiceFilters] as any[]).length > 0
            : true)
  );

  const statusOptions = [
    { value: 'draft', label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
    { value: 'sent', label: 'Envoyée', color: 'bg-blue-100 text-blue-700' },
    { value: 'paid', label: 'Payée', color: 'bg-green-100 text-green-700' },
    { value: 'overdue', label: 'En retard', color: 'bg-red-100 text-red-700' },
  ];

  // VULCAIN (CIBLE 3c) — contenu partagé entre le panneau desktop et le
  // BottomSheet mobile. Une seule source de vérité, deux coques responsives.
  const filtersContent = (
    <>
      {/* Date range */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar size={16} className="text-gray-400" />
          Période
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Du</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Au</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Amount range */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <DollarSign size={16} className="text-gray-400" />
          Montant (€)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Minimum</label>
            <input
              type="number"
              value={filters.amountMin || ''}
              onChange={(e) => updateFilter('amountMin', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Maximum</label>
            <input
              type="number"
              value={filters.amountMax || ''}
              onChange={(e) => updateFilter('amountMax', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="∞"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Clients */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Building2 size={16} className="text-gray-400" />
          Clients
        </label>
        <div className="flex flex-wrap gap-2">
          {clients.slice(0, 10).map((client) => (
            <button
              key={client.id}
              onClick={() => {
                const current = filters.clientIds || [];
                const updated = current.includes(client.id)
                  ? current.filter(id => id !== client.id)
                  : [...current, client.id];
                updateFilter('clientIds', updated.length > 0 ? updated : undefined);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (filters.clientIds || []).includes(client.id)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              {client.name}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FileText size={16} className="text-gray-400" />
          Statut
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={() => {
                const current = filters.statuses || [];
                const updated = current.includes(status.value)
                  ? current.filter(s => s !== status.value)
                  : [...current, status.value];
                updateFilter('statuses', updated.length > 0 ? updated : undefined);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (filters.statuses || []).includes(status.value)
                  ? status.color
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          Appliquer
        </button>
      </div>
    </>
  );

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
          hasActiveFilters
            ? 'bg-primary text-white shadow-lg shadow-primary/30'
            : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-primary/50'
        }`}
      >
        <Filter size={16} />
        Filtres avancés
        {hasActiveFilters && (
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
            {Object.keys(filters).filter(key =>
              filters[key as keyof InvoiceFilters] !== undefined &&
              (Array.isArray(filters[key as keyof InvoiceFilters])
                ? (filters[key as keyof InvoiceFilters] as any[]).length > 0
                : true)
            ).length}
          </span>
        )}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 hidden md:block"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter size={18} className="text-primary" />
                  Filtres avancés
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {filtersContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet — BottomSheet est lg:hidden en interne,
          donc invisible sur desktop où le panneau ci-dessus prend le relais. */}
      <BottomSheet open={isOpen} onClose={() => setIsOpen(false)} title="Filtres avancés">
        <div className="space-y-6 pb-6">{filtersContent}</div>
      </BottomSheet>
    </div>
  );
}
