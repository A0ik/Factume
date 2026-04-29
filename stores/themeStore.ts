'use client';
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  initTheme: () => void;
}

// Fonction pour appliquer le thème au DOM
function applyTheme(theme: Theme) {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next });
  },
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  initTheme: () => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      applyTheme(stored);
      set({ theme: stored });
    } else {
      // Utiliser les préférences système
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme: Theme = prefersDark ? 'dark' : 'light';
      applyTheme(systemTheme);
      set({ theme: systemTheme });
    }
  },
}));
