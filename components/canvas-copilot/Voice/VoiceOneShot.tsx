'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore } from '../documentSessionStore';

const SPRING = { type: 'spring' as const, damping: 25, stiffness: 400 };

interface VoiceOneShotProps {
  sector?: string;
  className?: string;
}

/**
 * VoiceOneShot — Floating microphone button for one-shot voice invoice creation.
 *
 * Flow:
 * 1. User taps mic -> getUserMedia -> MediaRecorder captures audio
 * 2. On stop -> POST /api/process-voice with FormData
 * 3. Response parsed -> applyAIParsedResult(result.parsed, 'voice')
 * 4. If uncertain_fields -> pendingDoubts mechanism triggers inline doubt cards
 */
export default function VoiceOneShot({ sector, className }: VoiceOneShotProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    documentType,
    items,
    isProcessingVoice,
    applyAIParsedResult,
    setProcessingVoice,
  } = useDocumentSessionStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg('');
    setState('recording');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks immediately
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setState('idle');
          return;
        }

        setState('processing');
        setProcessingVoice(true);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        if (sector) formData.append('sector', sector);
        if (items?.length) {
          formData.append('existingItems', JSON.stringify(items));
        }
        formData.append('mode', documentType);

        try {
          const res = await fetch('/api/process-voice', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur vocale');

          // Apply parsed result — this also triggers doubt resolution if uncertain_fields exist
          applyAIParsedResult(data.parsed || data, 'voice');
          setState('idle');
        } catch (err: any) {
          setState('error');
          setErrorMsg(err.message || 'Erreur lors du traitement');
          // Auto-dismiss error after 3s
          setTimeout(() => setState('idle'), 3000);
        } finally {
          setProcessingVoice(false);
        }
      };

      mediaRecorder.start();
    } catch (err: any) {
      setState('error');
      setErrorMsg('Acces au micro refuse');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [documentType, items, sector, applyAIParsedResult, setProcessingVoice]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const isBusy = state === 'recording' || state === 'processing';

  return (
    <div className={cn('relative', className)}>
      {/* Main mic button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleRecording}
        disabled={state === 'processing'}
        className={cn(
          'relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-lg',
          state === 'recording'
            ? 'bg-red-500 text-white shadow-red-500/30'
            : state === 'processing'
            ? 'bg-blue-500 text-white shadow-blue-500/20'
            : state === 'error'
            ? 'bg-amber-500 text-white shadow-amber-500/20'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40',
        )}
      >
        {state === 'recording' ? (
          <MicOff size={20} strokeWidth={2.5} />
        ) : state === 'processing' ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Mic size={20} strokeWidth={2.5} />
        )}

        {/* Recording pulse ring */}
        {state === 'recording' && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-red-500"
            animate={{ opacity: [0.4, 0], scale: [1, 1.2] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Processing indicator tooltip */}
      <AnimatePresence>
        {state === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 whitespace-nowrap px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold shadow-lg"
          >
            Analyse en cours...
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {state === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 whitespace-nowrap px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-lg"
          >
            {errorMsg}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording waveform — shown below the button */}
      <AnimatePresence>
        {state === 'recording' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-end justify-center gap-[3px]"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-red-400 rounded-full"
                animate={{
                  height: [4, 10 + Math.sin(i) * 6, 6, 14, 8, 10, 4],
                }}
                transition={{
                  duration: 0.7 + Math.sin(i) * 0.2,
                  repeat: Infinity,
                  delay: i * 0.06,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
