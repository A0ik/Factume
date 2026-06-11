'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Check, X, Camera, Upload, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// LOI 1 (JUSTIFICATIF) : En France, une note de frais SANS justificatif (ticket, facture)
// est ILLÉGALE et rejetée en contrôle fiscal (art. L123-22 Code de Commerce).
// → L'application BLOQUE la soumission et EXIGE l'upload d'un justificatif.
// LOI 5 (SENTINEL) : S'il y a un champ de texte pour créer une dépense,
// il DOIT y avoir un bouton micro à côté.
// LOI 9 (SENTINEL) : Le bouton vocal doit avoir un état "Écoute en cours" visuel.
// LOI 10 (SENTINEL) : Voice Expense doit créer une dépense, pas une facture.

interface VoiceExpenseResult {
  vendor: string;
  amount: number;
  vat_amount: number;
  category: string;
  date: string;
  description: string;
  payment_method: string | null;
}

interface VoiceExpenseButtonProps {
  onExpenseCreated: (expense: any) => void;
  className?: string;
  /** Render as a compact inline button (for header bar) or a full FAB */
  variant?: 'inline' | 'fab';
}

export default function VoiceExpenseButton({
  onExpenseCreated,
  className,
  variant = 'inline',
}: VoiceExpenseButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'confirm' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingExpense, setPendingExpense] = useState<VoiceExpenseResult | null>(null);
  const [langBadge, setLangBadge] = useState<{ flag: string; label: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format accepté : JPG, PNG, WebP ou PDF');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le justificatif ne doit pas dépasser 10 Mo');
      return;
    }

    setReceiptFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null); // PDF — show icon instead
    }
  }, []);

  const confirmExpense = useCallback(async () => {
    if (!pendingExpense) return;

    // LOI 1 : BLOCAGE LÉGAL — Pas de justificatif = pas de sauvegarde
    if (!receiptFile) {
      toast.error('Justificatif obligatoire pour valider la note de frais');
      return;
    }

    setState('uploading');

    try {
      const { getSupabaseClient } = await import('@/lib/supabase');
      const { useAuthStore } = await import('@/stores/authStore');
      const supabase = getSupabaseClient();
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Non authentifié');

      // 1. Upload du justificatif dans Supabase Storage
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${user.id}/receipts/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, receiptFile, { upsert: false });

      if (uploadError) {
        console.error('[VoiceExpense] Upload error:', uploadError.message);
        // Fallback: create expense without receipt but mark as incomplete
        throw new Error('Erreur upload justificatif. Veuillez réessayer.');
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      // 3. Insert expense with receipt URL
      const { data, error } = await supabase.from('expenses').insert({
        user_id: user.id,
        vendor: pendingExpense.vendor,
        amount: pendingExpense.amount,
        vat_amount: pendingExpense.vat_amount || 0,
        category: pendingExpense.category,
        date: pendingExpense.date || new Date().toISOString().slice(0, 10),
        description: pendingExpense.description,
        payment_method: pendingExpense.payment_method || 'card',
        status: 'pending',
        source: 'voice',
        receipt_url: urlData?.publicUrl || null,
        receipt_file_path: filePath,
        has_receipt: true,
      }).select().single();

      if (error) throw error;

      onExpenseCreated(data);
      toast.success(`Dépense "${pendingExpense.vendor}" ajoutée avec justificatif`);
      setPendingExpense(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setState('idle');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
      setState('confirm');
    }
  }, [pendingExpense, receiptFile, onExpenseCreated]);

  const dismissExpense = useCallback(() => {
    setPendingExpense(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setState('idle');
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
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
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          toast.error('Aucun audio détecté. Vérifiez votre micro.');
          setState('idle');
          return;
        }

        setState('processing');

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'expense.webm');

        try {
          // LOI 10 : Utiliser /api/process-voice-expense, PAS /api/process-voice
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 30000);
          const res = await fetch('/api/process-voice-expense', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(fetchTimeout);
          const data = await res.json();

          if (!res.ok) {
            // Handle upgrade required
            if (data.code === 'EXPENSE_LIMIT') {
              throw new Error('Plan Pro requis pour les dépenses vocales');
            }
            throw new Error(data.error || 'Erreur vocale');
          }

          // Show language detection badge (LOI 9)
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

          // LOI 1 : ALWAYS show confirmation dialog with receipt upload requirement
          // Never auto-insert without receipt — even if API returns expense data
          setPendingExpense({
            vendor: data.vendor || data.expense?.vendor || 'Fournisseur',
            amount: data.amount || data.expense?.amount || 0,
            vat_amount: data.vat_amount || data.expense?.vat_amount || 0,
            category: data.category || data.expense?.category || 'other',
            date: data.date || data.expense?.date || new Date().toISOString().slice(0, 10),
            description: data.description || data.expense?.description || '',
            payment_method: data.payment_method || data.expense?.payment_method || null,
          });
          setReceiptFile(null);
          setReceiptPreview(null);
          setState('confirm');
        } catch (err: any) {
          setState('error');
          setErrorMsg(err.message || 'Erreur lors du traitement');
          setTimeout(() => setState('idle'), 4000);
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
  }, [onExpenseCreated]);

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

  // Hidden file input for receipt upload
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  // ─── Confirmation Dialog with MANDATORY receipt upload ──────────────
  // LOI 1 : Justificatif OBLIGATOIRE — sans justificatif, le bouton "Confirmer"
  // est désactivé et un avertissement légal s'affiche.
  if (state === 'confirm' && pendingExpense) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'bg-zinc-900 border border-white/10 rounded-2xl p-4',
          className,
        )}
      >
        {fileInput}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Mic size={14} className="text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-100">Dépense détectée</p>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-xs text-zinc-500">Fournisseur</span>
            <span className="text-sm text-zinc-200 font-medium">{pendingExpense.vendor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-zinc-500">Montant</span>
            <span className="text-sm text-emerald-400 font-bold">{pendingExpense.amount.toFixed(2)} €</span>
          </div>
          {pendingExpense.description && (
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500">Description</span>
              <span className="text-sm text-zinc-300 truncate ml-4">{pendingExpense.description}</span>
            </div>
          )}
        </div>

        {/* LOI 1 : Upload justificatif OBLIGATOIRE */}
        <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className={receiptFile ? 'text-emerald-400' : 'text-amber-400'} />
            <p className={cn(
              'text-xs font-semibold',
              receiptFile ? 'text-emerald-400' : 'text-amber-400',
            )}>
              {receiptFile ? '✓ Justificatif ajouté' : 'Justificatif obligatoire'}
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 mb-2">
            En France, une note de frais sans justificatif est irrecevable en contrôle fiscal (art. L123-22).
          </p>

          {/* Preview */}
          {receiptPreview && (
            <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
              <img src={receiptPreview} alt="Aperçu justificatif" className="w-full h-24 object-cover" />
            </div>
          )}
          {receiptFile && !receiptPreview && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <span className="text-xs">📄</span>
              <span className="text-xs text-zinc-300 truncate">{receiptFile.name}</span>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2',
              receiptFile
                ? 'bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.06]'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30',
            )}
          >
            {receiptFile ? (
              <>
                <Camera size={13} />
                Remplacer le justificatif
              </>
            ) : (
              <>
                <Upload size={13} />
                Ajouter le ticket ou la facture (JPG, PDF)
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={dismissExpense}
            className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            Annuler
          </button>
          <button
            onClick={confirmExpense}
            disabled={!receiptFile}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
              receiptFile
                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed',
            )}
          >
            {!receiptFile ? (
              <>
                <Check size={14} />
                Confirmer
              </>
            ) : (
              <>
                <Check size={14} />
                Confirmer
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── Inline variant (button in header bar) ──────────────────────────
  if (variant === 'inline') {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={toggleRecording}
          disabled={state === 'processing' || state === 'uploading'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            state === 'recording'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : state === 'processing' || state === 'uploading'
              ? 'bg-blue-500/80 text-white'
              : 'bg-emerald-500 text-white hover:bg-emerald-400',
            className,
          )}
        >
          {/* LOI 9 : État visuel pour l'écoute en cours */}
          {state === 'recording' ? (
            <>
              <div className="relative">
                <MicOff size={16} />
                <motion.div
                  className="absolute -inset-1 rounded-full bg-red-400"
                  animate={{ opacity: [0.5, 0], scale: [1, 1.8] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              <span>Écoute...</span>
            </>
          ) : state === 'processing' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyse IA...</span>
            </>
          ) : (
            <>
              <Mic size={16} />
              <span className="hidden sm:inline">Vocal</span>
            </>
          )}
        </motion.button>

        {/* Error toast */}
        <AnimatePresence>
          {state === 'error' && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute top-full left-0 mt-2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-lg z-50"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language badge */}
        <AnimatePresence>
          {langBadge && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 mt-2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold shadow-lg border border-white/10 z-50"
            >
              {langBadge.flag} {langBadge.label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── FAB variant (floating action button) ───────────────────────────
  return (
    <div className="relative flex flex-col items-center">
      {/* LOI 9 : Idle glow pulse invites interaction */}
      {state === 'idle' && (
        <motion.div
          className="absolute inset-[-6px] rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0px rgba(16, 185, 129, 0.35)',
              '0 0 0 10px rgba(16, 185, 129, 0)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={toggleRecording}
        disabled={state === 'processing' || state === 'uploading'}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-2xl transition-all duration-200',
          'w-14 h-14 lg:w-[68px] lg:h-[68px]',
          state === 'recording'
            ? 'bg-red-500 text-white shadow-xl shadow-red-500/40'
            : state === 'processing' || state === 'uploading'
            ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/35 hover:shadow-emerald-500/55',
          className,
        )}
      >
        {state === 'recording' ? (
          <MicOff size={22} strokeWidth={2.5} />
        ) : state === 'processing' || state === 'uploading' ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <Mic size={22} strokeWidth={2.5} />
        )}

        {/* Recording pulse rings */}
        {state === 'recording' && (
          <>
            <motion.div
              className="absolute inset-0 rounded-2xl bg-red-500"
              animate={{ opacity: [0.5, 0], scale: [1, 1.35] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-red-400/50"
              animate={{ opacity: [0.3, 0], scale: [1, 1.55] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.35 }}
            />
          </>
        )}

        {/* Processing shimmer */}
        {(state === 'processing' || state === 'uploading') && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.button>

      {/* Waveform bars */}
      <AnimatePresence>
        {state === 'recording' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 24 }}
            exit={{ opacity: 0, height: 0 }}
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

      {/* Processing label */}
      <AnimatePresence>
        {(state === 'processing' || state === 'uploading') && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-3 py-1 rounded-xl bg-blue-500 text-white text-[10px] font-bold shadow-lg"
          >
            {state === 'uploading' ? 'Upload justificatif...' : 'Analyse IA en cours...'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {state === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-3 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-bold shadow-lg"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language badge */}
      <AnimatePresence>
        {langBadge && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-3 py-1 rounded-xl bg-zinc-800 text-zinc-200 text-[10px] font-semibold shadow-lg border border-white/10"
          >
            {langBadge.flag} {langBadge.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
