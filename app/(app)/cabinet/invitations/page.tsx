'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { toast } from 'sonner';

export default function CabinetInvitationsPage() {
  const { clients, fetchCabinet, inviteClient, loading } = useCabinetStore();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchCabinet(); }, []);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await inviteClient(email.trim());
      toast.success(`Invitation envoyée à ${email}`);
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };

  const pending = clients.filter((c: any) => c.status === 'pending');
  const active = clients.filter((c: any) => c.status === 'active');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Invitations</h1>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Inviter un nouveau client</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {inviting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Envoyer
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 p-5">
          <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 text-sm">En attente de réponse ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/[0.02] border border-amber-100 dark:border-amber-800/20">
                <Mail size={16} className="text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.profile?.company_name || c.profile?.first_name || 'Client'}
                  </p>
                  <p className="text-xs text-gray-400">{c.profile?.email}</p>
                </div>
                <span className="text-xs text-amber-600">En attente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="rounded-2xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/30 p-5">
          <h3 className="font-bold text-green-800 dark:text-green-300 mb-3 text-sm">Clients connectés ({active.length})</h3>
          <div className="space-y-2">
            {active.map((c: any) => (
              <Link key={c.id} href={`/cabinet/clients/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/[0.02] border border-green-100 dark:border-green-800/20 hover:shadow-sm transition-all">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600">
                  {(c.profile?.company_name || 'C').charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.profile?.company_name || c.profile?.first_name}</p>
                  <p className="text-xs text-gray-400">{c.profile?.email}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
