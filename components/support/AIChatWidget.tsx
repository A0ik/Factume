'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

function linkifyContent(content: string): React.ReactNode {
  const parts = content.split(/(support@factu\.me|[\w.-]+@[\w.-]+\.\w+)/g);
  return parts.map((part, i) => {
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(part)) {
      return (
        <a key={i} href={`mailto:${part}`} className="underline text-primary hover:text-primary/80">
          {part}
        </a>
      );
    }
    return part;
  });
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        />
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: 'assistant',
      content:
        "Salut ! \u{0001F44B} Je suis l'assistant Factu.me. Comment puis-je t'aider ?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Delay showing widget until page is loaded
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      abortRef.current = new AbortController();

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Erreur réseau');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Pas de stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                const currentContent = accumulated;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: currentContent }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Désolé, une erreur est survenue. Réessaie dans un instant ou contacte support@factu.me.",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, isStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (abortRef.current) {
      abortRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl',
              'h-[min(600px,calc(100dvh-120px))] w-[calc(100dvw-2rem)] sm:h-[600px] sm:w-[400px]',
              'lg:w-[480px]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Assistant Factu.me</h3>
                  <p className="text-xs text-white/80">
                    {isStreaming ? 'En train d’écrire...' : 'En ligne'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                aria-label="Fermer le chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-tr-sm bg-primary text-white'
                        : 'rounded-tl-sm bg-muted text-foreground'
                    )}
                  >
                        {message.role === 'assistant' ? linkifyContent(message.content || ' ') : (message.content || ' ')}  
                  </div>
                </div>
              ))}

              {isStreaming &&
                messages[messages.length - 1]?.content === '' && (
                  <TypingIndicator />
                )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-background p-3">
              <a
                href="mailto:support@factu.me"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/20 py-1.5 text-[11px] text-muted-foreground/60 hover:text-primary hover:border-primary/30 transition-colors mb-2"
              >
                <Mail className="h-3 w-3" />
                Contacter le support par email
              </a>
              <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tape ta question..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                    isStreaming || !input.trim()
                      ? 'text-muted-foreground'
                      : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
                  )}
                  aria-label="Envoyer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
                L’assistant peut faire des erreurs. Vérifie les informations importantes.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'group relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all',
              'bg-gradient-to-br from-primary to-purple-600',
              'hover:shadow-xl hover:shadow-primary/30 active:scale-95'
            )}
            aria-label="Ouvrir le chat"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />

            <MessageCircle className="h-6 w-6 text-white" />

            {/* Tooltip */}
            <span
              className={cn(
                'absolute right-full mr-3 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-background',
                'opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none'
              )}
            >
              Besoin d&apos;aide ?
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
