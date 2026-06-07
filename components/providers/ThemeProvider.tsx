'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { usePathname } from 'next/navigation';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useThemeStore();
  const pathname = usePathname();

  useEffect(() => {
    // La landing page utilise ses propres couleurs (bg-slate-950, text-white…)
    // mais les overrides CSS globals.css (html:not(.dark) .text-slate-300/400)
    // forcent le texte en gris foncé → invisible sur fond noir.
    // Solution : activer .dark sur <html> pour que les overrides .dark s'appliquent
    // et que les html:not(.dark) soient désactivés.
    if (pathname === '/') {
      document.documentElement.classList.add('dark');
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
