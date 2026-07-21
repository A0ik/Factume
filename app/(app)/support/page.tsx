'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Ticket, Plus, ArrowLeft, Send, Loader2, Headphones,
  CheckCircle2, Clock, AlertCircle, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';

// ODIN (VÉRITÉ COMMERCIALE) — Système de tickets support (rend réel "Support prioritaire/dédié").
// Backend déjà existant (app/api/support/ticket) — cette page en est l'UI manquante.
// Règle : les utilisateurs Business passent en priorité 'high' (support prioritaire).

interface Ticket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}
interface Msg {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

const PRIORITY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100' },
  high: { label: 'Prioritaire', color: 'text-amber-700', bg: 'bg-amber-100' },
  normal: { label: 'Normal', color: 'text-blue-700', bg: 'bg-blue-100' },
  low: { label: 'Faible', color: 'text-gray-600', bg: 'bg-gray-100' },
};
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-emerald-600' },
  in_progress: { label: 'En cours', color: 'text-blue-600' },
  resolved: { label: 'Résolu', color: 'text-gray-500' },
  closed: { label: 'Fermé', color: 'text-gray-400' },
};

function fmtDate(iso?: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ticket: Ticket | null; messages: Msg[] }>({ ticket: null, messages: [] });
  const [loadingThread, setLoadingThread] = useState(false);

  // Formulaire nouveau ticket
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);

  // Réponse
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/ticket', { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setTickets(json.tickets || []);
    } catch (e: any) {
      toast.error(e?.message || 'Impossible de charger vos tickets');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadTickets();
    // Récupère le tier pour la priorité par défaut (Business = prioritaire).
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: prof } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
        setIsBusiness(prof?.subscription_tier === 'business');
      } catch {}
    })();
  }, [loadTickets]);

  const openTicket = useCallback(async (id: string) => {
    setSelectedId(id);
    setShowForm(false);
    setLoadingThread(true);
    setThread({ ticket: null, messages: [] });
    try {
      const res = await fetch(`/api/support/ticket/${id}`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setThread({ ticket: json.ticket, messages: json.messages || [] });
    } catch (e: any) {
      toast.error(e?.message || 'Impossible de charger ce ticket');
      setSelectedId(null);
    } finally {
      setLoadingThread(false);
    }
  }, [authHeaders]);

  const createTicket = useCallback(async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Le sujet et le message sont obligatoires');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          // Business = priorité "high" (support prioritaire promis). Autres = normal.
          priority: isBusiness ? 'high' : 'normal',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      toast.success('Ticket créé — notre équipe vous répond sous peu.');
      setSubject(''); setMessage(''); setShowForm(false);
      await loadTickets();
      if (json?.ticket?.id) openTicket(json.ticket.id);
    } catch (e: any) {
      toast.error(e?.message || 'Échec de la création');
    } finally {
      setCreating(false);
    }
  }, [subject, message, isBusiness, authHeaders, loadTickets, openTicket]);

  const sendReply = useCallback(async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/ticket/${selectedId}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ message: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setReply('');
      if (thread.ticket) openTicket(selectedId);
    } catch (e: any) {
      toast.error(e?.message || 'Échec de l\'envoi');
    } finally {
      setSending(false);
    }
  }, [selectedId, reply, authHeaders, thread.ticket, openTicket]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <Headphones size={14} /> SUPPORT
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Centre d'assistance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Une question, un bug, un besoin ? Ouvrez un ticket, on vous répond.
            {isBusiness && (
              <span className="ml-1 inline-flex items-center gap-1 font-semibold text-amber-600">
                <Sparkles size={12} /> Priorité Business active
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setSelectedId(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
        >
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">Sujet</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Je n'arrive pas à envoyer une facture"
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <label className="mt-3 block text-sm font-semibold text-gray-900 dark:text-white">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Décrivez votre demande en détail…"
            className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Priorité : <strong className={cn(PRIORITY_LABEL[isBusiness ? 'high' : 'normal']?.color)}>
                {PRIORITY_LABEL[isBusiness ? 'high' : 'normal']?.label}
              </strong>
            </span>
            <button
              onClick={createTicket}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer
            </button>
          </div>
        </div>
      )}

      {/* Détail d'un ticket */}
      {selectedId ? (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-emerald-600 dark:border-zinc-800">
            <ArrowLeft size={15} /> Retour à la liste
          </button>
          {loadingThread ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="animate-spin" /></div>
          ) : (
            <>
              <div className="border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  {thread.ticket && (() => {
                    const p = PRIORITY_LABEL[thread.ticket.priority] || PRIORITY_LABEL.normal;
                    const s = STATUS_LABEL[thread.ticket.status] || STATUS_LABEL.open;
                    return (
                      <>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', p.bg, p.color)}>{p.label}</span>
                        <span className={cn('text-[10px] font-bold uppercase', s.color)}>{s.label}</span>
                      </>
                    );
                  })()}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white">{thread.ticket?.subject}</h2>
                <p className="text-xs text-muted-foreground">Ouvert le {fmtDate(thread.ticket?.created_at)}</p>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.is_admin ? 'justify-start' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm',
                      m.is_admin
                        ? 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'bg-emerald-500 text-white'
                    )}>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                      <p className={cn('mt-1 text-[10px]', m.is_admin ? 'text-gray-400' : 'text-emerald-50')}>
                        {m.is_admin ? 'Support Factu.me' : 'Vous'} · {fmtDate(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {!thread.messages.length && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Aucun message.</p>
                )}
              </div>

              {thread.ticket?.status !== 'closed' && (
                <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-zinc-800">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !sending) sendReply(); }}
                    placeholder="Répondre…"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Liste des tickets */
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center dark:border-zinc-800">
              <Ticket className="mx-auto mb-2 text-gray-300" size={32} />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Aucun ticket pour le moment</p>
              <p className="text-xs text-muted-foreground">Ouvrez votre premier ticket via « Nouveau ticket ».</p>
            </div>
          ) : (
            tickets.map((t) => {
              const p = PRIORITY_LABEL[t.priority] || PRIORITY_LABEL.normal;
              const s = STATUS_LABEL[t.status] || STATUS_LABEL.open;
              return (
                <button
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left transition hover:border-emerald-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    <Ticket size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">Dernière activité {fmtDate(t.updated_at || t.created_at)}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', p.bg, p.color)}>{p.label}</span>
                    <span className={cn('text-[10px] font-bold uppercase', s.color)}>{s.label}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Besoin d'une réponse immédiate ? Consultez aussi la{' '}
        <Link href="/help" className="font-semibold text-emerald-600 hover:underline">FAQ</Link>.
      </p>
    </div>
  );
}
