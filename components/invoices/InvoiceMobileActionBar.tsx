'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  MoreHorizontal,
  Loader2,
  CreditCard,
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
  /**
   * NEW (Loi 2 -- Max 3 Actions):
   * Up to 3 primary actions displayed directly as equal-width buttons.
   * Each button has icon + short label. Always visible, never hidden in a menu.
   */
  primaryActions?: MobileAction[];

  /**
   * Secondary actions hidden behind a "Plus" bottom sheet.
   * Only shown when user taps the "Plus" button.
   */
  secondaryActions?: MobileAction[];

  // ─── Legacy props (backward compatible) ───
  mode?: 'save' | 'custom';
  onSave?: () => void;
  saving?: boolean;
  isEdit?: boolean;
  onPaymentLink?: () => void;
  mainAction?: MobileAction;
  actions?: MobileAction[];
}

const tapSpring = { type: 'spring' as const, stiffness: 400, damping: 17 };

/**
 * MobileActionBar -- 2026 Floating Action Bar
 *
 * Loi 1 (Zone Verte): Fixed at bottom, above tab bar -- always in thumb zone.
 * Loi 2 (Max 3 Actions): Primary actions visible directly, no menu needed.
 *
 * Layout with primaryActions:
 * ┌──────────────────────────────────────────────────┐
 * │  [Icon] Apercu  │  [Icon] Envoyer  │  [Icon] Payer  │  [+]  │
 * └──────────────────────────────────────────────────┘
 *
 * Legacy layout (mode='save'|'custom'):
 * ┌──────────────────────────────────────────────────┐
 * │  [   Main Action Button   ]  [$$]  [+]           │
 * └──────────────────────────────────────────────────┘
 */
export default function MobileActionBar({
  primaryActions,
  secondaryActions,
  // Legacy
  mode = 'save',
  onSave,
  saving = false,
  isEdit = false,
  onPaymentLink,
  mainAction,
  actions = [],
}: MobileActionBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  // ─── NEW: Primary Actions Layout (Loi 2) ───
  if (primaryActions && primaryActions.length > 0) {
    const menuActions = secondaryActions || [];

    return (
      <>
        <div className="fixed bottom-[68px] left-0 right-0 z-40 lg:hidden">
          <div
            className="bg-background/90 backdrop-blur-2xl border-t border-border"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="flex items-stretch gap-1.5 px-3 py-2 max-w-lg mx-auto">
              {/* Primary action buttons -- equal width, icon + label */}
              {primaryActions.map((action) => {
                const ActionIcon = action.icon;
                const isPrimary = action.variant === 'primary';
                return (
                  <motion.button
                    key={action.label}
                    whileTap={{ scale: 0.93 }}
                    transition={tapSpring}
                    onClick={() => {
                      triggerHaptic('medium');
                      action.onClick();
                    }}
                    className={cn(
                      'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all',
                      isPrimary
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 active:bg-gray-200 dark:active:bg-slate-700',
                    )}
                  >
                    <ActionIcon size={18} strokeWidth={isPrimary ? 2.2 : 2} />
                    <span className="leading-none">{action.label}</span>
                  </motion.button>
                );
              })}

              {/* "Plus" button for secondary actions */}
              {menuActions.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  transition={tapSpring}
                  onClick={() => {
                    triggerHaptic('light');
                    setShowMenu(true);
                  }}
                  className="flex items-center justify-center w-12 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Plus d'actions"
                >
                  <MoreHorizontal size={20} />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Actions Bottom Sheet */}
        <AnimatePresence>
          {showMenu && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute left-0 right-0 bottom-0 bg-card rounded-t-3xl border-t border-border shadow-2xl"
                style={{
                  paddingBottom:
                    'max(2rem, env(safe-area-inset-bottom, 2rem))',
                }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                </div>
                <div className="px-5 pb-3 pt-2">
                  <h3 className="text-base font-bold text-foreground">
                    Actions
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Actions supplementaires
                  </p>
                </div>
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
                          'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl active:bg-muted transition-colors text-left',
                          action.variant === 'danger' &&
                            'active:bg-red-50 dark:active:bg-red-500/10',
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center w-10 h-10 rounded-xl bg-muted flex-shrink-0',
                            action.variant === 'danger' &&
                              'bg-red-100 dark:bg-red-500/10',
                          )}
                        >
                          <ActionIcon
                            size={18}
                            className={cn(
                              'text-foreground',
                              action.variant === 'danger' && 'text-red-500',
                            )}
                          />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'text-sm font-semibold text-foreground',
                              action.variant === 'danger' &&
                                'text-red-600 dark:text-red-400',
                            )}
                          >
                            {action.label}
                          </p>
                          {action.description && (
                            <p className="text-xs text-muted-foreground">
                              {action.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
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

  // ─── LEGACY: Mode-based Layout (backward compatible) ───
  const menuActions = actions;

  return (
    <>
      <div className="fixed bottom-[68px] left-0 right-0 z-40 lg:hidden">
        <div
          className="bg-background/90 backdrop-blur-2xl border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 max-w-lg mx-auto">
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
                    <span>{isEdit ? 'Enregistrement...' : 'Creation...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEdit ? 'Enregistrer' : 'Creer'}</span>
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

            {onPaymentLink && mode === 'save' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={tapSpring}
                onClick={() => {
                  triggerHaptic('medium');
                  onPaymentLink();
                }}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 flex-shrink-0 active:shadow-emerald-500/40 transition-all"
                aria-label="Lien de paiement"
                title="Generer un lien de paiement"
              >
                <CreditCard size={20} />
              </motion.button>
            )}

            {menuActions.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={tapSpring}
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

      <AnimatePresence>
        {showMenu && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 right-0 bottom-0 bg-card rounded-t-3xl border-t border-border shadow-2xl"
              style={{
                paddingBottom:
                  'max(2rem, env(safe-area-inset-bottom, 2rem))',
              }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="px-5 pb-3 pt-2">
                <h3 className="text-base font-bold text-foreground">Actions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actions supplementaires
                </p>
              </div>
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
                        'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl active:bg-muted transition-colors text-left',
                        action.variant === 'danger' &&
                          'active:bg-red-50 dark:active:bg-red-500/10',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-xl bg-muted flex-shrink-0',
                          action.variant === 'danger' &&
                            'bg-red-100 dark:bg-red-500/10',
                        )}
                      >
                        <ActionIcon
                          size={18}
                          className={cn(
                            'text-foreground',
                            action.variant === 'danger' && 'text-red-500',
                          )}
                        />
                      </div>
                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold text-foreground',
                            action.variant === 'danger' &&
                              'text-red-600 dark:text-red-400',
                          )}
                        >
                          {action.label}
                        </p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
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
