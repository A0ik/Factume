'use client';

import { useEffect, useState, useRef } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';

export function AutoSaveIndicator() {
  const { loading } = useDataStore();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showIndicator, setShowIndicator] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const loadingStartRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (loading) {
      loadingStartRef.current = Date.now();
      setSaveStatus('saving');
      setShowIndicator(true);

      // Timeout after 15 seconds to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        const loadingDuration = loadingStartRef.current ? Date.now() - loadingStartRef.current : 0;
        console.warn(`[AutoSaveIndicator] Loading timeout after ${loadingDuration}ms`);
        setSaveStatus('error');
        setTimeout(() => {
          setShowIndicator(false);
          setSaveStatus('idle');
        }, 3000);
      }, 15000);
    } else {
      // Clear timeout if loading completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setSaveStatus('saved');
      setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sauvegarde longue...</span>
          </>
        )}
      </div>
    </div>
  );
}
