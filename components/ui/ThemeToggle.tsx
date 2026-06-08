'use client';
import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  useEffect(() => {
    // Initialiser le thème au montage
    useThemeStore.getState().initTheme();
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
