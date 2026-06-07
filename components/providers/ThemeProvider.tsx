'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { usePathname } from 'next/navigation';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useThemeStore();
  const pathname = usePathname();

  useEffect(() => {
    // La landing page (/) gère ses propres couleurs directement dans ses composants
    // (bg-slate-950, bg-white, text-white…). On ne touche PAS au .dark sur <html>
    // car les overrides globals.css .dark détruiraient les sections blanches
    // (bg-white → slate-900 avec !important).
    if (pathname === '/') {
      document.documentElement.classList.remove('dark');
      return;
    }

    // Initialiser le thème depuis localStorage, par défaut: dark
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (stored) {
      setTheme(stored);
    } else {
      // Par défaut: thème sombre
      setTheme('dark');
    }
  }, [setTheme, pathname]);

  return <>{children}</>;
}
