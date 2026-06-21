'use client';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';

export function ThemeToggle() {
  const { theme, resolvedTheme, toggle } = useThemeStore();

  const handleToggle = () => {
    toggle();
    // GUARDIAN (CIBLE 1) — persiste la préférence côté serveur (synchronisation cross-device). Fire-and-forget.
    const next = resolvedTheme === 'light' ? 'dark' : 'light';
    useAuthStore.getState().updateProfile({ theme_preference: next }).catch(() => {});
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
      className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
