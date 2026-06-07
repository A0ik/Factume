'use client';
import { create } from 'zustand';

export type SidebarMode = 'icons' | 'expanded' | 'focus';

interface SidebarState {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  toggleExpanded: () => void;
  toggleFocus: () => void;
}

function getInitialMode(): SidebarMode {
  if (typeof window === 'undefined') return 'icons';
  try {
    const stored = localStorage.getItem('sidebar-mode');
    if (stored === 'icons' || stored === 'expanded' || stored === 'focus') return stored;
  } catch {}
  return 'icons';
}

export const useSidebarState = create<SidebarState>((set, get) => ({
  mode: 'icons', // will be hydrated
  setMode: (mode) => {
    try { localStorage.setItem('sidebar-mode', mode); } catch {}
    set({ mode });
  },
  toggleExpanded: () => {
    const current = get().mode;
    const next = current === 'expanded' ? 'icons' : 'expanded';
    try { localStorage.setItem('sidebar-mode', next); } catch {}
    set({ mode: next });
  },
  toggleFocus: () => {
    const current = get().mode;
    const next = current === 'focus' ? 'icons' : 'focus';
    try { localStorage.setItem('sidebar-mode', next); } catch {}
    set({ mode: next });
  },
}));

/**
 * Call once in layout to hydrate from localStorage
 */
export function hydrateSidebarMode() {
  const mode = getInitialMode();
  useSidebarState.setState({ mode });
}
