'use client';

// ─────────────────────────────────────────────────────────────────────────────
// HEPHAISTOS — CIBLE 4 : Copilot Factu (FAB vocal/textuel, plan Business).
// Bouton flottant → modal → POST /api/copilot/command → rendu polymorphe.
// Auto-gating : ne s'affiche que si canUseCopilot (plan.gates.copilotFactu).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mic, MicOff, X, Send, Loader2,
  Receipt, TrendingUp, Calculator, Wallet, Mail, ArrowRight, FilePlus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { getSupabaseClient } from '@/lib/supabase';
import { useDataStore } from '@/stores/dataStore';
import { useRelanceGuard } from '@/components/invoices/RelanceGuard';
import { useGroqVoiceRecorder } from './useGroqVoiceRecorder';

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
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// ZÉNITH (CIBLE 3) — Carte FORMULAIRE inline proactively émise par l'IA. L'utilisateur
// remplit les champs ; on substitue les tokens {field_id} dans submitCommand et on
// renvoie la commande au Copilot, qui l'exécute via sa boucle d'outils. Pas de redirection.
function FormCard({ result, onSubmit }: { result: CopilotResult; onSubmit: (command: string) => void }) {
  const fields: any[] = Array.isArray(result.fields) ? result.fields : [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const missing = fields.some((f) => f.required && !String(values[f.id] || '').trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (missing || submitting) return;
    setSubmitting(true);
    let cmd: string = String(result.submitCommand || '');
    for (const f of fields) {
      const val = String(values[f.id] || '').trim();
      cmd = cmd.split(`{${f.id}}`).join(val);
    }
    cmd = cmd.replace(/\{[a-zA-Z0-9_]+\}/g, '').replace(/\s+/g, ' ').trim(); // tokens non remplis retirés
    await onSubmit(cmd);
    setSubmitting(false);
  };

  if (fields.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {result.title && <p className="text-sm font-bold text-foreground">{result.title}</p>}
      {result.message && <p className="text-xs text-muted-foreground">{result.message}</p>}
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {f.label}{f.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type={f.type || 'text'}
              value={values[f.id] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              placeholder={f.placeholder || ''}
              className="w-full rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={missing || submitting}
        className="inline-flex items-center gap-1.5 rounded-control bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        {result.cta || 'Valider'}
      </button>
    </form>
  );
}

// ── Rendu polymorphe des réponses de l'API ──────────────────────────────────
function ResultCard({ result, onNavigate, onSendReminder, onSubmitForm, sendingReminderId }: {
  result: CopilotResult;
  onNavigate?: () => void;
  onSendReminder?: (invoiceId: string) => void;
  onSubmitForm?: (command: string) => void;
  sendingReminderId?: string | null;
}) {
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
            <div key={i} className={cn('rounded-xl border p-3', d.missingEmail ? 'border-amber-500/50 bg-amber-500/10' : 'border-amber-500/30 bg-amber-500/5')}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{d.clientName} · {fmtEur(d.amount)}</p>
                {d.daysOverdue > 0 && <span className="text-[11px] font-bold text-amber-600">+{d.daysOverdue}j</span>}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{d.subject}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{d.body}</p>
              {d.missingEmail ? (
                <p className="mt-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400">⚠️ Aucun email pour ce client — cliquez pour l&apos;enregistrer comme à relancer, puis ajoutez son email.</p>
              ) : (
                <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">⚠️ Vérifiez le brouillon avant l&apos;envoi.</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendReminder?.(d.invoiceId)}
                  disabled={sendingReminderId === d.invoiceId}
                  className="inline-flex items-center gap-1.5 rounded-control bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {sendingReminderId === d.invoiceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {d.missingEmail ? 'Marquer à relancer' : 'Envoyer la relance'}
                </button>
                <Link
                  href={`/invoices/${d.invoiceId}`}
                  onClick={onNavigate}
                  className="inline-flex items-center gap-1 rounded-control border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  Voir la facture
                </Link>
              </div>
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
    case 'form':
      // ZÉNITH (CIBLE 3) — formulaire inline proactif émis par l'IA.
      return <FormCard result={result} onSubmit={(cmd) => onSubmitForm?.(cmd)} />;
    default:
      return <p className="text-sm text-muted-foreground">{result.message || 'Commande traitée.'}</p>;
  }
}

// PROMÉTHÉE (S2) — Parser SSE léger pour le streaming Copilot.
function parseSSE(raw: string): { name: string; data: any } | null {
  let name = 'message';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try { return { name, data: JSON.parse(dataLines.join('\n')) }; }
  catch { return null; }
}

export default function CopilotFAB() {
  const { canUseCopilot } = useSubscription();
  const { invoices } = useDataStore();
  const { ensureCanSend, modal: relanceGuardModal } = useRelanceGuard();
  // Ref miroir des invoices pour éviter une closure périmée dans handleSendReminder (deps []).
  const invoicesRef = useRef(invoices);
  invoicesRef.current = invoices;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nudges, setNudges] = useState<Array<{ id: string; kind: string; severity: string; title: string; description: string; cta: string }>>([]);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);
  // PROMÉTHÉE (CIBLE 1A) — refs miroirs pour des handlers vocaux sans closure périmée.
  const loadingRef = useRef(false);
  loadingRef.current = loading;
  const listeningRef = useRef(false);
  const wantListeningRef = useRef(false); // keep-alive : l'utilisateur maintient le micro
  const pendingTranscriptRef = useRef<string | null>(null); // transcript mis en file si l'IA traite déjà
  const [micDenied, setMicDenied] = useState(false);

  // ── CIBLE 1 : Drag-and-drop Pointer Events (souris PC + doigt mobile) + persistance ──
  // La position est sauvegardée (localStorage instantané + Supabase copilot_preferences
  // cross-device, debounced). Le bouton ne chevauche jamais la navbar (zones sûres).
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const dragMovedRef = useRef(false);
  const fabSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cache local d'abord (instantané), sinon charge la position serveur (cross-device).
    try {
      const saved = localStorage.getItem('copilot-fab-pos');
      if (saved) { setFabPos(JSON.parse(saved)); return; }
    } catch {}
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('copilot_preferences').select('fab_position').eq('user_id', user.id).maybeSingle();
        if (data?.fab_position) {
          setFabPos(data.fab_position);
          try { localStorage.setItem('copilot-fab-pos', JSON.stringify(data.fab_position)); } catch {}
        }
      } catch {}
    })();
  }, []);

  const persistFabPos = useCallback((p: { x: number; y: number }) => {
    try { localStorage.setItem('copilot-fab-pos', JSON.stringify(p)); } catch {}
    if (fabSaveTimer.current) clearTimeout(fabSaveTimer.current);
    fabSaveTimer.current = setTimeout(async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('copilot_preferences').upsert({ user_id: user.id, fab_position: p }, { onConflict: 'user_id' });
      } catch {}
    }, 1000);
  }, []);

  const onFabPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false };
    dragMovedRef.current = false;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onFabPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.abs(dx) <= 5 && Math.abs(dy) <= 5) return; // seuil drag vs clic
    ds.moved = true;
    dragMovedRef.current = true;
    const btnW = 56, btnH = 56, margin = 8, topMin = 80; // topMin évite la navbar haute
    const tabH = window.innerWidth < 1024 ? 64 : 0; // ASTRÉE — réserve la BottomTabBar sur mobile
    const maxX = window.innerWidth - btnW - margin;
    const maxY = window.innerHeight - btnH - margin - tabH; // évite la BottomTabBar
    setFabPos({ x: Math.max(margin, Math.min(maxX, ds.origX + dx)), y: Math.max(topMin, Math.min(maxY, ds.origY + dy)) });
  };
  const onFabPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const ds = dragStateRef.current;
    dragStateRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (ds?.moved && fabPos) persistFabPos(fabPos);
  };
  const onFabClick = () => {
    if (dragMovedRef.current) { dragMovedRef.current = false; return; } // suppression du clic après drag
    setOpen(true);
  };

  // ── CIBLE 1 : Mémoire de session (survit au refresh, cross-device) ──
  const sessionIdRef = useRef<string | null>(null);
  const sessionLoadedRef = useRef(false);
  useEffect(() => {
    if (!open || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        let sid = localStorage.getItem('copilot-session-id');
        if (!sid) {
          const { data: last } = await supabase.from('copilot_conversations')
            .select('session_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          sid = last?.session_id || null;
        }
        if (!sid) return;
        sessionIdRef.current = sid;
        const { data: msgs } = await supabase.from('copilot_conversations')
          .select('role, content').eq('user_id', user.id).eq('session_id', sid)
          .order('created_at', { ascending: true }).limit(12);
        if (msgs && msgs.length) {
          setMessages(msgs
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({ id: ++msgId.current, role: m.role as 'user' | 'assistant', text: String(m.content) })));
        }
      } catch {}
      // CIBLE 1d — Copilot proactif : récupère les nudges (impayés, récurrentes).
      try {
        const r = await fetch('/api/copilot/proactive');
        if (r.ok) { const d = await r.json(); setNudges(d.nudges || []); }
      } catch {}
    })();
  }, [open]);

  // Repli non-streaming (si le SSE échoue ou n'est pas supporté).
  const postJsonAndAppend = useCallback(async (trimmed: string, history: any[]) => {
    try {
      const res = await fetch('/api/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, history, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();
      if (data?.sessionId) {
        sessionIdRef.current = data.sessionId;
        try { localStorage.setItem('copilot-session-id', data.sessionId); } catch {}
      }
      if (!res.ok) {
        const errMsg = data?.code === 'PLAN_REQUIRED'
          ? 'Votre plan ne donne pas accès au Copilot Factu.'
          : data?.error || 'Erreur lors du traitement.';
        setMessages((m) => [...m, { id: ++msgId.current, role: 'assistant', text: errMsg, error: true }]);
        return;
      }
      const fallbackText = data.answer || data.result?.message || 'Voici ce que j\'ai trouvé.';
      setMessages((m) => [...m, { id: ++msgId.current, role: 'assistant', text: fallbackText, result: data.result }]);
    } catch {
      setMessages((m) => [...m, { id: ++msgId.current, role: 'assistant', text: 'Connexion impossible. Réessayez.', error: true }]);
    }
  }, []);

  const sendCommand = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    setMessages((m) => [...m, { id: ++msgId.current, role: 'user', text: trimmed }]);
    setLoading(true);

    // Mémoire conversationnelle : derniers échanges (texte seul) pour le suivi.
    const history = messages
      .filter((mm) => !mm.error)
      .slice(-6)
      .map((mm) => ({ role: mm.role, content: mm.text }));

    // PROMÉTHÉE (S2) — streaming SSE : on crée un message assistant vide mis à jour
    // au fil des deltas, puis on l'enrichit avec la carte au done.
    const assistantId = ++msgId.current;
    setMessages((m) => [...m, { id: assistantId, role: 'assistant', text: '' }]);
    try {
      const res = await fetch('/api/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, history, sessionId: sessionIdRef.current, stream: true }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !res.body || !ct.includes('text/event-stream')) {
        throw new Error('no-stream');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answerText = '';
      let doneData: any = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) >= 0) {
          const evt = parseSSE(buffer.slice(0, sep));
          buffer = buffer.slice(sep + 2);
          if (!evt) continue;
          if (evt.name === 'meta' && evt.data?.sessionId) {
            sessionIdRef.current = evt.data.sessionId;
            try { localStorage.setItem('copilot-session-id', evt.data.sessionId); } catch {}
          } else if (evt.name === 'delta') {
            answerText += evt.data?.text || '';
            setMessages((m) => m.map((mm) => (mm.id === assistantId ? { ...mm, text: answerText } : mm)));
          } else if (evt.name === 'done') {
            doneData = evt.data;
          } else if (evt.name === 'error') {
            throw new Error(evt.data?.message || 'Service IA indisponible');
          }
        }
      }
      if (doneData) {
        if (doneData.sessionId) {
          sessionIdRef.current = doneData.sessionId;
          try { localStorage.setItem('copilot-session-id', doneData.sessionId); } catch {}
        }
        setMessages((m) => m.map((mm) => (mm.id === assistantId ? {
          ...mm,
          text: doneData.answer || answerText || doneData.result?.message || 'Voici ce que j\'ai trouvé.',
          result: doneData.result,
        } : mm)));
      } else if (!answerText.trim()) {
        throw new Error('empty');
      }
    } catch {
      // Repli JSON : on retire le placeholder streamé puis on tente le chemin classique.
      setMessages((m) => m.filter((mm) => mm.id !== assistantId));
      await postJsonAndAppend(trimmed, history);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, postJsonAndAppend]);

  // ATHÉNA — envoie VRAIMENT la relance depuis le brouillon du Copilot. Avant, le
  // brouillon était un dead-end (aucun bouton). Route /api/reminders/send avec
  // confirmed:true (l'humain dispose). Gère le cas pendingEmail (client sans email).
  const handleSendReminder = useCallback(async (invoiceId: string) => {
    // ZÉNITH (CIBLE 1) — garde unifiée BLOQUANTE : no-client → modal bloquant,
    // missing-email → saisie + persistance clients.email. Fini l'envoi fantôme.
    const inv: any = invoicesRef.current.find((i: any) => i.id === invoiceId);
    if (!inv) { toast.error('Facture introuvable.'); return; }
    const canSend = await ensureCanSend([inv]);
    if (!canSend) return; // bloqué ou annulé
    setSendingReminderId(invoiceId);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Session expirée. Reconnectez-vous.'); return; }
      const res = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoiceId, reminderLevel: 1, confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || "Échec de l'envoi de la relance."); return; }
      if (data.pendingEmail) {
        toast.warning('Relance enregistrée — email du client manquant. Ajoutez-le puis relancez.');
      } else {
        toast.success(`Relance envoyée${data.emailTo ? ` à ${data.emailTo}` : ''}.`);
      }
    } catch {
      toast.error("Erreur lors de l'envoi de la relance.");
    } finally {
      setSendingReminderId(null);
    }
  }, [ensureCanSend]);

  // Ref pour éviter une closure périmée dans le handler vocal (déclaré après sendCommand)
  const sendCommandRef = useRef(sendCommand);
  sendCommandRef.current = sendCommand;

  // PROMÉTHÉE (S3) — Recorder Groq Whisper = chemin PRIMAIRE du micro (multi-navigateur,
  // robuste). La Web Speech API (ci-dessous) sert de repli si MediaRecorder est absent.
  const groqVoice = useGroqVoiceRecorder({
    onTranscript: (text) => {
      setInput(text);
      if (loadingRef.current) pendingTranscriptRef.current = text;
      else sendCommandRef.current(text);
    },
  });
  const useGroqVoice = groqVoice.supported;

  // Surface les erreurs du recorder Groq en toast.
  useEffect(() => {
    if (groqVoice.error) toast.error(groqVoice.error);
  }, [groqVoice.error]);

  // ── Reconnaissance vocale (Web Speech API) — rebuild robuste PROMÉTHÉE ──
  // Cause racine PROUVÉE du « micro cassé » : (1) aucun check isSecureContext → la
  // Web Speech API exige HTTPS, rec.start() échouait en silence ; (2) garde fatale
  // `if (loading) return` dans sendCommand → le transcript vocal était DROPPÉ quand
  // l'IA traitait déjà ; (3) continuous:false coupait au 1er silence sans redémarrage ;
  // (4) rec.start() jette InvalidStateError avalé ; (5) instance jamais recréée après
  // erreur. Tout cela est corrigé ci-dessous.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || typeof window === 'undefined' || !window.isSecureContext) {
      setSupported(false);
    }
  }, []);

  const stopRecognition = useCallback(() => {
    wantListeningRef.current = false;
    listeningRef.current = false;
    setListening(false);
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) { try { rec.stop(); } catch { /* noop */ } }
  }, []);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || typeof window === 'undefined' || !window.isSecureContext) {
      setSupported(false);
      toast.error('Reconnaissance vocale indisponible — nécessite Chrome ou Edge en HTTPS.');
      return;
    }
    // Instance fraîche à chaque démarrage : évite l'instance « morte » après une erreur.
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true; // autorise les pauses ; le keep-alive (onend) maintient le micro
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        finalText = finalText.trim();
        if (finalText) setInput(finalText);
        wantListeningRef.current = false; // phrase finale reçue → pas de keep-alive
        try { rec.stop(); } catch { /* noop */ }
        // PROMÉTHÉE — ne DROP PLUS le transcript si l'IA est en cours : on le met en file,
        // il sera envoyé dès que loading repasse à false (useEffect ci-dessous).
        if (loadingRef.current) {
          pendingTranscriptRef.current = finalText;
        } else {
          sendCommandRef.current(finalText);
        }
      } else if (interim) {
        setInput(interim); // feedback live pendant la parole
      }
    };

    rec.onend = () => {
      if (rec !== recognitionRef.current) return; // instance périmée
      // Keep-alive : tant que l'utilisateur veut écouter, on relance (la Web Speech API
      // s'arroute automatiquement après un silence ; ce restart maintient le micro actif).
      if (wantListeningRef.current) {
        try { rec.start(); return; } catch { /* retombé ci-dessous */ }
      }
      listeningRef.current = false;
      setListening(false);
    };

    rec.onerror = (e: any) => {
      console.warn('[copilot/voice] SpeechRecognition error:', e?.error);
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setMicDenied(true);
        wantListeningRef.current = false;
        listeningRef.current = false;
        setListening(false);
        toast.error('Microphone bloqué — cliquez sur le cadenas 📍 du navigateur et autorisez le micro.');
      } else if (e?.error === 'network' || e?.error === 'audio-capture') {
        wantListeningRef.current = false;
        listeningRef.current = false;
        setListening(false);
        toast.error('Reconnaissance vocale indisponible (micro ou connexion).');
      } else if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        toast.error('Reconnaissance vocale indisponible.');
      }
      // no-speech / aborted : silencieux ; le keep-alive (onend) relancera si besoin.
    };

    recognitionRef.current = rec;
    wantListeningRef.current = true;
    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
      setMicDenied(false);
    } catch (err) {
      // InvalidStateError : la session précédente n'était pas terminée — on nettoie.
      console.warn('[copilot/voice] start() threw:', (err as any)?.message);
      try { rec.abort(); } catch { /* noop */ }
    }
  }, []);

  // Consomme le transcript mis en file dès que l'IA a fini de traiter la commande précédente.
  useEffect(() => {
    if (!loading && pendingTranscriptRef.current) {
      const pending = pendingTranscriptRef.current;
      pendingTranscriptRef.current = null;
      sendCommandRef.current(pending);
    }
  }, [loading]);

  // Cleanup au démontage : libère le micro.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
    };
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

  const toggleMic = useCallback(async () => {
    // Pre-check permission commun (Groq + Web Speech).
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
        const perm = await (navigator as any).permissions.query({ name: 'microphone' });
        if (perm.state === 'denied') {
          setMicDenied(true);
          toast.error('Microphone bloqué — cliquez sur le cadenas 📍 du navigateur et autorisez le micro.');
          return;
        }
      }
    } catch { /* permissions API indispo : on laisse start() gérer */ }

    // PROMÉTHÉE (S3) — chemin PRIMAIRE Groq Whisper (multi-navigateur).
    if (useGroqVoice) {
      if (groqVoice.listening) { groqVoice.stop(); return; }
      setMicDenied(false);
      setInput('');
      await groqVoice.start();
      return;
    }
    // Repli Web Speech API.
    if (listeningRef.current) { stopRecognition(); return; }
    setMicDenied(false);
    setInput('');
    startRecognition();
  }, [useGroqVoice, groqVoice, startRecognition, stopRecognition]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendCommand(input);
  };

  // ── Auto-gating : Business uniquement (après tous les hooks) ──
  // Le micro est disponible si Groq (primaire) OU Web Speech (repli) est supporté.
  const voiceAvailable = useGroqVoice || supported;
  const isListening = useGroqVoice ? groqVoice.listening : listening;
  if (!canUseCopilot) return null;

  return (
    <>
      {/* ── Bouton flottant ── */}
      <motion.button
        onClick={onFabClick}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Ouvrir le Copilot Factu (glisser pour déplacer)"
        title="Glisser pour déplacer"
        style={fabPos ? { left: fabPos.x, top: fabPos.y, right: 'auto', bottom: 'auto' } : undefined}
        className={cn(
          'fixed z-40 flex h-14 w-14 touch-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 ring-1 ring-white/20',
          !fabPos && 'bottom-24 right-4 lg:bottom-6 lg:right-6',
        )}
      >
        <Sparkles size={24} className="drop-shadow" />
        <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-60 blur-md" />
        <motion.span
          className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50"
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        {nudges.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {nudges.length}
          </span>
        )}
      </motion.button>

      {relanceGuardModal}

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
                    {nudges.slice(0, 1).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => sendCommand(n.cta)}
                        className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-left transition hover:bg-emerald-500/15"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          ⚡ Suggestion proactive
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      </button>
                    ))}
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
                        {m.role === 'assistant' && m.result ? <ResultCard result={m.result} onNavigate={() => setOpen(false)} onSendReminder={handleSendReminder} onSubmitForm={(cmd) => sendCommand(cmd)} sendingReminderId={sendingReminderId} /> : m.text}
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
                {voiceAvailable ? (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={isListening ? 'Arrêter le micro' : 'Parler'}
                    title={micDenied ? 'Micro bloqué — cliquez sur le cadenas du navigateur.' : isListening ? 'Arrêter' : 'Parler'}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
                      isListening
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                        : micDenied
                          ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                    )}
                  >
                    {isListening ? (
                      <span className="relative">
                        <MicOff size={18} />
                        <span className="absolute -inset-2 -z-10 animate-ping rounded-full bg-red-500/40" />
                      </span>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                ) : (
                  // PROMÉTHÉE — au lieu de masquer le micro (l'utilisateur croyait le bouton absent),
                  // on l'affiche désactivé avec une explication claire.
                  <span
                    title="Reconnaissance vocale indisponible — utilisez un navigateur récent en HTTPS."
                    className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-muted text-muted-foreground opacity-50"
                  >
                    <MicOff size={18} />
                  </span>
                )}
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? (useGroqVoice ? 'Parlez, puis cliquez pour transcrire…' : 'Écoute en cours…') : 'Écrivez une commande…'}
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
