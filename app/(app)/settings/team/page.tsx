'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useTeam, TeamMember } from '@/hooks/useTeam';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  ArrowLeft, Users, Plus, Crown, Shield, User, Eye, Trash2,
  Mail, Clock, CheckCircle2, AlertCircle, Sparkles, ChevronDown,
} from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  owner:  { label: 'Propriétaire', icon: Crown,  color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',  description: 'Accès complet + gestion de l\'équipe' },
  admin:  { label: 'Admin',        icon: Shield, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', description: 'Gère les membres et les paramètres' },
  member: { label: 'Membre',       icon: User,   color: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-900/20',    description: 'Crée et modifie les factures' },
  viewer: { label: 'Lecteur',      icon: Eye,    color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-50 dark:bg-gray-800/50',    description: 'Consulte les documents en lecture seule' },
};

export default function TeamSettingsPage() {
  const router = useRouter();
  const sub = useSubscription();
  const { members, loading, inviting, invite, remove, updateRole } = useTeam();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  if (!sub.isBusiness) {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => router.push('/settings')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Paramètres
        </button>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Gestion d&apos;équipe</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Invitez des collaborateurs et attribuez-leur des rôles pour travailler ensemble.</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Crown size={12} /> Plan Business requis
          </div>
          <button
            onClick={() => router.push('/paywall')}
            className="mt-4 block mx-auto text-sm font-semibold text-primary hover:underline"
          >
            Voir les offres
          </button>
        </div>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const result = await invite(inviteEmail.trim(), inviteRole);
    if (result.success) {
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
    } else {
      toast.error(result.error || 'Erreur');
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Supprimer ${member.email} de l'équipe ?`)) return;
    setRemovingId(member.id);
    const result = await remove(member.id);
    if (result.success) {
      toast.success(`${member.email} a été retiré de l'équipe`);
    } else {
      toast.error(result.error || 'Erreur');
    }
    setRemovingId(null);
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setChangingRoleId(memberId);
    const result = await updateRole(memberId, newRole);
    if (result.success) {
      toast.success('Rôle mis à jour');
    } else {
      toast.error(result.error || 'Erreur');
    }
    setChangingRoleId(null);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <button onClick={() => router.push('/settings')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
        <ArrowLeft size={16} /> Paramètres
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Users size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Équipe</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gérez les membres de votre équipe</p>
          </div>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowInviteModal(true)}>
          Inviter
        </Button>
      </div>

      <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/30">
        <Users size={14} className="text-teal-500 flex-shrink-0" />
        <p className="text-xs text-teal-700 dark:text-teal-300">
          <strong>{members.length} membre{members.length > 1 ? 's' : ''}</strong> dans votre équipe. Plan Business : membres illimités.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="text-gray-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun membre dans l&apos;équipe</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {members.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              const RoleIcon = roleConfig.icon;
              const isOwner = member.role === 'owner';
              const isPending = member.status === 'pending';

              return (
                <div key={member.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', roleConfig.bg)}>
                    <RoleIcon size={18} className={roleConfig.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.email}</p>
                      {isPending && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          <Clock size={9} /> En attente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {isOwner
                        ? 'Propriétaire du compte'
                        : isPending
                          ? `Invité le ${member.invited_at ? new Date(member.invited_at).toLocaleDateString('fr-FR') : '-'}`
                          : `Actif depuis ${member.accepted_at ? new Date(member.accepted_at).toLocaleDateString('fr-FR') : '-'}`
                      }
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOwner ? (
                      <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold', roleConfig.bg, roleConfig.color)}>
                        <RoleIcon size={12} /> {roleConfig.label}
                      </span>
                    ) : (
                      <div className="relative group">
                        <button
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                            roleConfig.bg, roleConfig.color, 'hover:opacity-80'
                          )}
                        >
                          {changingRoleId === member.id ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <RoleIcon size={12} /> {roleConfig.label}
                              <ChevronDown size={10} />
                            </>
                          )}
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          {(['admin', 'member', 'viewer'] as const).map((r) => {
                            const rc = ROLE_CONFIG[r];
                            const RcIcon = rc.icon;
                            return (
                              <button
                                key={r}
                                onClick={() => handleRoleChange(member.id, r)}
                                className={cn(
                                  'flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl',
                                  r === member.role
                                    ? 'bg-primary/5 text-primary'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                )}
                              >
                                <RcIcon size={14} />
                                <div>
                                  <p className="font-semibold text-xs">{rc.label}</p>
                                  <p className="text-[10px] text-gray-400">{rc.description}</p>
                                </div>
                                {r === member.role && <CheckCircle2 size={12} className="ml-auto text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!isOwner && (
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.id}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        title="Retirer de l'équipe"
                      >
                        {removingId === member.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Inviter un membre" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collegue@exemple.fr"
                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">Rôle</label>
            <div className="space-y-2">
              {(['admin', 'member', 'viewer'] as const).map((r) => {
                const rc = ROLE_CONFIG[r];
                const RcIcon = rc.icon;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={cn(
                      'flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition-all',
                      inviteRole === r
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', rc.bg)}>
                      <RcIcon size={16} className={rc.color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{rc.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{rc.description}</p>
                    </div>
                    {inviteRole === r && <CheckCircle2 size={16} className="ml-auto text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Le membre recevra un email d&apos;invitation. Il devra créer un compte Factu.me s&apos;il n&apos;en a pas déjà un.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowInviteModal(false)}>
              Annuler
            </Button>
            <Button className="flex-1" loading={inviting} disabled={!inviteEmail.trim()} onClick={handleInvite}>
              Envoyer l&apos;invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
