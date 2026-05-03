'use client';

import { useState, useCallback, useEffect } from 'react';
import { Keyboard, X, Power } from 'lucide-react';
import { useGlobalKeyboardShortcuts, formatShortcut, areShortcutsDisabled, setShortcutsDisabled } from '@/hooks/useKeyboardShortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Synchroniser l'état avec localStorage
  const updateDisabledState = useCallback(() => {
    setDisabled(areShortcutsDisabled());
  }, []);

  // Vérifier l'état initial
  useEffect(() => {
    updateDisabledState();
  }, [updateDisabledState]);

  const shortcuts = useGlobalKeyboardShortcuts(!disabled);

  // Raccourci pour ouvrir l'aide (Ctrl+? ou Cmd+?) - fonctionne même si désactivé
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
        description: 'Réactivez-les depuis l\'aide ou les paramètres',
        action: {
          label: 'Annuler',
          onClick: () => {
            setDisabled(false);
            setShortcutsDisabled(false);
          },
        },
      });
    } else {
      toast.success('Raccourcis clavier activés');
    }
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <button
        onClick={() => {
          updateDisabledState();
          setOpen(true);
        }}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors relative"
        aria-label="Raccourcis clavier"
        title={disabled ? "Raccourcis désactivés" : "Raccourcis clavier"}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Keyboard size={20} />
                Raccourcis clavier
              </DialogTitle>
              <button
                onClick={toggleDisabled}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  disabled
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                <Power size={14} />
                {disabled ? 'Désactivés' : 'Activés'}
              </button>
            </div>
          </DialogHeader>

          {disabled && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Les raccourcis clavier sont actuellement désactivés. Cliquez sur le bouton "Activés" ci-dessus pour les réactiver.
              </p>
            </div>
          )}

          <div className="space-y-6 mt-4">
            {/* Navigation */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Navigation</h3>
              <div className="space-y-2">
                {shortcuts.filter(s => s.description.startsWith('Aller')).map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description.replace('Aller aux ', '').replace('Aller au ', '')}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Actions</h3>
              <div className="space-y-2">
                {shortcuts.filter(s => !s.description.startsWith('Aller')).map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">Afficher cette aide</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                  {isMac ? '⌘ ?' : 'Ctrl + ?'}
                </kbd>
              </div>
            </div>

            {/* Info Mac */}
            {isMac && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Sur Mac, utilisez la touche <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">⌥</kbd> (Option) pour les raccourcis de navigation
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
