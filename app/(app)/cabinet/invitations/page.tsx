'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Send, UserCheck, Clock, X, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CabinetInvitationsPage() {
  const { clients, fetchCabinet, inviteClient, removeClient, loading } = useCabinetStore();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { fetchCabinet(); }, []);

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

  const pending = (clients as any[]).filter((c) => c.status === 'pending');
  const active  = (clients as any[]).filter((c) => c.status === 'active');

  return (
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
  );
}
