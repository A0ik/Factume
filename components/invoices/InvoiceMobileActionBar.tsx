'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, MoreHorizontal, Eye, Download, Send, CreditCard, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface InvoiceMobileActionBarProps {
  onSave: () => void;
  saving?: boolean;
  /** Whether the invoice already exists (edit mode) or is new */
  isEdit?: boolean;
  onPreview?: () => void;
  onDownloadPdf?: () => void;
  onSendEmail?: () => void;
  onCreatePaymentLink?: () => void;
}

/**
 * InvoiceMobileActionBar — Floating action bar pour mobile
 *
 * Fixée en bas de l'écran, au-dessus de la BottomTabBar.
 * Visible uniquement sur mobile (lg:hidden).
 *
 * - Bouton principal "Sauvegarder" / "Créer"
 * - Bouton "..." → BottomSheet avec actions secondaires
 */
export default function InvoiceMobileActionBar({
  onSave,
  saving = false,
  isEdit = false,
  onPreview,
  onDownloadPdf,
  onSendEmail,
  onCreatePaymentLink,
}: InvoiceMobileActionBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  const secondaryActions = [
    {
      icon: Eye,
      label: 'Prévisualiser',
      onClick: onPreview ?? (() => {}),
      description: 'Voir l\'aperçu du document',
    },
    {
      icon: Download,
      label: 'Télécharger PDF',
      onClick: onDownloadPdf ?? (() => {}),
      description: 'Exporter en PDF',
    },
    {
      icon: Send,
      label: 'Envoyer par email',
      onClick: onSendEmail ?? (() => {}),
      description: 'Envoyer au client',
    },
    {
      icon: CreditCard,
      label: 'Lien de paiement',
      onClick: onCreatePaymentLink ?? (() => {}),
      description: 'Créer un lien Stripe',
    },
  ];

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-40 lg:hidden">
        <div
          className="bg-background/90 backdrop-blur-2xl border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 max-w-lg mx-auto">
            {/* Main action: Save / Create */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                triggerHaptic('medium');
                onSave();
              }}
              disabled={saving}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-lg',
                'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
                'hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/25',
                saving && 'opacity-70 cursor-not-allowed',
              )}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isEdit ? 'Enregistrement...' : 'Création...'}</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isEdit ? 'Enregistrer' : 'Créer la facture'}</span>
                </>
              )}
            </motion.button>

            {/* Secondary actions trigger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                triggerHaptic('light');
                setShowMenu(true);
              }}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex-shrink-0"
              aria-label="Plus d'actions"
            >
              <MoreHorizontal size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom Sheet for secondary actions */}
      <AnimatePresence>
        {showMenu && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMenu(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 right-0 bottom-0 bg-card rounded-t-3xl border-t border-border shadow-2xl"
              style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>

              {/* Header */}
              <div className="px-5 pb-3 pt-2">
                <h3 className="text-base font-bold text-foreground">Actions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Actions supplémentaires pour ce document</p>
              </div>

              {/* Actions list */}
              <div className="px-3 pb-4 space-y-1">
                {secondaryActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        triggerHaptic('light');
                        setShowMenu(false);
                        action.onClick();
                      }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-muted active:bg-secondary transition-colors text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted flex-shrink-0">
                        <ActionIcon size={18} className="text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cancel */}
              <div className="px-5 pb-2">
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
