'use client';

import { useState, useCallback, useEffect } from 'react';
import { Keyboard, X, Power, Command, Search } from 'lucide-react';
import { useGlobalKeyboardShortcuts, formatShortcut, areShortcutsDisabled, setShortcutsDisabled } from '@/hooks/useKeyboardShortcuts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center min-w-7 h-7 px-2',
      'text-xs font-semibold rounded-lg',
      'bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600',
      'text-gray-700 dark:text-gray-200',
      'shadow-[0_1px_0_1px_rgba(0,0,0,0.08)] dark:shadow-none',
    )}>
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const updateDisabledState = useCallback(() => {
    setDisabled(areShortcutsDisabled());
  }, []);

  useEffect(() => { updateDisabledState(); }, [updateDisabledState]);

  const shortcuts = useGlobalKeyboardShortcuts(!disabled);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '?') {
      e.preventDefault();
      e.stopPropagation();
      setOpen((prev) => {
        if (!prev) updateDisabledState();
        return !prev;
      });
    }
  }, [updateDisabledState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  const toggleDisabled = () => {
    const newState = !disabled;
    setDisabled(newState);
    setShortcutsDisabled(newState);
    if (newState) {
      toast.success('Raccourcis clavier désactivés', {
        description: "Réactivez-les depuis l'aide ou les paramètres",
        action: {
          label: 'Annuler',
          onClick: () => { setDisabled(false); setShortcutsDisabled(false); },
        },
      });
    } else {
      toast.success('Raccourcis clavier activés');
    }
  };

  const navShortcuts = shortcuts.filter(s => s.description.startsWith('Aller'));
  const actionShortcuts = shortcuts.filter(s => !s.description.startsWith('Aller'));

  return (
    <>
      <button
        onClick={() => { updateDisabledState(); setOpen(true); }}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors relative"
        aria-label="Raccourcis clavier"
        title={disabled ? 'Raccourcis désactivés' : 'Raccourcis clavier'}
      >
        <Keyboard size={18} />
        {disabled && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="Désactivé" />
        )}
      </button>

      <Dialog open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (newOpen) updateDisabledState();
      }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Keyboard size={16} className="text-primary" />
              </div>
              Raccourcis clavier
            </DialogTitle>
            <DialogDescription>
              Gagnez du temps avec ces raccourcis
            </DialogDescription>
          </DialogHeader>

          {/* Toggle */}
          <div className="px-6 pt-2">
            <button
              onClick={toggleDisabled}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all w-fit',
                disabled
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
              )}
            >
              <Power size={14} />
              {disabled ? 'Désactivés' : 'Activés'}
            </button>

            {disabled && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Les raccourcis clavier sont désactivés. Cliquez sur le bouton ci-dessus pour les réactiver.
                </p>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">
            {/* Navigation */}
            {navShortcuts.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Command size={12} /> Navigation
                </h3>
                <div className="space-y-1.5">
                  {navShortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description.replace('Aller aux ', '').replace('Aller au ', '')}
                      </span>
                      <ShortcutKey>{formatShortcut(shortcut)}</ShortcutKey>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {actionShortcuts.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Search size={12} /> Actions
                </h3>
                <div className="space-y-1.5">
                  {actionShortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                      <ShortcutKey>{formatShortcut(shortcut)}</ShortcutKey>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help shortcut */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-primary/5 dark:bg-primary/10">
                <span className="text-sm text-gray-700 dark:text-gray-300">Afficher cette aide</span>
                <ShortcutKey>{isMac ? '⌘ ?' : 'Ctrl + ?'}</ShortcutKey>
              </div>
            </div>

            {/* Mac info */}
            {isMac && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Sur Mac, utilisez la touche <ShortcutKey>⌥</ShortcutKey> (Option) pour les raccourcis de navigation
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
