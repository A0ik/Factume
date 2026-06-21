'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore } from '../documentSessionStore';
import { toast } from 'sonner';

const SPRING = { type: 'spring' as const, damping: 25, stiffness: 400 };

interface VoiceOneShotProps {
  sector?: string;
  className?: string;
}

/**
 * VoiceOneShot — HERO microphone button for voice-first document creation.
 *
 * LOI 3 (Arbiter) — CONTEXTE COMPLET : on envoie l'état entier du document
 *   (formContext) à l'IA pour qu'elle MODIFIE l'existant au lieu de recréer.
 * LOI 4 (Arbiter) — FEEDBACK AU-DESSUS : la transcription et tous les retours
 *   (traitement, langue, erreur) s'affichent AU-DESSUS du micro (bottom-full),
 *   jamais en dessous — sinon le bas de l'écran les coupe.
 *
 * States: Idle → Recording → Processing → (Error | Done)
 */
export default function VoiceOneShot({ sector, className }: VoiceOneShotProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState('');
  const [langBadge, setLangBadge] = useState<{ flag: string; label: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    documentType,
    items,
    applyAIParsedResult,
    setProcessingVoice,
  } = useDocumentSessionStore();

  // LOI 3 — Construit l'état complet du document à envoyer à l'IA (lecture fraîche au moment de l'enregistrement)
  const buildFormContext = useCallback(() => {
    const s = useDocumentSessionStore.getState();
    return {
      document_type: s.documentType,
      client_name: s.clientName || null,
      client_email: s.clientEmail || null,
      client_phone: s.clientPhone || null,
      client_address: s.clientAddress || null,
      client_city: s.clientCity || null,
      client_postal_code: s.clientPostalCode || null,
      client_siret: s.clientSiret || null,
      client_vat_number: s.clientVatNumber || null,
      items: s.items.map((i: any) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        vat_rate: i.vat_rate,
        discount_percent: i.discount_percent ?? null,
        discount_amount: i.discount_amount ?? null,
      })),
      notes: s.notes || null,
      discount_percent: s.discountPercent || null,
      discount_amount: s.discountType === 'amount' ? (s.discountAmountInput || null) : null,
      discount_type: s.discountType || null,
      due_days: s.paymentDays,
      issue_date: s.issueDate || null,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;

    setErrorMsg('');
    setTranscript(''); // reset previous transcript
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
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          toast.error('Aucun audio détecté. Vérifiez que votre micro fonctionne.');
          setState('idle');
          return;
        }

        setState('processing');
        setProcessingVoice(true);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        if (sector) formData.append('sector', sector);
        formData.append('mode', documentType);

        // LOI 3 — On envoie TOUJOURS l'état complet du document (contexte + lignes)
        const formContext = buildFormContext();
        formData.append('formContext', JSON.stringify(formContext));
        const hasContent = items?.some((i) => i.description || i.unit_price > 0);
        if (hasContent) formData.append('existingItems', JSON.stringify(items));

        try {
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 30000);
          try {
            const res = await fetch('/api/process-voice', { method: 'POST', body: formData, signal: controller.signal });
            clearTimeout(fetchTimeout);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur vocale');

            // LOI 4 — Transcription affichée AU-DESSUS du micro
            if (data.transcript) {
              setTranscript(data.transcript);
              // Auto-masque après 8s pour ne pas encombrer
              if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
              transcriptTimerRef.current = setTimeout(() => setTranscript(''), 8000);
            }

            applyAIParsedResult(data.parsed || data, 'voice');

            if (data.wasTranslated && data.originalLanguage) {
              const langMap: Record<string, { flag: string; label: string }> = {
                arabic: { flag: '🇲🇦', label: 'Arabe → FR' },
                english: { flag: '🇬🇧', label: 'English → FR' },
                spanish: { flag: '🇪🇸', label: 'Español → FR' },
                german: { flag: '🇩🇪', label: 'Deutsch → FR' },
                italian: { flag: '🇮🇹', label: 'Italiano → FR' },
                portuguese: { flag: '🇵🇹', label: 'Português → FR' },
              };
              const detected = langMap[data.originalLanguage];
              if (detected) {
                setLangBadge(detected);
                setTimeout(() => setLangBadge(null), 4000);
              }
            }

            setState('idle');
          } catch (fetchErr: any) {
            clearTimeout(fetchTimeout);
            throw fetchErr;
          }
        } catch (err: any) {
          setState('error');
          setErrorMsg(err.message || 'Erreur lors du traitement');
          setTimeout(() => setState('idle'), 3000);
        } finally {
          setProcessingVoice(false);
        }
      };

      mediaRecorder.start();
      recordingTimeoutRef.current = setTimeout(() => stopRecording(), 60000);
    } catch (err: any) {
      isRecordingRef.current = false;
      setState('error');
      setErrorMsg('Accès au micro refusé');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [documentType, items, sector, applyAIParsedResult, setProcessingVoice, buildFormContext]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
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
      {/* ═══ LOI 4 — TRANSCRIPTION AU-DESSUS DU MICRO (jamais coupée en bas) ═══ */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[min(80vw,22rem)] z-30 pointer-events-none rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 shadow-xl"
          >
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
                  Transcription
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug line-clamp-4">
                  {transcript}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOOLTIP LANGUE — AU-DESSUS ═══ */}
      <AnimatePresence>
        {langBadge && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-3 py-1 rounded-xl bg-zinc-800 dark:bg-zinc-700 text-zinc-100 text-[10px] font-semibold shadow-lg border border-white/10 z-30 pointer-events-none"
          >
            {langBadge.flag} {langBadge.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ IDLE GLOW RING ═══ */}
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

      {/* ═══ MAIN BUTTON ═══ */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={toggleRecording}
        disabled={state === 'processing'}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-2xl transition-all duration-200',
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

        {state === 'processing' && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.button>

      {/* ═══ WAVEFORM — AU-DESSUS (recording) ═══ */}
      <AnimatePresence>
        {state === 'recording' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 24 }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex items-end justify-center gap-[2px] z-30 pointer-events-none"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-[2.5px] bg-red-500 dark:bg-red-400 rounded-full"
                animate={{ height: [3, 7 + Math.sin(i * 0.7) * 5, 4, 11 + Math.cos(i * 0.5) * 4, 5, 8, 3] }}
                transition={{ duration: 0.55 + Math.sin(i * 0.3) * 0.12, repeat: Infinity, delay: i * 0.035 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOOLTIP TRAITEMENT — AU-DESSUS ═══ */}
      <AnimatePresence>
        {state === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-3 py-1 rounded-xl bg-blue-500 text-white text-[10px] font-bold shadow-lg z-30 pointer-events-none"
          >
            Analyse IA en cours…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOOLTIP ERREUR — AU-DESSUS ═══ */}
      <AnimatePresence>
        {state === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-3 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-bold shadow-lg z-30 pointer-events-none"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
