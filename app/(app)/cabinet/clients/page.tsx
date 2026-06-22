'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus, Mail, Search, Building2, Hash, MapPin, Phone, X,
  Download, Trash2, Loader2, UserPlus, ChevronRight, Users,
} from 'lucide-react';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import {
  SectionCard, DataTable, Avatar, StatusBadge, Modal, Tabs, EmptyState,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface ManualClientForm {
  company_name: string;
  siret: string;
  address: string;
  zip_code: string;
  city: string;
  phone: string;
  contact_email: string;
  contact_name: string;
  notes: string;
}

interface SirenResult {
  siren: string | null;
  siret: string | null;
  name: string | null;
  legal_form: string | null;
  address: string | null;
  naf_code: string | null;
  manager: string | null;
}

const EMPTY_FORM: ManualClientForm = {
  company_name: '', siret: '', address: '', zip_code: '', city: '',
  phone: '', contact_email: '', contact_name: '', notes: '',
};

type AddMode = 'manual' | 'invite';

const getClientName = (c: any) =>
  c.client_type === 'manual' ? c.company_name || 'Client' : c.profile?.company_name || c.profile?.first_name || 'Client';
const getClientEmail = (c: any) =>
  c.client_type === 'manual' ? c.contact_email || '' : c.profile?.email || '';

export default function CabinetClientsPage() {
  const { clients, cabinet, fetchCabinet, inviteClient, loading } = useCabinetStore();
  const { profile, initialized } = useAuthStore();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('manual');
  const [form, setForm] = useState<ManualClientForm>({ ...EMPTY_FORM });
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SIREN lookup
  const [sirenQuery, setSirenQuery] = useState('');
  const [sirenResults, setSirenResults] = useState<SirenResult[]>([]);
  const [sirenLoading, setSirenLoading] = useState(false);
  const [sirenOpen, setSirenOpen] = useState(false);

  // Hydratation unique — le CabinetGuard a déjà chargé le cabinet ; on ne fetch que si vide.
  useEffect(() => {
    if (initialized && profile && clients.length === 0) fetchCabinet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, profile]);

  const primaryColor = cabinet?.primary_color || '#10b981';

  const handleInvite = async (target?: string) => {
    const mail = (target ?? email).trim();
    if (!mail) return;
    setInviting(true);
    try {
      await inviteClient(mail);
      toast.success(`Invitation envoyée à ${mail}`);
      if (!target) setEmail('');
      else setShowAddModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };

  const handleSirenSearch = useCallback(async (query: string) => {
    setSirenQuery(query);
    if (query.trim().length < 2) {
      setSirenResults([]);
      setSirenOpen(false);
      return;
    }
    setSirenLoading(true);
    setSirenOpen(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/cabinet/siren-lookup?q=' + encodeURIComponent(query.trim()), {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      if (res.ok) setSirenResults((await res.json()).results || []);
    } catch {
      setSirenResults([]);
    } finally {
      setSirenLoading(false);
    }
  }, []);

  const handleSelectSiren = (r: SirenResult) => {
    setForm((prev) => ({
      ...prev,
      company_name: r.name || prev.company_name,
      siret: r.siret || prev.siret,
      address: r.address ? r.address.split(',').slice(0, 1).join('').trim() : prev.address,
    }));
    setSirenOpen(false);
    setSirenQuery('');
    toast.success('Informations pré-remplies');
  };

  const handleCreateManual = async () => {
    if (!form.company_name.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire");
      return;
    }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/clients', 'POST', form);
      clearCabinetCache('/api/cabinet/clients');
      toast.success('Client créé avec succès');
      setShowAddModal(false);
      setForm({ ...EMPTY_FORM });
      await fetchCabinet();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Supprimer ce client du cabinet ?')) return;
    setDeletingId(clientId);
    try {
      await cabinetMutation('/api/cabinet/clients', 'DELETE', { clientId });
      clearCabinetCache('/api/cabinet/clients');
      toast.success('Client supprimé');
      await fetchCabinet();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    if (clients.length === 0) return;
    downloadXLSX(`cabinet-clients-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Clients',
        headers: ['Nom', 'Email', 'SIRET', 'Statut', 'Ville', 'Type'],
        rows: clients.map((c: any) => [
          getClientName(c),
          getClientEmail(c),
          c.siret || '',
          c.status || '',
          c.city || '',
          c.client_type === 'manual' ? 'Manuel' : 'Connecté',
        ]),
      },
    ]);
    toast.success('Export Excel téléchargé');
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Client',
      sortValue: (c) => getClientName(c),
      sortable: true,
      render: (c) => (
        <Link
          href={c.status === 'active' ? `/cabinet/clients/${c.id}` : '#'}
          className="flex items-center gap-3 group min-w-0"
          onClick={(e) => c.status !== 'active' && e.preventDefault()}
        >
          <Avatar name={getClientName(c)} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{getClientName(c)}</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              {getClientEmail(c) && <span className="truncate">{getClientEmail(c)}</span>}
              {c.client_type === 'manual' && c.city && (
                <span className="truncate">· {c.city}</span>
              )}
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      render: (c) =>
        c.client_type === 'manual' ? (
          <StatusBadge tone="info" size="sm">Manuel</StatusBadge>
        ) : (
          <StatusBadge tone="neutral" size="sm">Connecté</StatusBadge>
        ),
    },
    {
      key: 'siret',
      header: 'SIRET',
      hideOnMobile: true,
      render: (c) =>
        c.siret ? (
          <span className="text-xs font-mono text-gray-500">{c.siret}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (c) => {
        const tone =
          c.status === 'active' ? 'good' : c.status === 'disconnected' ? 'critical' : 'warning';
        const label = c.status === 'active' ? 'Actif' : c.status === 'disconnected' ? 'Déconnecté' : 'En attente';
        return <StatusBadge tone={tone}>{label}</StatusBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {c.status === 'active' && (
            <Link
              href={`/cabinet/clients/${c.id}`}
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={16} />
            </Link>
          )}
          <button
            onClick={() => handleDelete(c.id)}
            disabled={deletingId === c.id}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Supprimer"
          >
            {deletingId === c.id ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Bandeau invitation rapide */}
      <SectionCard title="Inviter un client par email" icon={Mail} accent={primaryColor}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@client.fr"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <button
            onClick={() => handleInvite()}
            disabled={!email.trim() || inviting}
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {inviting ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Inviter
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Le client doit avoir un compte Factu.me avec cet email.
        </p>
      </SectionCard>

      {/* Liste */}
      <SectionCard
        title={`Portefeuille (${clients.length})`}
        icon={Users}
        accent={primaryColor}
        noPadding
        action={
          <>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              title="Exporter Excel"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setAddMode('manual');
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Entreprise</span>
            </button>
          </>
        }
      >
        {loading && clients.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="text-gray-400 animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={clients as any[]}
            getRowId={(c) => c.id}
            searchable
            searchPlaceholder="Rechercher par nom, email, SIRET, ville…"
            searchText={(c) =>
              `${getClientName(c)} ${getClientEmail(c)} ${c.siret || ''} ${c.city || ''}`
            }
            emptyIcon={Building2}
            emptyTitle="Aucun client"
            emptyDescription="Invitez un client par email ou créez une fiche entreprise manuelle."
          />
        )}
      </SectionCard>

      {/* Modale ajout (manuel / invitation) */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Ajouter un client"
        icon={Building2}
        accent={primaryColor}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => (addMode === 'manual' ? handleCreateManual() : handleInvite(email))}
              disabled={addMode === 'manual' ? !form.company_name.trim() || saving : !email.trim() || inviting}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {saving || inviting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {addMode === 'manual' ? 'Créer le client' : "Envoyer l'invitation"}
            </button>
          </>
        }
      >
        <div className="mb-4">
          <Tabs
            active={addMode}
            onChange={(m) => setAddMode(m as AddMode)}
            accent={primaryColor}
            tabs={[
              { id: 'manual', label: 'Créer une entreprise', icon: Building2 },
              { id: 'invite', label: 'Inviter par email', icon: Mail },
            ]}
          />
        </div>

        {addMode === 'manual' ? (
          <div className="space-y-4">
            {/* SIREN lookup */}
            <div className="relative">
              <Label>Rechercher SIREN / SIRET</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={sirenQuery}
                  onChange={(e) => handleSirenSearch(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Nom d'entreprise ou numéro SIREN…"
                />
                {sirenLoading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
              </div>
              {sirenOpen && sirenResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {sirenResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSiren(r)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.siret && <span className="font-mono">{r.siret}</span>}
                        {r.legal_form && <span> · {r.legal_form}</span>}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field label="Nom de l'entreprise" required icon={Building2}>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className={inputCls}
                placeholder="Ex : Boulangerie Dupont SARL"
              />
            </Field>

            <Field label="SIRET" icon={Hash}>
              <input
                type="text"
                value={form.siret}
                onChange={(e) => setForm({ ...form, siret: e.target.value })}
                className={cn(inputCls, 'font-mono')}
                placeholder="123 456 789 00012"
                maxLength={14}
              />
            </Field>

            <Field label="Adresse" icon={MapPin}>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputCls}
                placeholder="12 Rue de la République"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Code postal">
                <input
                  type="text"
                  value={form.zip_code}
                  onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                  className={inputCls}
                  placeholder="75001"
                  maxLength={5}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Ville">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputCls}
                    placeholder="Paris"
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone" icon={Phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                  placeholder="01 23 45 67 89"
                />
              </Field>
              <Field label="Contact">
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className={inputCls}
                  placeholder="Jean Dupont"
                />
              </Field>
            </div>

            <Field label="Email contact" icon={Mail}>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className={inputCls}
                placeholder="jean@dupont.fr"
              />
            </Field>
          </div>
        ) : (
          <EmptyState
            icon={UserPlus}
            title="Inviter un client existant"
            description="Le client recevra une invitation pour se connecter à votre cabinet. Il doit avoir un compte Factu.me."
            action={
              <div className="flex items-center gap-2 w-full max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="email@client.fr"
                  onKeyDown={(e) => e.key === 'Enter' && email.trim() && handleInvite(email)}
                />
                <button
                  onClick={() => email.trim() && handleInvite(email)}
                  disabled={!email.trim() || inviting}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ backgroundColor: primaryColor }}
                >
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Inviter'}
                </button>
              </div>
            }
          />
        )}
      </Modal>
    </motion.div>
  );
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon?: any;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
        )}
        <div className={Icon ? '[&_input]:pl-9' : ''}>{children}</div>
      </div>
    </div>
  );
}
