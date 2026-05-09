// ---------------------------------------------------------------------------
// Keyboard Shortcuts System
// Provides comprehensive keyboard shortcut support for the application
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyboardShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: (event: KeyboardEvent) => void;
  scope?: 'global' | 'input' | 'modal';
  preventDefault?: boolean;
}

export interface KeyboardShortcutOptions {
  disabled?: boolean;
  scope?: 'global' | 'input' | 'modal';
}

// ---------------------------------------------------------------------------
// Hook: useKeyboardShortcuts
// ---------------------------------------------------------------------------

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcutConfig[],
  options: KeyboardShortcutOptions = {}
) {
  const { disabled = false, scope = 'global' } = options;

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.contentEditable === 'true';

      // Check if we're in an input field
      if (isInputField && scope !== 'input') {
        return; // Don't trigger shortcuts when typing
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.scope && shortcut.scope !== scope) {
          continue; // Skip if scope doesn't match
        }

        // Check key combination
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                           event.code.toLowerCase() === shortcut.key.toLowerCase();

        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          shortcut.action(event);
          break; // Only execute first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, disabled, scope]);
}

// ---------------------------------------------------------------------------
// Hook: useKeyboardShortcut (single shortcut)
// ---------------------------------------------------------------------------

export function useKeyboardShortcut(
  shortcut: Omit<KeyboardShortcutConfig, 'description'>,
  options: KeyboardShortcutOptions = {}
) {
  useKeyboardShortcuts([{
    ...shortcut,
    description: '', // Not needed for single shortcut
  }], options);
}

// ---------------------------------------------------------------------------
// Helper: Format shortcut for display
// ---------------------------------------------------------------------------

export function formatShortcut(shortcut: KeyboardShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');

  const key = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);

  parts.push(key);

  return parts.join('+');
}

// ---------------------------------------------------------------------------
// OCR Page Shortcuts
// ---------------------------------------------------------------------------

export const OCR_SHORTCUTS: KeyboardShortcutConfig[] = [
  {
    key: 'Enter',
    description: 'Valider la dépense',
    scope: 'modal',
    action: () => {
      // This will be connected to the verify function
      const verifyButton = document.querySelector('[data-action="verify-expense"]') as HTMLButtonElement;
      if (verifyButton && !verifyButton.disabled) {
        verifyButton.click();
      }
    },
  },
  {
    key: 'e',
    description: 'Éditer la dépense',
    scope: 'modal',
    action: () => {
      const editButton = document.querySelector('[data-action="edit-expense"]') as HTMLButtonElement;
      if (editButton && !editButton.disabled) {
        editButton.click();
      }
    },
  },
  {
    key: 'Escape',
    description: 'Fermer le panneau',
    scope: 'modal',
    action: () => {
      const closeButton = document.querySelector('[data-action="close-panel"]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    },
  },
  {
    key: 'ArrowRight',
    description: 'Dépense suivante',
    scope: 'modal',
    action: () => {
      const nextButton = document.querySelector('[data-action="next-expense"]') as HTMLButtonElement;
      if (nextButton && !nextButton.disabled) {
        nextButton.click();
      }
    },
  },
  {
    key: 'ArrowLeft',
    description: 'Dépense précédente',
    scope: 'modal',
    action: () => {
      const prevButton = document.querySelector('[data-action="prev-expense"]') as HTMLButtonElement;
      if (prevButton && !prevButton.disabled) {
        prevButton.click();
      }
    },
  },
  {
    key: 'a',
    ctrlKey: true,
    description: 'Tout sélectionner',
    action: () => {
      const selectAllButton = document.querySelector('[data-action="select-all"]') as HTMLButtonElement;
      if (selectAllButton && !selectAllButton.disabled) {
        selectAllButton.click();
      }
    },
  },
  {
    key: 'Delete',
    description: 'Supprimer la dépense',
    scope: 'modal',
    action: () => {
      const deleteButton = document.querySelector('[data-action="delete-expense"]') as HTMLButtonElement;
      if (deleteButton && !deleteButton.disabled) {
        deleteButton.click();
      }
    },
  },
  {
    key: 's',
    ctrlKey: true,
    description: 'Scanner les fichiers',
    action: () => {
      const scanButton = document.querySelector('[data-action="scan-files"]') as HTMLButtonElement;
      if (scanButton && !scanButton.disabled) {
        scanButton.click();
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Expense Edit Shortcuts
// ---------------------------------------------------------------------------

export const EXPENSE_EDIT_SHORTCUTS: KeyboardShortcutConfig[] = [
  {
    key: 'Enter',
    ctrlKey: true,
    description: 'Sauvegarder les modifications',
    scope: 'input',
    action: () => {
      const saveButton = document.querySelector('[data-action="save-expense"]') as HTMLButtonElement;
      if (saveButton && !saveButton.disabled) {
        saveButton.click();
      }
    },
  },
  {
    key: 'Escape',
    description: 'Annuler les modifications',
    scope: 'input',
    action: () => {
      const cancelButton = document.querySelector('[data-action="cancel-edit"]') as HTMLButtonElement;
      if (cancelButton) {
        cancelButton.click();
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Global Shortcuts
// ---------------------------------------------------------------------------

export const GLOBAL_SHORTCUTS: KeyboardShortcutConfig[] = [
  {
    key: 'k',
    metaKey: true,
    description: 'Focus barre de recherche',
    action: () => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="rechercher" i]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
  },
  {
    key: 'n',
    ctrlKey: true,
    description: 'Nouvelle dépense',
    action: () => {
      window.location.href = '/ocr';
    },
  },
];

// ---------------------------------------------------------------------------
// Helper: Get all shortcuts for display
// ---------------------------------------------------------------------------

export function getAllShortcutDescriptions(): Array<{
  shortcut: string;
  description: string;
  scope: string;
}> {
  const allShortcuts = [...OCR_SHORTCUTS, ...EXPENSE_EDIT_SHORTCUTS, ...GLOBAL_SHORTCUTS];

  return allShortcuts.map(shortcut => ({
    shortcut: formatShortcut(shortcut),
    description: shortcut.description,
    scope: shortcut.scope || 'global',
  }));
}
