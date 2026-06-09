'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, FileCheck, ShoppingBag, Truck, Percent, RotateCcw } from 'lucide-react';

const DOC_TYPES = [
  {
    id: 'invoice',
    label: 'Facture',
    description: 'Facture client standard',
    icon: Receipt,
    gradient: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-500/20',
    path: '/documents/factures/new',
  },
  {
    id: 'quote',
    label: 'Devis',
    description: 'Estimatif avant commande',
    icon: FileCheck,
    gradient: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-500/20',
    path: '/documents/devis/new',
  },
  {
    id: 'purchase_order',
    label: 'Bon de commande',
    description: 'Confirmation d\'achat',
    icon: ShoppingBag,
    gradient: 'from-orange-500 to-orange-600',
    glow: 'shadow-orange-500/20',
    path: '/documents/commandes/new',
  },
  {
    id: 'delivery_note',
    label: 'Bon de livraison',
    description: 'Suivi d\'expédition',
    icon: Truck,
    gradient: 'from-indigo-500 to-indigo-600',
    glow: 'shadow-indigo-500/20',
    path: '/documents/livraisons/new',
  },
  {
    id: 'deposit',
    label: 'Acompte',
    description: 'Facture d\'acompte',
    icon: Percent,
    gradient: 'from-teal-500 to-teal-600',
    glow: 'shadow-teal-500/20',
    path: '/documents/acomptes/new',
  },
  {
    id: 'credit_note',
    label: 'Avoir',
    description: 'Note de crédit',
    icon: RotateCcw,
    gradient: 'from-rose-500 to-rose-600',
    glow: 'shadow-rose-500/20',
    path: '/documents/avoirs/new',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export default function DocPickerModal({ open, onClose, clientId, clientName }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSelect = (path: string) => {
    const params = new URLSearchParams({ clientId }); // CITADEL: removed clientName from URL (PII leak in logs/history)
    router.push(`${path}?${params.toString()}`);
    onClose();
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — stopPropagation prevents React portal events from bubbling to parent <Link> */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Créer un document</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Pour <span className="font-semibold text-gray-700 dark:text-gray-200">{clientName}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-6 pb-6">
              {DOC_TYPES.map((doc, i) => {
                const Icon = doc.icon;
                return (
                  <motion.button
                    key={doc.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(doc.path)}
                    className={`relative group flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${doc.gradient} shadow-lg ${doc.glow} hover:shadow-xl transition-all text-white overflow-hidden`}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon size={22} />
                    </div>
                    <div className="text-center relative">
                      <p className="text-sm font-bold leading-tight">{doc.label}</p>
                      <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{doc.description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
