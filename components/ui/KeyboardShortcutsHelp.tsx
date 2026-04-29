'use client';

import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useGlobalKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const shortcuts = useGlobalKeyboardShortcuts();

  // Raccourci pour ouvrir l'aide
  useGlobalKeyboardShortcuts();

  // Ajouter le raccourci pour ouvrir l'aide
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        aria-label="Raccourcis clavier"
      >
        <Keyboard size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard size={20} />
              Raccourcis clavier
            </DialogTitle>
          </DialogHeader>

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
                  Ctrl + ?
                </kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
