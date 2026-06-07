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
 * VoiceOneShot — HERO microphone button for voice-first document creation.
 *
 * ═══ DESIGN PHILOSOPHY (FLAW 4 — Voice-First UI) ═══
 * The voice button is the PRIMARY interaction point. It is always the most
 * visually prominent element in the creation bar. Manual text input is the
 * alternative, not the default.
 *
 * States:
 *  Idle       → Emerald glow pulse invites interaction
 *  Recording  → Red double-pulse ring + 12-bar audio waveform
 *  Processing → Blue shimmer indicates AI analysis
 *  Error      → Amber auto-dismisses after 3s
 *
 * ═══ UX LAWS APPLIED ═══
 * • Fitts's Law — Large touch target (56px mobile, 68px desktop)
 * • Aesthetic-Usability Effect — Beautiful glow animations invite use
 * • Shneiderman Rule 3 — Informative feedback on every state change
 * • Von Restorff Effect — Voice button stands out as the most distinctive element
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

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* ═══ IDLE GLOW RING ═══ Loi: Aesthetic-Usability Effect + Von Restorff */}
      {state === 'idle' && (
        <motion.div
          className="absolute inset-[-6px] rounded-[20px] lg:rounded-[22px] pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0px rgba(16, 185, 129, 0.35)',
              '0 0 0 10px rgba(16, 185, 129, 0)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ═══ MAIN BUTTON ═══ Fitts's Law: Large touch target */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={toggleRecording}
        disabled={state === 'processing'}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-2xl transition-all duration-200',
          // FLAW 4 FIX: Voice button is HERO — larger than everything else
          'w-14 h-14 lg:w-[68px] lg:h-[68px]',
          state === 'recording'
            ? 'bg-red-500 text-white shadow-xl shadow-red-500/40'
            : state === 'processing'
            ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
            : state === 'error'
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/35 hover:shadow-emerald-500/55',
        )}
      >
        {state === 'recording' ? (
          <MicOff size={22} strokeWidth={2.5} />
        ) : state === 'processing' ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <Mic size={22} strokeWidth={2.5} />
        )}

        {/* ═══ RECORDING: Double pulse rings ═══ */}
        {state === 'recording' && (
          <>
            <motion.div
              className="absolute inset-0 rounded-2xl bg-red-500"
              animate={{ opacity: [0.5, 0], scale: [1, 1.35] }}
              transition={{ duration: 1.0, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-red-400/50"
              animate={{ opacity: [0.3, 0], scale: [1, 1.55] }}
              transition={{ duration: 1.0, repeat: Infinity, delay: 0.35 }}
            />
          </>
        )}

        {/* ═══ PROCESSING: Shimmer overlay ═══ */}
        {state === 'processing' && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.button>

      {/* ═══ WAVEFORM — Recording state ═══ Loi: Visibility of System Status (NN/g Heuristic 1) */}
      <AnimatePresence>
        {state === 'recording' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 24 }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex items-end justify-center gap-[2px]"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[2.5px] bg-red-400 rounded-full"
                animate={{
                  height: [3, 7 + Math.sin(i * 0.7) * 5, 4, 11 + Math.cos(i * 0.5) * 4, 5, 8, 3],
                }}
                transition={{
                  duration: 0.55 + Math.sin(i * 0.3) * 0.12,
                  repeat: Infinity,
                  delay: i * 0.035,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOOLTIP: Processing ═══ */}
      <AnimatePresence>
        {state === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-3 py-1 rounded-xl bg-blue-500 text-white text-[10px] font-bold shadow-lg"
          >
            Analyse IA en cours...
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOOLTIP: Error ═══ */}
      <AnimatePresence>
        {state === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-3 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-bold shadow-lg"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
