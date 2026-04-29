'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined || e.altKey === shortcut.altKey;
        const metaMatch = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: 'g', ctrlKey: true, action: () => router.push('/dashboard'), description: 'Aller au tableau de bord' },
    { key: 'i', ctrlKey: true, action: () => router.push('/invoices'), description: 'Aller aux factures' },
    { key: 'c', ctrlKey: true, action: () => router.push('/clients'), description: 'Aller aux clients' },
    { key: 'd', ctrlKey: true, action: () => router.push('/documents/devis'), description: 'Aller aux devis' },
    { key: 'n', ctrlKey: true, shiftKey: true, action: () => router.push('/invoices/new'), description: 'Nouvelle facture' },

    // Actions
    { key: 'k', ctrlKey: true, action: () => {
      // Ouvrir la command palette
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      window.dispatchEvent(event);
    }, description: 'Ouvrir la commande palette' },

    { key: '/', action: () => {
      // Focus sur la recherche
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    }, description: 'Focus sur la recherche' },
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('⌘');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}
