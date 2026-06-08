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
    // (bg-white → surface dark avec !important).
    if (pathname === '/') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      return;
    }

    // Initialiser le thème depuis localStorage, par défaut: dark
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (stored) {
      setTheme(stored as any);
    } else {
      // OBSIDIAN: Par défaut, respecter la préférence système
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    }
  }, [setTheme, pathname]);

  return <>{children}</>;
}
