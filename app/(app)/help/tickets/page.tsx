'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, ArrowLeft, MessageSquare, Clock, Send, Loader2,
  ChevronRight, AlertCircle, CheckCircle2, Circle, XCircle,
  RefreshCw, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface TicketData {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MessageData {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Circle }> = {
  open: { label: 'Ouvert', color: 'text-blue-600', bg: 'bg-blue-50', icon: Circle },
  in_progress: { label: 'En cours', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw },
  resolved: { label: 'Résolu', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  closed: { label: 'Fermé', color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-gray-500' },
  normal: { label: 'Normale', color: 'text-blue-600' },
  high: { label: 'Haute', color: 'text-orange-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TicketRow({ ticket, onClick, isSelected }: { ticket: TicketData; onClick: () => void; isSelected: boolean }) {
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.normal;
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group',
        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', status.bg)}>
        <StatusIcon size={16} className={cn(status.color, ticket.status === 'in_progress' && 'animate-spin')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm truncate transition-colors', isSelected ? 'text-primary' : 'text-gray-900 group-hover:text-primary')}>
          {ticket.subject}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[11px] font-semibold', status.color)}>{status.label}</span>
          <span className="text-gray-200">|</span>
          <span className={cn('text-[11px] font-medium', priority.color)}>{priority.label}</span>
          <span className="text-gray-200">|</span>
          <span className="text-[11px] text-gray-400">{formatDate(ticket.updated_at)}</span>
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { session } = useAuthStore();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useState<HTMLDivElement | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/support/ticket/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId, session?.access_token]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !session?.access_token) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/ticket/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReply('');
      await fetchTicket();
      toast.success('Réponse envoyée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={36} className="text-red-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{error || 'Ticket introuvable'}</p>
        <button onClick={onBack} className="mt-3 text-sm text-primary font-semibold hover:underline">
          Retour aux tickets
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0 mt-0.5"
        >
          <ArrowLeft size={14} className="text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{ticket.subject}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold', status.bg, status.color)}>
              <StatusIcon size={10} className={ticket.status === 'in_progress' ? 'animate-spin' : ''} />
              {status.label}
            </span>
            <span className="text-[11px] text-gray-400">Créé le {formatDate(ticket.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('p-4', msg.is_admin ? 'bg-primary/5' : 'bg-white')}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold',
                  msg.is_admin ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-600'
                )}>
                  {msg.is_admin ? 'S' : 'V'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900">
                      {msg.is_admin ? 'Support Factu.me' : 'Vous'}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {messages.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun message</p>
            </div>
          )}
        </div>
      </div>

      {/* Reply form */}
      {ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Écrire une réponse..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none mb-3"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all',
                sending || !reply.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
              )}
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Répondre
            </button>
          </div>
        </form>
      )}

      {ticket.status === 'closed' && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Ce ticket est fermé. Vous pouvez{' '}
            <Link href="/help" className="text-primary font-semibold hover:underline">
              ouvrir un nouveau ticket
            </Link>{' '}
            si nécessaire.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const { session, user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/support/ticket', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  if (!user) {
    return (
      <div className="max-w-4xl text-center py-16">
        <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-500">Vous devez être connecté</p>
        <Link href="/login" className="mt-3 inline-block text-sm text-primary font-semibold hover:underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/help"
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Mes tickets</h1>
            <p className="text-sm text-gray-400">Suivez vos demandes de support</p>
          </div>
        </div>
        <Link
          href="/help"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={14} />
          Nouveau ticket
        </Link>
      </motion.div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Ticket list */}
        <div className="md:col-span-2 space-y-3">
          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle size={36} className="text-red-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : tickets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Ticket size={28} className="text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-500 mb-1">Aucun ticket</h3>
                <p className="text-sm text-gray-400 mb-4">Vous n&apos;avez pas encore créé de ticket de support</p>
                <Link
                  href="/help"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all"
                >
                  <Plus size={14} />
                  Créer un ticket
                </Link>
              </motion.div>
            ) : (
              tickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <TicketRow
                    ticket={ticket}
                    onClick={() => setSelectedTicket(ticket.id)}
                    isSelected={selectedTicket === ticket.id}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Detail panel */}
        <div className="md:col-span-3">
          {selectedTicket ? (
            <TicketDetail ticketId={selectedTicket} onBack={() => setSelectedTicket(null)} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-20">
              <div className="text-center">
                <MessageSquare size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Sélectionnez un ticket pour voir la conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
