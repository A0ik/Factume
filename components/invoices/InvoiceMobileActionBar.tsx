'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, MoreHorizontal, Loader2, CreditCard, Send, Eye, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

export interface MobileAction {
  icon: any;
  label: string;
  onClick: () => void;
  description?: string;
  variant?: 'default' | 'danger' | 'primary';
}

interface MobileActionBarProps {
  /** 'save' = save/create button + secondary actions. 'custom' = fully custom actions */
  mode?: 'save' | 'custom';
  // Save mode props
  onSave?: () => void;
  saving?: boolean;
  isEdit?: boolean;
  // Payment link
  onPaymentLink?: () => void;
  // Custom mode props
  mainAction?: MobileAction;
  // Shared props
  actions?: MobileAction[];
}

/**
 * MobileActionBar — Barre d'actions flottante mobile, premium
 *
 * Layout mobile :
 * [💾 Créer la facture] [💳 Lien paiement] [⋯]
 *
 * Le bouton "Lien de paiement" est VISIBLE et accessible directement,
 * pas caché dans un menu "...".
 *
 * Fixée au-dessus de la BottomTabBar (bottom-20), visible uniquement mobile.
 */
export default function MobileActionBar({
  mode = 'save',
  onSave,
  saving = false,
  isEdit = false,
  onPaymentLink,
  mainAction,
  actions = [],
}: MobileActionBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  // In save mode, build default secondary actions
  const menuActions = actions;

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-20 left-0 right-0 z-40 lg:hidden">
        <div
          className="bg-background/90 backdrop-blur-2xl border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 max-w-lg mx-auto">
            {/* Main action button */}
            {mode === 'save' ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('medium');
                  onSave?.();
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
                    <span>{isEdit ? 'Enregistrer' : 'Créer'}</span>
                  </>
                )}
              </motion.button>
            ) : mainAction ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('medium');
                  mainAction.onClick();
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-lg',
                  mainAction.variant === 'danger'
                    ? 'bg-red-500 text-white shadow-red-500/25'
                    : mainAction.variant === 'primary'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/25',
                )}
              >
                <mainAction.icon size={16} />
                <span>{mainAction.label}</span>
              </motion.button>
            ) : null}

            {/* Payment Link button — VISIBLE d'un coup d'œil */}
            {onPaymentLink && mode === 'save' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  triggerHaptic('medium');
                  onPaymentLink();
                }}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 flex-shrink-0 active:shadow-emerald-500/40 transition-all"
                aria-label="Lien de paiement"
                title="Générer un lien de paiement Stripe/Sumup"
              >
                <CreditCard size={20} />
              </motion.button>
            )}

            {/* Secondary actions trigger — only if there are extra actions */}
            {menuActions.length > 0 && (
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
            )}
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
                <p className="text-xs text-muted-foreground mt-0.5">Actions supplémentaires</p>
              </div>

              {/* Actions list */}
              <div className="px-3 pb-4 space-y-1 max-h-[50vh] overflow-y-auto">
                {menuActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        triggerHaptic('light');
                        setShowMenu(false);
                        action.onClick();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-muted active:bg-secondary transition-colors text-left',
                        action.variant === 'danger' && 'hover:bg-red-50 dark:hover:bg-red-500/10',
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl bg-muted flex-shrink-0',
                        action.variant === 'danger' && 'bg-red-100 dark:bg-red-500/10',
                      )}>
                        <ActionIcon size={18} className={cn(
                          'text-foreground',
                          action.variant === 'danger' && 'text-red-500',
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          'text-sm font-semibold text-foreground',
                          action.variant === 'danger' && 'text-red-600 dark:text-red-400',
                        )}>{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        )}
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
