'use client';

import { useEffect, useState } from 'react';
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

const SHORTCUTS_DISABLED_KEY = 'facturme_shortcuts_disabled';

export function areShortcutsDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SHORTCUTS_DISABLED_KEY) === 'true';
}

export function setShortcutsDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHORTCUTS_DISABLED_KEY, disabled.toString());
}

export function toggleShortcuts(): boolean {
  const current = areShortcutsDisabled();
  setShortcutsDisabled(!current);
  return !current;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur tape dans un input, textarea ou contentEditable
      const target = e.target as HTMLElement;
      const tagName = target?.tagName?.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || target?.isContentEditable;

      // Autoriser les raccourcis clavier même dans les inputs SEULEMENT si Ctrl/Cmd est pressé
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (isInput && !hasModifier) return;

      // Ignorer si les raccourcis sont désactivés
      if (areShortcutsDisabled()) return;

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined || e.altKey === shortcut.altKey;
        const metaMatch = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [shortcuts, enabled]);
}

export function useGlobalKeyboardShortcuts(enabled?: boolean) {
  const router = useRouter();

  // Raccourcis ZENITH — routes fusionnées
  const shortcuts: KeyboardShortcut[] = [
    // Navigation — routes fusionnées
    { key: 'd', altKey: true, action: () => router.push('/dashboard'), description: 'Aller au tableau de bord' },
    { key: 'f', altKey: true, action: () => router.push('/documents'), description: 'Aller aux documents' },
    { key: 'c', altKey: true, action: () => router.push('/contacts'), description: 'Aller aux contacts' },
    { key: 'x', altKey: true, action: () => router.push('/contracts'), description: 'Aller aux contrats' },
    { key: 'n', altKey: true, shiftKey: true, action: () => router.push('/documents/factures/new'), description: 'Nouvelle facture' },

    // Actions - utilise Ctrl/Cmd + lettre qui est standard
    { key: 'k', ctrlKey: true, metaKey: true, action: () => {
      // Ouvrir la command palette
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
      window.dispatchEvent(event);
    }, description: 'Ouvrir la commande palette' },

    // Focus recherche - utilise une touche plus spécifique
    { key: 'f', ctrlKey: true, shiftKey: true, action: () => {
      // Focus sur la recherche
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="rechercher" i], input[placeholder*="search" i]') as HTMLInputElement;
      searchInput?.focus();
    }, description: 'Focus sur la recherche' },
  ];

  useKeyboardShortcuts(shortcuts, enabled);
  return shortcuts;
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Afficher ⌘ sur Mac, Ctrl sur Windows/Linux
  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.metaKey && !shortcut.ctrlKey) parts.push('⌘');

  // Mettre la touche en majuscule pour l'affichage
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(key);

  return parts.join(isMac ? '' : ' + ');
}
