'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Save, Building2, Hash, Trash2, AlertTriangle, Palette, Eye, Globe, Type, Phone, Mail, MapPin, FileText, Landmark, CreditCard, UserPlus, Users, X, Shield, Calculator, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

interface LocalMember {
  id: string;
  user_id: string;
  role: string;
  profile?: { email?: string; first_name?: string; last_name?: string };
}

export default function CabinetSettingsPage() {
  const router = useRouter();
  const { cabinet, updateCabinet } = useCabinetStore();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const isOwner = cabinet && profile ? cabinet.owner_id === profile.id : false;

  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [logoUrl, setLogoUrl] = useState('');
  const [whiteLabelName, setWhiteLabelName] = useState('');
  const [hideFactuBranding, setHideFactuBranding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  // RIB / Bank details
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  // DÉDALOS (CIBLE 3c) — modèle de mise en page des factures cabinet (PDF).
  // Défaut = 7 (PUR, minimaliste épuré). Voir lib/pdf-server.ts getStyle().
  const [pdfTemplate, setPdfTemplate] = useState(7);
  // Team
  const [members, setMembers] = useState<LocalMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitingMember, setInvitingMember] = useState(false);
  // Inviter un comptable (Comptable Connect)
  const [accountantEmail, setAccountantEmail] = useState('');
  const [invitingAccountant, setInvitingAccountant] = useState(false);

  // PROMÉTHÉE — la redirection de plan était dans le CORPS du render → boucle de
  // refresh infinie (chaque render rappelait router.push). Déplacée dans un effect,
  // avec replace() pour éviter la boucle de retour-arrière.
  const accessDenied = !sub.isBusiness && !sub.isTrialActive;
  useEffect(() => {
    if (accessDenied) router.replace('/cabinet');
  }, [accessDenied, router]);

  // ZÉNITH — fetchCabinet() RETIRÉ : le CabinetGuard du layout charge déjà le cabinet
  // actif (et hydrateFromCache). Cet appel était REDONDANT et causait la boucle de
  // refresh infinie : fetchCabinet fait basculer store.loading (true→false) → le guard
  // (render `if (loading) <Loader/>`) démontait la page → remontage → refetch → loop.
  // On ne garde que fetchMembers, qui utilise un état de chargement LOCAL (inoffensif).
  useEffect(() => { fetchMembers(); }, []);

  // Hydrate le formulaire quand le cabinet ACTIF change — dépendance sur cabinet?.id
  // (pas sur l'objet cabinet entier) : le store produit une nouvelle référence à
  // chaque fetchCabinet, ce qui déclenchait un orage de re-renders en boucle.
  useEffect(() => {
    if (!cabinet) return;
    setName(cabinet.name || '');
    setSiret(cabinet.siret || '');
    setPrimaryColor(cabinet.primary_color || '#10b981');
    setLogoUrl(cabinet.logo_url || '');
    setWhiteLabelName(cabinet.white_label_name || '');
    setHideFactuBranding(cabinet.hide_factu_branding || false);
    const s = cabinet.settings || {};
    setAddress(s.address || '');
    setZipCode(s.zip_code || '');
    setCity(s.city || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setVatNumber(s.vat_number || '');
    setIban(s.iban || '');
    setBic(s.bic || '');
    setBankName(s.bank_name || '');
    setAccountHolder(s.account_holder || '');
    const pt = Number(s.pdf_template);
    setPdfTemplate(pt >= 1 && pt <= 9 ? pt : 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinet?.id]);

  // Return APRÈS tous les hooks (Rules of Hooks — avant c'était un return anticipé
  // conditionnel qui rendait les hooks ci-dessus conditionnels et plantait React).
  if (accessDenied) return null;

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/cabinet/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('[fetchMembers] Error:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInvitingMember(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/cabinet/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (res.ok) {
        toast.success('Invitation envoyée');
        setInviteEmail('');
        await fetchMembers();
      } else {
        const { error } = await res.json().catch(() => ({}));
        toast.error(error || 'Erreur lors de l\'invitation');
      }
    } catch {
      toast.error('Erreur lors de l\'invitation');
    } finally {
      setInvitingMember(false);
    }
  };

  const handleInviteAccountant = async () => {
    if (!accountantEmail.trim()) return;
    setInvitingAccountant(true);
    try {
      // Route cookie-based : pas besoin de Bearer token.
      const res = await fetch('/api/cabinet/invite-accountant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountantEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Invitation envoyée à ${accountantEmail.trim()}`);
        setAccountantEmail('');
      } else if (res.status === 403 && data?.code === 'PLAN_REQUIRED') {
        toast.error('Le plan Business est requis pour inviter un comptable.');
      } else if (res.status === 409) {
        toast.error('Une invitation est déjà en attente pour cet email.');
      } else {
        toast.error(data?.error || 'Erreur lors de l\'invitation');
      }
    } catch {
      toast.error('Erreur lors de l\'invitation');
    } finally {
      setInvitingAccountant(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Retirer ce membre du cabinet ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/cabinet/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        toast.success('Membre retiré');
        await fetchMembers();
      } else {
        const { error } = await res.json().catch(() => ({}));
        toast.error(error || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Le nom du cabinet est obligatoire'); return; }
    setSaving(true);
    try {
      await updateCabinet({
        name: name.trim(),
        siret: siret.trim() || undefined,
        primary_color: primaryColor,
        logo_url: logoUrl.trim() || undefined,
        white_label_name: whiteLabelName.trim() || undefined,
        hide_factu_branding: hideFactuBranding,
        settings: {
          address: address.trim() || undefined,
          zip_code: zipCode.trim() || undefined,
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          vat_number: vatNumber.trim() || undefined,
          iban: iban.trim() || undefined,
          bic: bic.trim() || undefined,
          bank_name: bankName.trim() || undefined,
          account_holder: accountHolder.trim() || undefined,
          pdf_template: pdfTemplate,
        },
      });
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCabinet = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      const res = await fetch('/api/cabinet/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur lors de la suppression' }));
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
      toast.success('Cabinet supprimé avec succès');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[handleDeleteCabinet] Error:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Paramètres du cabinet</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Informations et configuration</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: primaryColor }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Sauvegarder
        </motion.button>
      </div>

      {/* Cabinet info */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Building2 size={15} className="text-blue-500" />
          Informations du cabinet
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Nom du cabinet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Cabinet Dubois & Associés"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            )}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><Hash size={11} />SIRET (optionnel)</span>
          </label>
          <input
            type="text"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="123 456 789 00012"
            maxLength={17}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Apparaît sur vos documents officiels</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><Hash size={11} />N° TVA intracommunautaire</span>
          </label>
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="FR 12 345678901"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            )}
          />
        </div>
      </div>

      {/* Contact & Address */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <MapPin size={15} className="text-emerald-500" />
          Coordonnées
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><MapPin size={11} />Adresse</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="12 rue de la Paix"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Code postal</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="75002"
              maxLength={5}
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Ville</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><Phone size={11} />Téléphone</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01 23 45 67 89"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><Mail size={11} />Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@cabinet.fr"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              )}
            />
          </div>
        </div>
      </div>

      {/* RIB / Bank Details */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <Landmark size={15} className="text-amber-500" />
          Coordonnées bancaires (RIB)
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ces informations apparaîtront sur vos factures et documents officiels.
        </p>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><CreditCard size={11} />IBAN</span>
          </label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><CreditCard size={11} />BIC / SWIFT</span>
            </label>
            <input
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value)}
              placeholder="BNPAFRPPXXX"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><Landmark size={11} />Banque</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="BNP Paribas"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><Users size={11} />Titulaire du compte</span>
          </label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="Cabinet Dubois & Associés"
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
            )}
          />
        </div>
      </div>

      {/* DÉDALOS (CIBLE 3c) — Modèle de facture (template PDF) */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
          <FileText size={15} className="text-indigo-500" />
          Modèle de facture
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Choisissez la mise en page de vos factures d&apos;honoraires. Le logo et la couleur du cabinet s&apos;appliquent automatiquement.
        </p>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5"><FileText size={11} />Template PDF</span>
          </label>
          <select
            value={pdfTemplate}
            onChange={(e) => setPdfTemplate(Number(e.target.value))}
            className={cn(
              'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
              'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
            )}
          >
            <option value={7}>PUR — Minimaliste épuré (recommandé)</option>
            <option value={8}>AUDACE — Moderne à fort impact</option>
            <option value={9}>ÉLÉGANCE — Classique formel</option>
            <option value={1}>Classique — Barre fine</option>
            <option value={3}>Accent — En-tête coloré plein</option>
            <option value={5}>Marine — En-tête bleu nuit</option>
            <option value={6}>Émeraude — En-tête vert</option>
            <option value={2}>Sobre — En-tête sombre (serif)</option>
            <option value={4}>Crème — Tons chauds (serif)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1.5">Modifiez puis recréez une facture pour voir le nouveau rendu.</p>
        </div>
      </div>

      {/* Inviter un expert-comptable — Comptable Connect (Business) */}
      {sub.canUseComptableConnect && isOwner && cabinet && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Calculator size={15} className="text-emerald-500" />
            Inviter mon expert-comptable
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Votre comptable recevra un email avec un lien sécurisé valable 7 jours. Une fois accepté, il accédera au cabinet en tant que <span className="font-semibold text-gray-700 dark:text-gray-300">collaborateur</span>.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={accountantEmail}
                onChange={(e) => setAccountantEmail(e.target.value)}
                placeholder="comptable@cabinet-expert.fr"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteAccountant()}
              />
            </div>
            <button
              onClick={handleInviteAccountant}
              disabled={!accountantEmail.trim() || invitingAccountant}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-md disabled:opacity-50 transition-all"
            >
              {invitingAccountant ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
              Inviter mon comptable
            </button>
          </div>
          <div className="flex items-start gap-2 pt-1">
            <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Accès en lecture aux factures, dépenses et rapports du cabinet. Le comptable doit créer un compte Factu.me avec l&apos;email invité.
            </p>
          </div>
        </div>
      )}

      {/* Team Management */}
      {cabinet && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Shield size={15} className="text-emerald-600 dark:text-emerald-400" />
            Équipe du cabinet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Invitez vos collaborateurs à rejoindre le cabinet.
          </p>

          {/* Invite form — only for owner */}
          {isOwner && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="collaborateur@email.fr"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
              />
            </div>
            <button
              onClick={handleInviteMember}
              disabled={!inviteEmail.trim() || invitingMember}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-md disabled:opacity-50 transition-all"
            >
              {invitingMember ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Inviter
            </button>
          </div>
          )}

          {/* Members list */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="text-gray-400 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4">
              <Users size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Aucun membre pour le moment</p>
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {(m.profile?.first_name || m.profile?.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {m.profile?.first_name ? `${m.profile.first_name} ${m.profile?.last_name || ''}` : (m.profile?.email || 'Membre')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {m.role === 'owner' ? 'Propriétaire' : m.role === 'admin' ? 'Administrateur' : 'Collaborateur'}
                        {m.user_id === cabinet?.owner_id && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Propriétaire</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {m.user_id !== cabinet?.owner_id && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      title="Retirer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* White Label - only for Business plan */}
      {sub.isBusiness && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            <Palette size={15} className="text-emerald-600 dark:text-emerald-400" />
            Marque blanche
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Personnalisez l&apos;interface avec vos couleurs et votre marque. Remplacez &quot;Factu.me&quot; par le nom de votre cabinet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5"><Palette size={11} />Couleur principale</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all font-mono',
                    'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                  )}
                  maxLength={7}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5"><Type size={11} />Nom de marque</span>
              </label>
              <input
                type="text"
                value={whiteLabelName}
                onChange={(e) => setWhiteLabelName(e.target.value)}
                placeholder="Remplace &quot;Factu.me&quot; dans l'interface"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                  'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5"><Globe size={11} />URL du logo</span>
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 text-sm outline-none transition-all',
                'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              )}
            />
            <p className="text-xs text-gray-400 mt-1.5">Logo affiché dans la barre de navigation du cabinet</p>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Masquer la marque Factu.me</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Remplace les références à Factu.me par votre nom de marque</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideFactuBranding}
              onClick={() => setHideFactuBranding(!hideFactuBranding)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                hideFactuBranding ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                hideFactuBranding ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-bold">Apercu</p>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {hideFactuBranding && whiteLabelName ? whiteLabelName : (whiteLabelName || 'Factu.me')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-2xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30 p-5 space-y-3">
        <h3 className="font-bold text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" />
          Zone de danger
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Supprimer le cabinet déconnecte tous les clients et efface la configuration. Cette action est irréversible.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={14} />
            Supprimer le cabinet
          </button>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-red-800 dark:text-red-300 font-semibold">
              Cette action est définitive. Pour confirmer, tapez <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded text-red-900 dark:text-red-200 text-xs">SUPPRIMER</span> ci-dessous.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='Tapez "SUPPRIMER" pour confirmer'
              className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-red-300 dark:placeholder-red-700"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteCabinet}
                disabled={deleteInput !== 'SUPPRIMER' || deleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
    </CabinetGuard>
  );
}
