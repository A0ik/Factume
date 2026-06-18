'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore } from '../documentSessionStore';
import { DOC_TYPE_CONFIGS } from '../config/documentTypeConfig';
import { toast } from 'sonner';

interface SmartTextBarProps {
  profile: any;
  isPro: boolean;
  onPaywall: () => void;
  className?: string;
}

/**
 * SmartTextBar — Minimal text input for AI invoice generation.
 * No chat, no message history. One input, one result.
 */
export default function SmartTextBar({ profile, isPro, onPaywall, className }: SmartTextBarProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    documentType,
    isStreaming,
    items,
    applyAIParsedResult,
    setStreaming,
  } = useDocumentSessionStore();

  const config = DOC_TYPE_CONFIGS[documentType];

  const handleSubmit = useCallback(async () => {
    const prompt = text.trim();
    if (!prompt || isStreaming) return;

    if (!isPro) {
      onPaywall();
      return;
    }

    setText('');
    setStreaming(true);

    try {
      const hasContent = items.some(i => i.description || i.unit_price > 0);
      // LOI 3 (Arbiter) — on envoie l'état COMPLET du document (pas seulement les lignes)
      // pour que l'IA modifie au lieu de recréer.
      const s = useDocumentSessionStore.getState();
      const formContext = {
        document_type: s.documentType,
        client_name: s.clientName || null,
        client_email: s.clientEmail || null,
        client_phone: s.clientPhone || null,
        client_address: s.clientAddress || null,
        client_city: s.clientCity || null,
        client_postal_code: s.clientPostalCode || null,
        client_siret: s.clientSiret || null,
        client_vat_number: s.clientVatNumber || null,
        items: s.items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, vat_rate: i.vat_rate })),
        notes: s.notes || null,
        discount_percent: s.discountPercent || null,
        due_days: s.paymentDays,
        issue_date: s.issueDate || null,
      };
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hasContent ? `MODIFICATION DE ${config.aiPromptPrefix}:\n${prompt}` : prompt,
          sector: profile?.sector,
          isEdit: hasContent,
          existingItems: hasContent ? items : undefined,
          document_type: documentType,
          formContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur IA');

      applyAIParsedResult(data.parsed, 'ai');
    } catch (err: any) {
      console.error('[SmartTextBar] Error:', err.message);
      toast.error('Erreur lors de l\'analyse. Veuillez réessayer.');
    } finally {
      setStreaming(false);
    }
  }, [text, isStreaming, isPro, items, documentType, profile, config, applyAIParsedResult, setStreaming, onPaywall]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* AI sparkle indicator */}
      {/* FLAW 4 FIX: Subtle sparkle — SmartTextBar is the ALTERNATIVE, not the primary */}
      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex-shrink-0">
        {isStreaming ? (
          <Loader2 size={12} className="text-blue-500 animate-spin" />
        ) : (
          <Sparkles size={11} className="text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isStreaming
            ? 'Traitement en cours...'
            : 'Ou tapez votre description...'
        }
        disabled={isStreaming}
        className={cn(
          'flex-1 px-3 py-2 rounded-xl border text-sm transition-all',
          'bg-gray-50 dark:bg-white/[0.04]',
          'border-gray-200 dark:border-white/[0.08]',
          'text-gray-900 dark:text-white',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 dark:focus:border-emerald-500',
          isStreaming && 'opacity-60 cursor-not-allowed',
        )}
      />

      {/* Send button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        disabled={!text.trim() || isStreaming}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0',
          text.trim() && !isStreaming
            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/15'
            : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 cursor-not-allowed',
        )}
      >
        {isStreaming ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Send size={15} />
        )}
      </motion.button>
    </div>
  );
}
