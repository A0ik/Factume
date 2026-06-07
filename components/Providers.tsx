'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import '@/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch((err) => {
      console.error('[Providers] Auth init failed — landing page continues:', err);
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
