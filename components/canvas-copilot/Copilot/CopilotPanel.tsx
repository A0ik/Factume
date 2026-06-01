'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, Sparkles, FileText, Loader2,
  ChevronDown, Wand2, Lightbulb, X, Check, AlertCircle,
  User, Bot, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore, CopilotMessage } from '../documentSessionStore';
import { DOC_TYPE_CONFIGS } from '../config/documentTypeConfig';
import { formatCurrency } from '@/lib/utils';

// ─── Message Bubble ────────────────────────────────────

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAction = message.role === 'action';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-2.5 max-w-[90%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className={cn(
          'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0',
          isSystem ? 'bg-amber-100 dark:bg-amber-500/20' :
          isAction ? 'bg-emerald-100 dark:bg-emerald-500/20' :
          'bg-gradient-to-br from-blue-500 to-indigo-500',
        )}>
          {isSystem ? <AlertCircle size={13} className="text-amber-500" /> :
           isAction ? <Check size={13} className="text-emerald-500" /> :
           <Bot size={13} className="text-white" />}
        </div>
      )}

      {/* Content */}
      <div className={cn(
        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
          : isSystem
          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
          : isAction
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10',
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Action details */}
        {isAction && message.action?.fields && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.action.fields.slice(0, 5).map((field) => (
              <span
                key={field}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium"
              >
                {field === 'clientName' ? 'Client' :
                 field === 'items' ? 'Lignes' :
                 field === 'paymentDays' ? 'Paiement' :
                 field === 'notes' ? 'Notes' :
                 field === 'discountPercent' ? 'Remise' :
                 field}
              </span>
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 rounded-sm" />
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <User size={13} className="text-white" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Welcome Screen ────────────────────────────────────

function CopilotWelcome({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const documentType = useDocumentSessionStore((s) => s.documentType);
  const config = DOC_TYPE_CONFIGS[documentType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center px-6 py-8"
    >
      <div className={cn(
        'w-16 h-16 rounded-3xl flex items-center justify-center mb-5 bg-gradient-to-br',
        config.gradient,
      )}>
        <config.icon size={28} className="text-white" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {config.welcomeTitle}
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-6">
        {config.welcomePrompt}
      </p>

      {/* Suggestion chips */}
      <div className="space-y-2 w-full max-w-sm">
        {config.suggestions.map((suggestion, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {suggestion}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Or use manual shortcuts */}
      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-6">
        Ou utilisez les raccourcis : STC (site), FAC (facture), DEV (devis)
      </p>
    </motion.div>
  );
}

// ─── Main Copilot Panel ────────────────────────────────

interface CopilotPanelProps {
  profile: any;
  isPro: boolean;
  onPaywall: () => void;
}

export default function CopilotPanel({ profile, isPro, onPaywall }: CopilotPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    documentType,
    messages,
    isStreaming,
    isProcessingVoice,
    items,
    addMessage,
    applyAIParsedResult,
    setStreaming,
    setProcessingVoice,
  } = useDocumentSessionStore();

  const config = DOC_TYPE_CONFIGS[documentType];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send text message to AI ─────────────────────────
  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    if (!isPro) {
      onPaywall();
      return;
    }

    // Add user message
    addMessage({ role: 'user', content: text });
    setInputText('');
    setStreaming(true);

    // Add placeholder assistant message
    addMessage({ role: 'assistant', content: '', isStreaming: true });

    try {
      const hasContent = items.some(i => i.description || i.unit_price > 0);
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hasContent ? `MODIFICATION DE ${config.aiPromptPrefix}:\n${text}` : text,
          sector: profile?.sector,
          isEdit: hasContent,
          existingItems: hasContent ? items : undefined,
          document_type: documentType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { parsed, summary } = data;

      // Apply results to session store
      applyAIParsedResult(parsed, 'ai');

      // Update assistant message
      useDocumentSessionStore.getState().updateLastAssistantMessage(
        summary || 'Document mis à jour.',
      );
    } catch (err: any) {
      useDocumentSessionStore.getState().updateLastAssistantMessage(
        `❌ ${err.message || 'Erreur lors de la génération.'}`,
      );
    } finally {
      setStreaming(false);
    }
  }, [inputText, isStreaming, isPro, items, documentType, profile, config, addMessage, applyAIParsedResult, setStreaming, onPaywall]);

  // ─── Voice recording ─────────────────────────────────
  const handleVoiceResult = useCallback(async (result: any) => {
    applyAIParsedResult(result.parsed || result, 'voice');
    setProcessingVoice(false);
  }, [applyAIParsedResult, setProcessingVoice]);

  const handleVoiceError = useCallback((error: string) => {
    addMessage({ role: 'system', content: `❌ ${error}` });
    setProcessingVoice(false);
    setIsRecording(false);
  }, [addMessage, setProcessingVoice]);

  const toggleVoice = useCallback(() => {
    if (!isPro) {
      onPaywall();
      return;
    }
    setIsRecording(prev => !prev);
    if (!isRecording) {
      setProcessingVoice(true);
      addMessage({ role: 'system', content: '🎤 Écoute en cours...' });
    }
  }, [isPro, isRecording, addMessage, setProcessingVoice, onPaywall]);

  // ─── Keyboard shortcut ───────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br',
          config.gradient,
        )}>
          <Wand2 size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Copilot</h3>
          <p className="text-[10px] text-gray-400">
            {isStreaming ? 'Traitement en cours...' : 'Prêt'}
          </p>
        </div>

        {/* Pro badge */}
        {!isPro && (
          <button
            onClick={onPaywall}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
          >
            <Zap size={10} /> PRO
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <CopilotWelcome
            onSuggestionClick={(text) => {
              setInputText(text);
              inputRef.current?.focus();
            }}
          />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-2">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'Traitement en cours...' : 'Décrivez votre document ou parlez...'}
              disabled={isStreaming}
              rows={1}
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-white/10 text-sm resize-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:ring-blue-500/30 dark:focus:border-blue-400 transition-all max-h-24"
              style={{ minHeight: '42px' }}
            />
          </div>

          {/* Voice button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleVoice}
            disabled={isStreaming}
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all flex-shrink-0',
              isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700',
            )}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}

            {/* Recording pulse */}
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-red-500"
                animate={{ opacity: [0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.button>

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendText}
            disabled={!inputText.trim() || isStreaming}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl transition-all flex-shrink-0',
              inputText.trim() && !isStreaming
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed',
            )}
          >
            {isStreaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>

        {/* Voice recorder embedded (shown when recording) */}
        <AnimatePresence>
          {isRecording && (
            <VoiceRecorderInline
              documentType={documentType}
              existingItems={items}
              sector={profile?.sector || ''}
              onResult={handleVoiceResult}
              onError={handleVoiceError}
              onClose={() => setIsRecording(false)}
            />
          )}
        </AnimatePresence>

        {/* Hint */}
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5 text-center">
          Entrée pour envoyer · Shift+Entrée pour un retour à la ligne · 🎤 pour dicter
        </p>
      </div>
    </div>
  );
}

// ─── Inline Voice Recorder ─────────────────────────────

function VoiceRecorderInline({
  documentType,
  existingItems,
  sector,
  onResult,
  onError,
  onClose,
}: {
  documentType: string;
  existingItems: any[];
  sector: string;
  onResult: (result: any) => void;
  onError: (error: string) => void;
  onClose: () => void;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          if (cancelled) return;
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());

          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          if (sector) formData.append('sector', sector);
          if (existingItems?.length) {
            formData.append('existingItems', JSON.stringify(existingItems));
          }
          formData.append('mode', documentType);

          try {
            const res = await fetch('/api/process-voice', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur vocale');
            onResult(data);
          } catch (err: any) {
            onError(err.message);
          }
        };

        mediaRecorder.start();
      } catch (err: any) {
        onError(err.message || 'Accès au micro refusé');
      }
    }

    startRecording();

    return () => {
      cancelled = true;
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/30"
    >
      <div className="flex items-center gap-3">
        {/* Pulsing mic */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
            <Mic size={18} className="text-white" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            animate={{ opacity: [0.4, 0], scale: [1, 1.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            Je vous écoute...
          </p>
          <p className="text-[10px] text-blue-500/70 dark:text-blue-400/50">
            Parlez en français, arabe ou anglais
          </p>
        </div>
        <button
          onClick={() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            onClose();
          }}
          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
        >
          Stop
        </button>
      </div>

      {/* Waveform animation */}
      <div className="flex items-end justify-center gap-0.5 mt-3 h-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full"
            animate={{ height: [4, 12 + Math.random() * 8, 6, 16, 8, 12, 4] }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.08,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
