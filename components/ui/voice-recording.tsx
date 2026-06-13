'use client';

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, AlertCircle, Lightbulb, Edit3, HelpCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface VoiceRecordingProps {
  onResult: (data: VoiceAnalysisResult) => void;
  onClose?: () => void;
  isPro?: boolean;
  mode?: 'invoice' | 'quote' | 'credit_note' | 'order' | 'delivery' | 'deposit';
  existingItems?: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number }>;
  sector?: string;
}

export interface VoiceUncertainField {
  field: string;
  current_value: string | number | null;
  reason: string;
  suggestion?: string | number | null;
}

export interface VoiceAnalysisResult {
  action?: 'added' | 'modified' | 'removed' | 'replaced';
  summary?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_postal_code?: string | null;
  client_siret?: string | null;
  client_vat_number?: string | null;
  items?: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number }>;
  due_days?: number | null;
  notes?: string | null;
  discount_percent?: number;
  uncertain_fields?: VoiceUncertainField[];
}

export function PulseVoiceRecorder({
  onResult,
  onClose,
  isPro = true,
  mode = 'invoice',
  existingItems = [],
  sector = '',
}: VoiceRecordingProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Confirmation popup state
  const [pendingResult, setPendingResult] = useState<VoiceAnalysisResult | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!recording) {
      setDuration(0);
      setPulseIntensity([]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
      // Generate random pulse patterns for visual feedback
      setPulseIntensity(Array.from({ length: 5 }, () => Math.random()));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!isPro) {
      toast.error('La reconnaissance vocale est disponible avec les abonnements Pro et Business');
      return;
    }

    setError('');
    setTranscript('');
    setProcessing(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        await processAudio();
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Accès au micro refusé. Cliquez sur le cadenas dans la barre d\'adresse et autorisez le microphone.');
      } else if (err.name === 'NotFoundError') {
        setError('Aucun microphone trouvé. Veuillez brancher un microphone et réessayer.');
      } else {
        setError('Impossible d\'accéder au microphone: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setProcessing(true);
  };

  const processAudio = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('mode', mode);

      if (sector) {
        formData.append('sector', sector);
      }

      // Check if we're editing (have existing items)
      const hasContent = existingItems.some(item => item.description || item.unit_price > 0);
      if (hasContent) {
        formData.append('isEdit', 'true');
        formData.append('existingItems', JSON.stringify(existingItems));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response: Response;
      try {
        response = await fetch('/api/process-voice', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error('Clé API invalide. Vérifiez GROQ_API_KEY.');
        }
        if (response.status === 429) {
          throw new Error('Trop de requêtes. Réessayez dans quelques instants.');
        }
        throw new Error(errorData.error || 'Erreur lors du traitement vocal');
      }

      const result = await response.json();

      if (result.transcript) {
        setTranscript(result.transcript);
      }

      if (result.parsed) {
        const hasUncertain = result.parsed.uncertain_fields && result.parsed.uncertain_fields.length > 0;

        if (hasUncertain) {
          // Show confirmation popup for uncertain fields
          setPendingResult(result.parsed);
          setCorrections({});
        } else {
          // All clear, apply directly
          onResult(result.parsed);
          if (result.summary) {
            toast.success(result.summary);
          }
          if (onClose) {
            setTimeout(() => onClose(), 500);
          }
        }
      }
    } catch (err: any) {
      console.error('Error processing audio:', err);
      if (err.name === 'AbortError') {
        setError('Délai d\'attente dépassé. Réessayez avec un enregistrement plus court.');
      } else {
        setError(err.message || 'Erreur lors du traitement vocal');
      }
    } finally {
      setProcessing(false);
    }
  };

  const isSupported = typeof navigator !== 'undefined' &&
    navigator.mediaDevices && typeof MediaRecorder !== 'undefined';

  // Apply corrections to the pending result and submit
  const confirmAndApply = () => {
    if (!pendingResult) return;
    const corrected = { ...pendingResult };

    // Apply user corrections
    for (const [fieldPath, newValue] of Object.entries(corrections)) {
      if (!newValue && newValue !== '0') continue;
      const numVal = parseFloat(newValue);
      const useNumber = !isNaN(numVal) && /^[\d.,]+$/.test(newValue.trim());

      if (fieldPath.startsWith('items[')) {
        const match = fieldPath.match(/items\[(\d+)\]\.(\w+)/);
        if (match && corrected.items) {
          const idx = parseInt(match[1]);
          const key = match[2];
          if (corrected.items[idx]) {
            (corrected.items[idx] as any)[key] = useNumber ? numVal : newValue;
          }
        }
      } else {
        (corrected as any)[fieldPath] = useNumber ? numVal : newValue;
      }
    }

    onResult(corrected);
    if (pendingResult.summary) {
      toast.success(pendingResult.summary);
    }

    // Save corrections to backend for AI learning (non-blocking)
    if (Object.keys(corrections).length > 0) {
      saveCorrections(pendingResult.uncertain_fields || [], corrections);
    }

    setPendingResult(null);
    setCorrections({});
    if (onClose) {
      setTimeout(() => onClose(), 300);
    }
  };

  // Save voice corrections for future AI learning
  const saveCorrections = async (
    uncertainFields: VoiceUncertainField[],
    userCorrections: Record<string, string>
  ) => {
    try {
      const saves = Object.entries(userCorrections)
        .filter(([, newValue]) => newValue && newValue.trim())
        .map(([fieldPath, newValue]) => {
          const uncertain = uncertainFields.find(uf => uf.field === fieldPath);
          return {
            field: fieldPath,
            original_value: String(uncertain?.current_value ?? ''),
            corrected_value: newValue,
            context: mode,
          };
        })
        .filter(s => s.original_value && s.corrected_value && s.original_value !== s.corrected_value);

      for (const save of saves) {
        fetch('/api/voice-corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(save),
        }).catch(() => {});
      }
    } catch {
      // Non-critical, silently fail
    }
  };

  const skipCorrections = () => {
    if (!pendingResult) return;
    onResult(pendingResult);
    if (pendingResult.summary) {
      toast.success(pendingResult.summary);
    }
    setPendingResult(null);
    setCorrections({});
    if (onClose) {
      setTimeout(() => onClose(), 300);
    }
  };

  // Render field label from field path
  const fieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      'client_name': 'Nom du client',
      'client_email': 'Email',
      'client_phone': 'Téléphone',
      'client_address': 'Adresse',
      'client_city': 'Ville',
      'client_postal_code': 'Code postal',
      'client_siret': 'SIRET',
      'client_vat_number': 'N° TVA',
      'due_days': 'Délai (jours)',
      'discount_percent': 'Remise (%)',
      'notes': 'Notes',
    };
    if (field.startsWith('items[')) {
      const match = field.match(/items\[(\d+)\]\.(\w+)/);
      if (match) {
        const idx = parseInt(match[1]) + 1;
        const keyLabels: Record<string, string> = {
          'description': 'Description',
          'quantity': 'Quantité',
          'unit_price': 'Prix unitaire HT',
          'vat_rate': 'Taux TVA',
        };
        return `Ligne ${idx} — ${keyLabels[match[2]] || match[2]}`;
      }
    }
    return labels[field] || field;
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          La reconnaissance vocale n'est pas supportée par ce navigateur.
        </p>
        <p className="text-sm text-gray-500">
          Utilisez Chrome, Edge ou Safari pour cette fonctionnalité.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 w-full max-w-md mx-auto">
      {/* LOI 8 : transcription affichée AU-DESSUS du micro (feedback immédiat) */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
                  Transcription
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                  {transcript}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated pulse rings */}
      <div className="relative">
        {recording && (
          <>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className={cn(
                  "absolute inset-0 rounded-full border-2 border-primary/20",
                )}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{
                  duration: 2,
                  delay: index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
            {/* Sound wave visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              {pulseIntensity.map((intensity, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 bg-primary/40 rounded-full"
                  animate={{
                    height: [8, 20 + intensity * 40, 8],
                    opacity: [0.2, 0.7, 0.2],
                  }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    delay: i * 0.06,
                  }}
                  style={{
                    transform: `rotate(${i * 30}deg) translateX(60px)`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Main record button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className={cn(
            "relative z-10 w-24 h-24 rounded-full transition-all duration-300",
            "flex items-center justify-center shadow-lg",
            recording
              ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/50"
              : processing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-br from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-primary/50"
          )}
        >
          {processing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : recording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>
      </div>

      {/* Duration display */}
      <AnimatePresence>
        {(recording || processing) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(duration)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {recording ? 'Enregistrement en cours...' : 'Traitement en cours...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400 flex-1">
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!recording && !processing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        >
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Astuce:</strong> Dites{" "}
              <span className="italic">"Facture pour Startup Tech, site web 3500€ HT, design 1500€ HT"</span>
            </span>
          </p>
        </motion.div>
      )}

      {/* Confirmation popup for uncertain fields */}
      <AnimatePresence>
        {pendingResult && pendingResult.uncertain_fields && pendingResult.uncertain_fields.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="w-full max-w-lg mx-auto"
          >
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 overflow-hidden shadow-lg">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200 dark:border-amber-500/20 bg-amber-100/50 dark:bg-amber-500/10">
                <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Vérification requise</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                    L'IA n'est pas certaine de certaines valeurs. Vérifiez et corrigez si besoin.
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {pendingResult.uncertain_fields.map((uf, idx) => (
                  <div key={idx} className="rounded-xl bg-white dark:bg-slate-800/80 border border-amber-100 dark:border-amber-500/10 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Edit3 size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{fieldLabel(uf.field)}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-0.5">{uf.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">IA:</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-through opacity-50">
                        {String(uf.current_value ?? '—')}
                      </span>
                      <input
                        type="text"
                        placeholder={uf.suggestion != null ? String(uf.suggestion) : String(uf.current_value ?? '')}
                        value={corrections[uf.field] ?? ''}
                        onChange={(e) => setCorrections(prev => ({ ...prev, [uf.field]: e.target.value }))}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 px-5 py-4 border-t border-amber-200 dark:border-amber-500/20">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={skipCorrections}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors"
                >
                  Garder tel quel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmAndApply}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md transition-all"
                >
                  <CheckCircle size={16} />
                  Confirmer
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close button */}
      {onClose && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          disabled={recording || processing}
          className="px-6 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Fermer
        </motion.button>
      )}
    </div>
  );
}
