'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

export default function CabinetClientsPage() {
  const { clients, cabinet, fetchCabinet, inviteClient, loading } = useCabinetStore();
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

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    active: { icon: CheckCircle, color: 'text-green-500', label: 'Actif' },
    pending: { icon: Clock, color: 'text-amber-500', label: 'En attente' },
    disconnected: { icon: XCircle, color: 'text-red-500', label: 'Déconnecté' },
  };

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Clients du cabinet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{clients.length} client(s)</p>
        </div>
      </div>

      {/* Formulaire d'invitation */}
      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Inviter un client</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Inviter
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Le client doit avoir un compte FACTU.ME avec cet email.</p>
      </div>

      {/* Liste des clients */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Aucun client pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client: any) => {
            const status = statusConfig[client.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Link
                key={client.id}
                href={client.status === 'active' ? `/cabinet/clients/${client.id}` : '#'}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all',
                  client.status === 'active'
                    ? 'bg-white/60 dark:bg-slate-900/60 border-gray-200/60 dark:border-gray-700/30 hover:shadow-sm'
                    : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 opacity-70'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">
                  {(client.profile?.company_name || client.profile?.first_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {client.profile?.company_name || client.profile?.first_name || 'Client'}
                  </p>
                  <p className="text-xs text-gray-400">{client.profile?.email}</p>
                </div>
                <div className={cn('flex items-center gap-1 text-xs font-medium', status.color)}>
                  <StatusIcon size={14} />
                  {status.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
    </CabinetGuard>
  );
}
