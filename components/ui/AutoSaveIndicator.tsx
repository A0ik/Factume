'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';

export function AutoSaveIndicator() {
  const { loading } = useDataStore();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (loading) {
      setSaveStatus('saving');
      setShowIndicator(true);
    } else {
      setSaveStatus('saved');
      setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
    }
  }, [loading]);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
        {saveStatus === 'saving' && (
          <>
            <Loader2 size={16} className="text-blue-500 animate-spin" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sauvegarde...</span>
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <Check size={10} className="text-white" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Sauvegardé</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <CloudOff size={16} className="text-red-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Erreur de sauvegarde</span>
          </>
        )}
      </div>
    </div>
  );
}
