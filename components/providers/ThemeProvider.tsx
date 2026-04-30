'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    // Initialiser le thème depuis localStorage, par défaut: light
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (stored) {
      setTheme(stored);
    } else {
      // Par défaut: thème clair
      setTheme('light');
    }
  }, [setTheme]);

  return <>{children}</>;
}
