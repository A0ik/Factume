'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Loader2, RefreshCw, Mail } from 'lucide-react';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SectionCard, EmptyState } from '@/components/cabinet/ui';

interface Msg {
  id: string;
  author_role: 'cabinet' | 'client';
  body: string;
  created_at: string;
}

const fmtTime = (d: string) => {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' · ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function CabinetMessageriePage() {
  const { clients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const [clientId, setClientId] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  // PROMÉTHÉE (S1) — role-aware : un client lié ne voit QUE son fil (vue portail).
  const [isStaffView, setIsStaffView] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase')).getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/cabinet/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json();
        if (json?.isClient && json.clientId) {
          setIsStaffView(false);
          setClientId(json.clientId);
        }
      } catch { /* staff par défaut */ }
    })();
  }, []);

  const clientLabel = (id: string) => {
    const c: any = (clients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? (c.company_name || 'Client') : (c.profile?.company_name || c.profile?.first_name || 'Client');
  };
  const clientEmail = (id: string) => {
    const c: any = (clients as any[]).find((cl) => cl.id === id);
    return c?.contact_email || c?.profile?.email || null;
  };

  const loadThread = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingThread(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/cabinet/messages?client_id=${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setMessages(json.messages || []);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    if (isStaffView && !clientId && clients.length) {
      const first = (clients as any[])[0];
      if (first) setClientId(first.id);
    }
  }, [clients, clientId, isStaffView]);

  useEffect(() => {
    if (clientId) loadThread(clientId);
    // Rafraîchissement léger toutes les 20s pour capter les réponses client.
    const t = setInterval(() => { if (clientId) loadThread(clientId); }, 20_000);
    return () => clearInterval(t);
  }, [clientId, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loadingThread]);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || !clientId || sending) return;
    setSending(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }
      const res = await fetch('/api/cabinet/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ client_id: clientId, body: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Échec');
      setMessages((m) => [...m, json.message]);
      setBody('');
      const email = clientEmail(clientId);
      toast.success(email ? `Message envoyé (notififié à ${email})` : 'Message envoyé');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Sélecteur client (caché en vue portail client) */}
      {isStaffView && (
      <SectionCard title="Messagerie" icon={MessageSquare} accent={primaryColor}>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Sélectionner un client…</option>
              {(clients as any[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}
                </option>
              ))}
            </select>
          </div>
          {clientId && clientEmail(clientId) && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 pb-2">
              <Mail size={12} /> {clientEmail(clientId)}
            </p>
          )}
        </div>
      </SectionCard>
      )}

      {/* Fil de discussion */}
      {!clientId ? (
        <EmptyState icon={MessageSquare} title="Aucune conversation" description="Sélectionnez un client pour ouvrir la discussion." />
      ) : (
        <SectionCard title={isStaffView ? clientLabel(clientId) : 'Votre cabinet'} icon={MessageSquare} accent={primaryColor}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">Discussion contextuelle avec votre client</p>
            <button onClick={() => loadThread(clientId)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Actualiser">
              <RefreshCw size={14} className={loadingThread ? 'animate-spin' : ''} />
            </button>
          </div>

          <div ref={scrollRef} className="h-[44vh] min-h-[280px] overflow-y-auto space-y-3 pr-1">
            {loadingThread && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-gray-300" size={24} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400 text-center px-6">
                {isStaffView
                  ? 'Aucun message pour l\'instant. Démarrez la conversation — votre client sera notifié par email.'
                  : 'Aucun message. Posez votre question à votre cabinet, ils seront notifiés.'}
              </div>
            ) : (
              messages.map((m) => {
                const mine = isStaffView ? m.author_role === 'cabinet' : m.author_role === 'client';
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm',
                      mine
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm',
                    )}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={cn('text-[10px] mt-1', mine ? 'text-emerald-100' : 'text-gray-400')}>{fmtTime(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <div className="mt-3 flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Écrivez un message…"
              className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-h-32"
            />
            <button
              onClick={send}
              disabled={!body.trim() || sending}
              className="h-11 w-11 shrink-0 rounded-xl text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: primaryColor }}
              title="Envoyer"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
}
