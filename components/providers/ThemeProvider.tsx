'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { usePathname } from 'next/navigation';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useThemeStore();
  const pathname = usePathname();

  useEffect(() => {
    // La landing page doit toujours être en mode clair
    if (pathname === '/') {
      setTheme('light');
      return;
    }

    // Initialiser le thème depuis localStorage, par défaut: light
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (stored) {
      setTheme(stored);
    } else {
      // Par défaut: thème clair
      setTheme('light');
    }
  }, [setTheme, pathname]);

  return <>{children}</>;
}
