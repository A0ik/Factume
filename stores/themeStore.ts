'use client';
import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  initTheme: () => void;
}

// Resolve the actual theme from a theme preference
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply the resolved theme to the DOM
function applyTheme(resolved: ResolvedTheme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
  localStorage.setItem('theme', resolved);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  toggle: () => {
    const current = get().resolvedTheme;
    const next: ResolvedTheme = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next, resolvedTheme: next });
  },

  setTheme: (t) => {
    const resolved = resolveTheme(t);
    applyTheme(resolved);
    set({ theme: t, resolvedTheme: resolved });
  },

  initTheme: () => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const theme: Theme = stored || 'dark';
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });

    // Listen for system theme changes when using 'system' mode
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
        applyTheme(newResolved);
        set({ resolvedTheme: newResolved });
      };
      mql.addEventListener('change', handler);
    }
  },
}));
