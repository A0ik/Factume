'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Clipboard, RefreshCw, ShoppingCart, Truck, Banknote, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/haptics';

interface DocumentTypeSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * DocumentTypeSheet — Sélecteur de type de document (Bottom Sheet mobile)
 *
 * Liste TOUS les types de documents gérés par factu.me :
 * Facture, Devis, Avoir, Facture d'acompte, Bon de commande, Bon de livraison
 */
const DOCUMENT_TYPES = [
  {
    type: 'invoice',
    href: '/documents/factures/new',
    icon: FileText,
    label: 'Facture',
    description: 'Facturer un client',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
  {
    type: 'quote',
    href: '/documents/devis/new',
    icon: Clipboard,
    label: 'Devis',
    description: 'Proposer un tarif',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  {
    type: 'credit_note',
    href: '/documents/avoirs/new',
    icon: RefreshCw,
    label: 'Avoir',
    description: 'Émettre un avoir',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/20',
  },
  {
    type: 'deposit',
    href: '/documents/acomptes/new',
    icon: Banknote,
    label: "Facture d'acompte",
    description: 'Demander un acompte',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    ring: 'ring-teal-500/20',
  },
  {
    type: 'purchase_order',
    href: '/documents/commandes/new',
    icon: ShoppingCart,
    label: 'Bon de commande',
    description: 'Commander un fournisseur',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  {
    type: 'delivery_note',
    href: '/documents/livraisons/new',
    icon: Truck,
    label: 'Bon de livraison',
    description: 'Accuser réception',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    ring: 'ring-cyan-500/20',
  },
];

export default function DocumentTypeSheet({ open, onClose }: DocumentTypeSheetProps) {
  const router = useRouter();

  const handleSelect = (href: string) => {
    triggerHaptic('medium');
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-0 right-0 bottom-0 bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-hidden"
            style={{
              paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles size={17} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Nouveau document</h3>
                  <p className="text-xs text-muted-foreground">Choisissez le type de document</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document types grid */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_TYPES.map(({ type, href, icon: Icon, label, description, color, bg, ring }) => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(href)}
                    className={`group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-emerald-500/30 active:bg-gray-200 dark:active:bg-gray-700/50 transition-all ring-1 ring-transparent hover:${ring}`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon size={20} className={color} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
