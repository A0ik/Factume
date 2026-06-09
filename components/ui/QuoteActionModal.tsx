'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Pen, Send, FileText } from 'lucide-react';
import { Invoice } from '@/types';
import { cn } from '@/lib/utils';

interface QuoteActionModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSendEmail: () => void;
  onRequestSignature: (email: string) => void;
}

export default function QuoteActionModal({
  invoice,
  isOpen,
  onClose,
  onSendEmail,
  onRequestSignature,
}: QuoteActionModalProps) {
  const [selected, setSelected] = useState<'email' | 'signature' | null>(null);
  const [email, setEmail] = useState(invoice.client?.email || '');
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (action: 'email' | 'signature') => {
    setSelected(action);
  };

  const handleConfirm = () => {
    if (!selected) return;

    if (selected === 'email') {
      onSendEmail();
    } else if (selected === 'signature') {
      onRequestSignature(email.trim());
    }
    onClose();
    setSelected(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Envoyer ce devis ?
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Devis {invoice.number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Choisissez comment vous souhaitez envoyer ce devis à votre client
          </p>

          {/* Email option */}
          <button
            onClick={() => handleSelect('email')}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group',
              selected === 'email'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
              selected === 'email'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40'
            )}>
              <Mail size={22} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white">Envoyer par email</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Envoyer le devis en PDF par email au client
              </p>
            </div>
            {selected === 'email' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Send size={12} className="text-white" />
              </div>
            )}
          </button>

          {/* Signature option */}
          <button
            onClick={() => handleSelect('signature')}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group',
              selected === 'signature'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
              selected === 'signature'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40'
            )}>
              <Pen size={22} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 dark:text-white">Demander la signature</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Générer un lien pour que le client signe électroniquement
              </p>
            </div>
            {selected === 'signature' && (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Pen size={12} className="text-white" />
              </div>
            )}
          </button>

          {/* Email input field - only show when signature is selected */}
          {selected === 'signature' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Adresse e-mail du client
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@exemple.com"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          {selected ? (
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected === 'signature' && !email.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
