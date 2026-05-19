'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Mail, RefreshCw, Minus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

function linkifyContent(content: string): React.ReactNode {
  const parts = content.split(/(contact@factu\.me|[\w.-]+@[\w.-]+\.\w+)/g);
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

function renderAssistantContent(content: string): React.ReactNode {
  // Split into lines and process markdown-like formatting
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 my-1 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const formatInline = (text: string): React.ReactNode[] => {
    // Process **bold** and *italic*
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={parts.length}>{text.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<strong key={parts.length}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={parts.length}>{text.slice(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : [text];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet list items: - item or * item
    const listMatch = line.match(/^[\s]*[-*]\s+(.*)$/);
    if (listMatch) {
      inList = true;
      listItems.push(
        <li key={`li-${i}`} className="text-sm">
          {linkifyAndFormat(listMatch[1])}
        </li>
      );
      continue;
    }

    // If we were in a list and hit a non-list line, flush it
    if (inList) {
      flushList();
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Regular line
    elements.push(
      <span key={`line-${i}`} className="block">
        {linkifyAndFormat(line)}
      </span>
    );
  }

  // Flush remaining list
  flushList();

  return <>{elements}</>;

  function linkifyAndFormat(text: string): React.ReactNode[] {
    // First apply inline formatting, then linkify emails
    const inlineFormatted = formatInline(text);
    return inlineFormatted.map((node, idx) => {
      if (typeof node === 'string') {
        return <span key={idx}>{linkifyContent(node)}</span>;
      }
      // For React elements (like <strong>), check their children for emails
      return <span key={idx}>{node}</span>;
    });
  }
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

function getErrorMessage(status: number | null, errorName?: string): string {
  if (errorName === 'AbortError') return '';
  if (status === 429) return 'Trop de requêtes ! Réessaie dans quelques secondes.';
  if (status === 503) return 'Le service est temporairement indisponible. Réessaie dans un instant.';
  if (status === 408) return "L'assistant met trop de temps à répondre. Réessaie.";
  if (!status) return 'Problème de connexion. Vérifie ton internet et réessaie.';
  return 'Désolé, une erreur est survenue. Réessaie ou contacte contact@factu.me.';
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: 'assistant',
      content:
        "Salut ! 👋 Je suis l'assistant Factu.me. Comment puis-je t'aider ?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showHiddenTooltip, setShowHiddenTooltip] = useState(false);
  const [lastFailedMessages, setLastFailedMessages] = useState<{ role: string; content: string }[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1500);
    // Restore hidden state from localStorage (auto-expire after 24h)
    try {
      const stored = localStorage.getItem('chat-widget-hidden');
      const hiddenAt = localStorage.getItem('chat-widget-hidden-at');
      if (stored === 'true') {
        if (hiddenAt && Date.now() - parseInt(hiddenAt, 10) > 24 * 60 * 60 * 1000) {
          // Expired — show widget again
          localStorage.removeItem('chat-widget-hidden');
          localStorage.removeItem('chat-widget-hidden-at');
        } else {
          setIsHidden(true);
        }
      }
    } catch {}
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

  // Show tooltip on hidden indicator after 5 minutes
  useEffect(() => {
    if (!isHidden) return;
    const timer = setTimeout(() => setShowHiddenTooltip(true), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [isHidden]);

  const doFetch = useCallback(async (apiMessages: { role: string; content: string }[], assistantId: string) => {
    const response = await fetch('/api/chat/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
      signal: abortRef.current?.signal,
    });

    if (!response.ok) {
      const err: any = new Error('API error');
      err.status = response.status;
      throw err;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream');

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

    return accumulated;
  }, []);

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
    setLastFailedMessages(null);

    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      abortRef.current = new AbortController();
      await doFetch(apiMessages, assistantId);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setIsStreaming(false);
        abortRef.current = null;
        return;
      }

      // Retry once with a new controller
      try {
        abortRef.current = new AbortController();
        await doFetch(apiMessages, assistantId);
      } catch (retryError: any) {
        if (retryError.name === 'AbortError') {
          setIsStreaming(false);
          abortRef.current = null;
          return;
        }

        const errorMsg = getErrorMessage(retryError.status || error.status, retryError.name);
        if (!errorMsg) {
          setIsStreaming(false);
          abortRef.current = null;
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errorMsg, isError: true }
              : m
          ) as any
        );
        setLastFailedMessages(apiMessages);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, isStreaming, doFetch]);

  const handleRetry = useCallback(() => {
    if (!lastFailedMessages) return;

    // Remove the error message
    setMessages((prev) => prev.slice(0, -1));
    setLastFailedMessages(null);

    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setIsStreaming(true);

    (async () => {
      try {
        abortRef.current = new AbortController();
        await doFetch(lastFailedMessages, assistantId);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          setIsStreaming(false);
          return;
        }
        const errorMsg = getErrorMessage(error.status, error.name);
        if (!errorMsg) {
          setIsStreaming(false);
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errorMsg }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    })();
  }, [lastFailedMessages, doFetch]);

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

  const handleHide = useCallback(() => {
    setIsHidden(true);
    setIsOpen(false);
    try {
      localStorage.setItem('chat-widget-hidden', 'true');
      localStorage.setItem('chat-widget-hidden-at', Date.now().toString());
    } catch {}
  }, []);

  const handleUnhide = useCallback(() => {
    setIsHidden(false);
    setShowHiddenTooltip(false);
    try { localStorage.setItem('chat-widget-hidden', 'false'); } catch {}
  }, []);

  if (!isVisible) return null;

  // Hidden indicator — small floating button in bottom-left
  if (isHidden) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 left-4 z-40"
      >
        <button
          onClick={handleUnhide}
          className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 shadow-lg hover:bg-primary hover:shadow-xl transition-all cursor-pointer"
          aria-label="Réafficher l'assistant"
        >
          <MessageCircle className="h-4 w-4 text-white" />
          {showHiddenTooltip && (
            <span className="absolute left-12 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Besoin d&apos;aide ?
            </span>
          )}
        </button>
      </motion.div>
    );
  }

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
                    {isStreaming ? 'En train d\'écrire...' : 'En ligne'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                  aria-label="Minimiser le chat"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <button
                  onClick={handleHide}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                  aria-label="Masquer le chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isError = (message as any).isError;
                return (
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
                      {message.role === 'assistant' ? renderAssistantContent(message.content || ' ') : (message.content || ' ')}
                      {isError && lastFailedMessages && (
                        <button
                          onClick={handleRetry}
                          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Réessayer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isStreaming &&
                messages[messages.length - 1]?.content === '' && (
                  <TypingIndicator />
                )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-background p-3">
              <a
                href="mailto:contact@factu.me"
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
                L'assistant peut faire des erreurs. Vérifie les informations importantes.
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
