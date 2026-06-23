'use client';

// ─────────────────────────────────────────────────────────────────────────────
// HEPHAISTOS — CIBLE 4 : Copilot Factu (FAB vocal/textuel, plan Business).
// Bouton flottant → modal → POST /api/copilot/command → rendu polymorphe.
// Auto-gating : ne s'affiche que si canUseCopilot (plan.gates.copilotFactu).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mic, MicOff, X, Send, Loader2,
  Receipt, TrendingUp, Calculator, Wallet, Mail, ArrowRight, FilePlus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

interface CopilotResult {
  type: string;
  [key: string]: any;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  result?: CopilotResult;
  error?: boolean;
}

const SUGGESTIONS = [
  { icon: Receipt, label: 'Mes impayés', text: 'Combien me doit-on en ce moment ?' },
  { icon: TrendingUp, label: 'Mon CA du mois', text: "Quel est mon chiffre d'affaires ce mois-ci ?" },
  { icon: Calculator, label: 'Mes URSSAF', text: 'Quelles sont mes cotisations URSSAF du trimestre ?' },
  { icon: Wallet, label: 'Mes dépenses', text: 'Quelles sont mes dernières dépenses ?' },
  { icon: Mail, label: 'Relancer un client', text: 'Prépare une relance pour mon client en retard' },
];

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// ── Rendu polymorphe des réponses de l'API ──────────────────────────────────
function ResultCard({ result, onNavigate }: { result: CopilotResult; onNavigate?: () => void }) {
  switch (result.type) {
    case 'outstanding_invoices': {
      const overdueOnly = (result.invoices || []).filter((i: any) => i.status === 'overdue').length;
      return (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">En attente d'encaissement</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtEur(result.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.count} facture(s) non réglée(s){overdueOnly > 0 ? ` · ${overdueOnly} en retard` : ''}
          </p>
          {(result.invoices || []).slice(0, 5).map((inv: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{inv.client_name || 'Client'}</p>
                <p className="text-[11px] text-muted-foreground">N° {inv.number} · échéance {fmtDate(inv.due_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{fmtEur(inv.total)}</span>
                {inv.status === 'overdue' && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">RETARD</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'revenue':
      return (
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Chiffre d'affaires ({result.period === 'year' ? 'année' : result.period === 'quarter' ? 'trimestre' : 'mois'})
          </span>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{fmtEur(result.total)}</p>
          <p className="text-xs text-muted-foreground">{result.invoiceCount} facture(s) payée(s)</p>
        </div>
      );
    case 'urssaf':
      return (
        <div className="space-y-1">
          {result.message ? (
            <p className="text-sm text-muted-foreground">{result.message}</p>
          ) : (
            <>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Cotisations URSSAF · {result.quarter}</span>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{fmtEur(result.urssafDue)}</p>
              <p className="text-xs text-muted-foreground">CA trimestre {fmtEur(result.quarterRevenue)} · régime {result.regime}</p>
            </>
          )}
        </div>
      );
    case 'expenses': {
      return (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Dernières dépenses</span>
            <span className="text-2xl font-black text-foreground">{fmtEur(result.total)}</span>
          </div>
          {(result.expenses || []).slice(0, 5).map((exp: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{exp.vendor || 'Dépense'}</p>
                <p className="text-[11px] text-muted-foreground">{exp.category} · {fmtDate(exp.date)}</p>
              </div>
              <span className="text-sm font-bold">{fmtEur(exp.amount)}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'reminder_draft': {
      if (result.status === 'no_overdue') {
        return <p className="text-sm text-muted-foreground">{result.message}</p>;
      }
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.message}</p>
          {(result.drafts || []).map((d: any, i: number) => (
            <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{d.clientName} · {fmtEur(d.amount)}</p>
                {d.daysOverdue > 0 && <span className="text-[11px] font-bold text-amber-600">+{d.daysOverdue}j</span>}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{d.subject}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{d.body}</p>
              <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">⚠️ Brouillon — à vérifier & valider avant envoi.</p>
            </div>
          ))}
        </div>
      );
    }
    case 'create_invoice':
      return (
        <div className="space-y-3">
          <p className="text-sm text-foreground">{result.message}</p>
          {result.amount != null && result.amount > 0 && (
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtEur(result.amount)}</p>
          )}
          <Link
            href={result.redirectUrl || '/documents/create'}
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:-translate-y-0.5"
          >
            <FilePlus size={15} /> Ouvrir le créateur
          </Link>
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">{result.message || 'Commande traitée.'}</p>;
  }
}

export default function CopilotFAB() {
  const { canUseCopilot } = useSubscription();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  const sendCommand = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    const userMsg: Message = { id: ++msgId.current, role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      // PROMÉTHÉE — mémoire conversationnelle : on renvoie les derniers échanges
      // (texte uniquement, sans les cartes structurées) pour permettre les relances
      // et questions de suivi (« et pour Nathan ? »).
      const history = messages
        .filter((m) => !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch('/api/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.code === 'PLAN_REQUIRED'
          ? 'Votre plan ne donne pas accès au Copilot Factu.'
          : data?.error || 'Erreur lors du traitement.';
        setMessages((m) => [...m, { id: ++msgId.current, role: 'assistant', text: errMsg, error: true }]);
        return;
      }
      // La réponse naturelle de l'IA (answer) prime sur le message générique du résultat.
      const fallbackText = data.answer || data.result?.message || 'Voici ce que j\'ai trouvé.';
      setMessages((m) => [...m, {
        id: ++msgId.current,
        role: 'assistant',
        text: fallbackText,
        result: data.result,
      }]);
    } catch {
      setMessages((m) => [...m, { id: ++msgId.current, role: 'assistant', text: 'Connexion impossible. Réessayez.', error: true }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  // Ref pour éviter une closure périmée dans le handler vocal (déclaré après sendCommand)
  const sendCommandRef = useRef(sendCommand);
  sendCommandRef.current = sendCommand;

  // ── Reconnaissance vocale (SpeechRecognition API) ──
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      // PROMÉTHÉE — on affiche le transcript INTERMÉDIAIRE en direct dans le champ.
      // Avant, seul le résultat final remplissait l'input → le micro semblait cassé
      // (aucun feedback pendant la parole).
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        setInput(finalText);
        rec.stop();
        sendCommandRef.current(finalText); // envoi automatique du transcript final
      } else if (interim) {
        setInput(interim);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      // PROMÉTHÉE — guidage explicite selon la cause (permission vs indispo).
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Microphone bloqué — autorisez l\'accès au micro dans votre navigateur.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        toast.error('Reconnaissance vocale indisponible');
      }
    };
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch { /* noop */ } };
  }, []);

  // ── Auto-scroll bas de conversation ──
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ── PROMÉTHÉE : ouverture externe (carte dashboard "Assistant IA"). ──
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('copilot:open', handler);
    return () => window.removeEventListener('copilot:open', handler);
  }, []);

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); setListening(false); }
    else {
      setInput(''); // repartir d'un champ vide pour voir le transcript live
      try { rec.start(); setListening(true); } catch { /* déjà actif */ }
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendCommand(input);
  };

  // ── Auto-gating : Business uniquement (après tous les hooks) ──
  if (!canUseCopilot) return null;

  return (
    <>
      {/* ── Bouton flottant ── */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Ouvrir le Copilot Factu"
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 ring-1 ring-white/20"
      >
        <Sparkles size={24} className="drop-shadow" />
        <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-60 blur-md" />
        <motion.span
          className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50"
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:max-w-md sm:rounded-3xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Copilot Factu</p>
                    <p className="text-[11px] text-muted-foreground">IA vocale & textuelle</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conversation */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-muted/50 p-3.5">
                      <p className="text-sm text-foreground">
                        Posez une question ou parlez. Je peux interroger vos factures, votre CA, vos URSSAF, vos dépenses et préparer des relances.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</p>
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => sendCommand(s.text)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <s.icon size={15} />
                          </span>
                          <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
                          <ArrowRight size={14} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                          : m.error
                          ? 'border border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300'
                          : 'border border-border bg-muted/50 text-foreground',
                      )}>
                        {m.role === 'assistant' && m.result ? <ResultCard result={m.result} onNavigate={() => setOpen(false)} /> : m.text}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-3.5 py-2.5">
                      <Loader2 size={14} className="animate-spin text-emerald-600" />
                      <span className="text-sm text-muted-foreground">Analyse…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre de saisie */}
              <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border bg-background px-3 py-3">
                {supported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={listening ? 'Arrêter le micro' : 'Parler'}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
                      listening
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                        : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                    )}
                  >
                    {listening ? (
                      <span className="relative">
                        <MicOff size={18} />
                        <span className="absolute -inset-2 -z-10 animate-ping rounded-full bg-red-500/40" />
                      </span>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                )}
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? 'Écoute en cours…' : 'Écrivez une commande…'}
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Envoyer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white transition-all hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-40 disabled:hover:shadow-none"
                >
                  <Send size={17} />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
