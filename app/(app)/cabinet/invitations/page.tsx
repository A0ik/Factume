'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Send, UserCheck, Clock, X, AlertCircle, Info, Link2, Copy, Check, Share2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

export default function CabinetInvitationsPage() {
  const { clients, fetchCabinet, inviteClient, removeClient, loading } = useCabinetStore();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // PROMÉTHÉE — invitation par lien tokenisé.
  const [inviteLink, setInviteLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchCabinet(); }, []);

  const handleGenerateLink = async () => {
    setLinkLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée');
        return;
      }
      const res = await fetch('/api/cabinet/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'x-active-cabinet-id': localStorage.getItem('factume_active_cabinet_id') || '',
        },
        body: JSON.stringify({ invited_email: email.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la génération du lien');
        return;
      }
      setInviteLink(data.link);
      setCopied(false);
      toast.success('Lien d\'invitation généré (valable 7 jours)');
    } catch {
      toast.error('Erreur lors de la génération du lien');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Adresse email invalide');
      return;
    }
    setInviting(true);
    try {
      await inviteClient(trimmed);
      toast.success(`Invitation envoyée à ${trimmed}`);
      setEmail('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (clientId: string, name: string) => {
    if (!confirm(`Retirer ${name} du cabinet ?`)) return;
    setRemovingId(clientId);
    try {
      await removeClient(clientId);
      toast.success(`${name} retiré du cabinet`);
    } catch {
      toast.error('Erreur lors du retrait');
    } finally {
      setRemovingId(null);
    }
  };

  // ARGOS (P2) — garde null : si le cache hydrate la valeur 'null', (null as any[]).filter
  // levait un TypeError → écran blanc sur /cabinet/invitations.
  const clientsArr = Array.isArray(clients) ? (clients as any[]) : [];
  const pending = clientsArr.filter((c) => c.status === 'pending');
  const active  = clientsArr.filter((c) => c.status === 'active');

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Invitations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Invitez vos clients à rejoindre votre cabinet</p>
        </div>
      </div>

      {/* Invite form */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Inviter un nouveau client</h3>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm disabled:opacity-50 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
          >
            {inviting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Inviter
          </motion.button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
          <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Le client doit déjà avoir un compte FacturMe avec cette adresse email. L&apos;invitation sera visible dans son tableau de bord.
          </p>
        </div>
      </div>

      {/* PROMÉTHÉE — Invitation par lien tokenisé (le gérant n'a pas besoin de compte préalable) */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 size={15} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Inviter par lien</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Générez un lien sécurisé valable 7 jours. Le gérant pourra créer son compte puis accéder à son cabinet.
        </p>

        {!inviteLink ? (
          <button
            onClick={handleGenerateLink}
            disabled={linkLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm disabled:opacity-50 shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            {linkLoading ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
            Générer un lien d&apos;invitation
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <code className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">{inviteLink}</code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors flex-shrink-0"
                title="Copier le lien"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Rejoignez mon cabinet sur Factu.me : ${inviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Invitation cabinet Factu.me')}&body=${encodeURIComponent(`Bonjour,\n\nRejoignez mon cabinet sur Factu.me en cliquant sur ce lien :\n${inviteLink}`)}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <Mail size={13} /> Email
              </a>
              <button
                onClick={handleGenerateLink}
                disabled={linkLoading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                title="Régénérer un nouveau lien"
              >
                <Share2 size={13} /> Nouveau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending invitations */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-200/60 dark:border-amber-800/30">
              <Clock size={14} className="text-amber-500" />
              <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm">En attente de réponse ({pending.length})</h3>
            </div>
            <div className="divide-y divide-amber-200/40 dark:divide-amber-800/20">
              {pending.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                    {(c.profile?.company_name || c.profile?.first_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {c.profile?.company_name || `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Client'}
                    </p>
                    <p className="text-xs text-gray-400">{c.profile?.email}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                    En attente
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active clients */}
      {active.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
            <UserCheck size={14} className="text-emerald-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Clients connectés ({active.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {active.map((c: any) => {
              const name = c.profile?.company_name || `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Client';
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/cabinet/clients/${c.id}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {name}
                    </Link>
                    <p className="text-xs text-gray-400">{c.profile?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                      Connecté
                    </span>
                    <button
                      onClick={() => handleRemove(c.id, name)}
                      disabled={removingId === c.id}
                      className={cn(
                        'p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100',
                        removingId === c.id && 'opacity-100'
                      )}
                      title="Retirer du cabinet"
                    >
                      {removingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && active.length === 0 && !loading && (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Aucun client invité pour l&apos;instant</p>
        </div>
      )}
    </motion.div>
    </CabinetGuard>
  );
}
