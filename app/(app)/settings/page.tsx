'use client';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { getSupabaseClient } from '@/lib/supabase';
import { CURRENCIES, LEGAL_STATUSES, SECTORS, ACCENT_COLORS } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { CompanySearch } from '@/components/ui/CompanySearch';

import { Camera, Crown, LogOut, Trash2, Download, AlertTriangle, ShieldAlert, Zap, CreditCard, XCircle, ArrowUpRight, PenTool, X, Link2, CheckCircle2, Unlink, Globe, Plus, Sparkles, Eye, Upload, Lock, Smartphone, RefreshCw, Keyboard, Palette, Users, HelpCircle, Building2, FileText, Receipt, Landmark, CreditCard as CreditCardIcon, PenLine, Settings2, Bell, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { changeLanguage } from '@/i18n';
import { SumUpTutorialModal } from '@/components/ui/SumUpTutorialModal';
import Link from 'next/link';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const CURRENCY_OPTS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.label}` }));
const LANG_OPTS = [{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }];
const WEBHOOK_EVENTS = [
  { value: 'invoice.created', label: 'Facture créée' },
  { value: 'invoice.sent', label: 'Facture envoyée' },
  { value: 'invoice.paid', label: 'Facture payée' },
  { value: 'invoice.overdue', label: 'Facture en retard' },
];

interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

type TabKey = 'company' | 'billing' | 'template' | 'bank' | 'stripe' | 'sumup' | 'signature' | 'preferences' | 'webhooks' | 'account';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'company', label: 'Entreprise', icon: <Building2 size={16} /> },
  { key: 'billing', label: 'Facturation', icon: <FileText size={16} /> },
  { key: 'template', label: 'Modèle', icon: <Receipt size={16} /> },
  { key: 'bank', label: 'Banque', icon: <Landmark size={16} /> },
  { key: 'stripe', label: 'Stripe', icon: <CreditCardIcon size={16} /> },
  { key: 'sumup', label: 'SumUp', icon: <Smartphone size={16} /> },
  { key: 'signature', label: 'Signature', icon: <PenLine size={16} /> },
  { key: 'preferences', label: 'Préférences', icon: <Settings2 size={16} /> },
  { key: 'webhooks', label: 'Webhooks', icon: <Bell size={16} /> },
  { key: 'account', label: 'Compte', icon: <Shield size={16} /> },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile, updateProfile, signOut, fetchProfile } = useAuthStore();
  const sub = useSubscription();
  const fileRef = useRef<HTMLInputElement>(null);
  const sigFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'error' | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('company');

  // SumUp state
  const [sumupMerchantCode, setSumupMerchantCode] = useState('');
  const [sumupEmail, setSumupEmail] = useState('');
  const [sumupEmailMissing, setSumupEmailMissing] = useState(false);
  const [sumupConnected, setSumupConnected] = useState(false);
  const [sumupTokenExpiresAt, setSumupTokenExpiresAt] = useState<string | null>(null);
  const [sumupLoading, setSumupLoading] = useState(false);
  const [showSumupTutorial, setShowSumupTutorial] = useState(false);

  // Webhook state
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState<{ url: string; events: string[] }>({ url: '', events: [] });
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: profile?.company_name || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'France',
    siret: profile?.siret || '',
    vat_number: profile?.vat_number || '',
    legal_status: profile?.legal_status || '',
    sector: profile?.sector || '',
    invoice_prefix: profile?.invoice_prefix || 'FACT',
    currency: profile?.currency || 'EUR',
    language: profile?.language || 'fr',
    template_id: String(profile?.template_id ?? 1),
    accent_color: profile?.accent_color || '#1D9E75',
    bank_name: profile?.bank_name || '',
    iban: profile?.iban || '',
    bic: profile?.bic || '',
    payment_terms: profile?.payment_terms || '',
    legal_mention: profile?.legal_mention || '',
    rcs_number: (profile as any)?.rcs_number || '',
    rm_number: (profile as any)?.rm_number || '',
    capital_social: (profile as any)?.capital_social || '',
    naf_code: (profile as any)?.naf_code || '',
    regime_fiscal: (profile as any)?.regime_fiscal || 'reel',
    cgv_text: (profile as any)?.cgv_text || '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // AI Template analysis state
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [analyzingTemplate, setAnalyzingTemplate] = useState(false);
  const [analyzedTemplateHtml, setAnalyzedTemplateHtml] = useState<string | null>(null);
  const [analyzedStyleDesc, setAnalyzedStyleDesc] = useState('');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [shortcutsUpdateKey, setShortcutsUpdateKey] = useState(0);

  const forceUpdate = () => setShortcutsUpdateKey(prev => prev + 1);

  const buildPreviewHtml = (html: string): string => {
    const p = profile;
    const sampleRows = `
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee">Prestation de service</td><td style="padding:10px 14px;text-align:center;border-bottom:1px solid #eee">3</td><td style="padding:10px 14px;text-align:right;border-bottom:1px solid #eee">500,00 €</td><td style="padding:10px 14px;text-align:center;border-bottom:1px solid #eee">20%</td><td style="padding:10px 14px;text-align:right;border-bottom:1px solid #eee">1 500,00 €</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee">Frais de déplacement</td><td style="padding:10px 14px;text-align:center;border-bottom:1px solid #eee">1</td><td style="padding:10px 14px;text-align:right;border-bottom:1px solid #eee">200,00 €</td><td style="padding:10px 14px;text-align:center;border-bottom:1px solid #eee">20%</td><td style="padding:10px 14px;text-align:right;border-bottom:1px solid #eee">200,00 €</td></tr>
    `;
    const demo: Record<string, string> = {
      '{{accent_color}}': form.accent_color || '#1D9E75',
      '{{company_name}}': p?.company_name || 'Ma Société SAS',
      '{{company_address}}': [p?.address, p?.postal_code && p?.city ? `${p.postal_code} ${p.city}` : '75001 Paris'].filter(Boolean).join(', ') || '12 Rue de la Paix, 75001 Paris',
      '{{company_logo}}': '',
      '{{company_phone}}': p?.phone || '01 23 45 67 89',
      '{{company_email}}': p?.email || 'contact@masociete.fr',
      '{{company_siret}}': p?.siret || '12345678900012',
      '{{company_vat_number}}': p?.vat_number || 'FR12345678901',
      '{{company_legal_status}}': p?.legal_status || 'SAS',
      '{{doc_label}}': 'FACTURE',
      '{{invoice_number}}': 'FA-2024-001',
      '{{issue_date}}': '15 janvier 2024',
      '{{due_date}}': 'Échéance : 14 février 2024',
      '{{issued_label}}': 'Émise le',
      '{{billed_to_label}}': 'Facturé à',
      '{{client_name}}': 'Client Démo SARL',
      '{{client_address}}': '45 Avenue des Champs-Élysées<br/>75008 Paris',
      '{{client_email}}': 'client@demo.fr',
      '{{client_phone}}': '06 12 34 56 78',
      '{{client_siret}}': '98765432100021',
      '{{client_logo}}': '',
      '{{items_table}}': sampleRows,
      '{{subtotal}}': '1 700,00 €',
      '{{vat_amount}}': '340,00 €',
      '{{discount_amount}}': '',
      '{{discount_percent}}': '',
      '{{total}}': '2 040,00 €',
      '{{total_label}}': 'TOTAL TTC',
      '{{notes}}': 'Merci pour votre confiance.',
      '{{notes_block}}': '<div style="padding:12px 16px;background:#f8f8fc;border-radius:8px;margin-bottom:16px;font-size:12px;color:#374151">Merci pour votre confiance.</div>',
      '{{bank_block}}': '<div style="padding:12px 16px;background:#f0fdf4;border-radius:8px;margin-bottom:16px;font-size:12px;color:#374151"><strong>Banque :</strong> BNP Paribas<br/><strong>IBAN :</strong> FR76 1234 5678 9012 3456 7890 123</div>',
      '{{payment_section}}': '',
      '{{payment_terms_block}}': '<div style="padding:12px 16px;background:#f8f8fc;border-radius:8px;margin-bottom:16px;font-size:12px;color:#374151">Paiement sous 30 jours. En cas de retard, une pénalité de 3× le taux légal sera appliquée.</div>',
      '{{legal_mention}}': 'SIRET 12345678900012 · TVA FR12345678901',
      '{{legal_mention_block}}': '<div style="padding:12px 16px;background:#f9f9f9;border-radius:8px;font-size:11px;color:#6b7280">SIRET 12345678900012 · N° TVA FR12345678901 · Pénalités de retard : 3× le taux légal</div>',
      '{{mandatory_mentions}}': '<div style="padding:12px 16px;background:#fafafa;border-radius:8px;font-size:11px;color:#6b7280">Facture émise conformément à l\'art. L.441-9 du Code de commerce</div>',
      '{{insurance_mention}}': '',
      '{{intellectual_property_mention}}': '',
      '{{signature_block}}': '',
      '{{signature_image}}': '',
      '{{watermark}}': '',
      '{{qrcode_block}}': '',
      '{{currency}}': 'EUR',
      '{{language}}': 'fr',
    };
    let result = html;
    for (const [key, val] of Object.entries(demo)) {
      result = result.split(key).join(val);
    }
    return result;
  };

  const handleAnalyzeTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!sub.canUseCustomTemplate) { router.push('/paywall'); return; }
    setAnalyzingTemplate(true);
    setTemplateError('');
    setAnalyzedTemplateHtml(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/analyze-invoice-template', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur analyse');
      setAnalyzedTemplateHtml(data.template_html);
      setAnalyzedStyleDesc(data.style_description || 'Style personnalisé');
      if (data.accent_color) set('accent_color', data.accent_color);
    } catch (err: any) {
      setTemplateError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzingTemplate(false);
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!analyzedTemplateHtml) return;
    setSavingTemplate(true);
    try {
      await updateProfile({ custom_template_html: analyzedTemplateHtml, template_id: 0 } as any);
      setAnalyzedTemplateHtml(null);
      setAnalyzedStyleDesc('');
    } catch (e: any) { setTemplateError(e.message); }
    finally { setSavingTemplate(false); }
  };

  const handleResetCustomTemplate = async () => {
    if (!confirm('Revenir aux templates par défaut ?')) return;
    try {
      await updateProfile({ custom_template_html: null, template_id: parseInt(form.template_id) || 1 } as any);
    } catch (e: any) { setTemplateError(e.message); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnect = params.get('stripe-connect');
    const stripeConnectError = params.get('stripe-connect-error');
    const sumupConnected = params.get('sumup');
    const sumupError = params.get('sumup_error');

    if (stripeConnect === 'success') {
      setStripeStatus('connected');
      toast.success('Stripe connecté avec succès !');
      fetchProfile(profile?.id ?? '');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeConnectError) {
      setStripeStatus('error');
      toast.error(`Erreur de connexion Stripe: ${stripeConnectError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (sumupConnected === 'connected') {
      toast.success('SumUp connecté avec succès !');
      fetchProfile(profile?.id ?? '');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (sumupError) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Vous avez refusé l\'accès à SumUp.',
        'invalid_state': 'Session expirée. Veuillez réessayer.',
        'no_code': 'Code d\'autorisation manquant. Veuillez réessayer.',
        'no_user': 'Session expirée. Veuillez vous reconnecter.',
        'token_exchange_failed': 'Impossible d\'obtenir les identifiants SumUp. Vérifiez vos identifiants sur Vercel.',
        'profile_fetch_failed': 'Impossible de récupérer votre profil SumUp.',
        'db_update_failed': 'Erreur lors de la sauvegarde. Veuillez réessayer.',
        'unknown': 'Erreur inattendue. Veuillez réessayer.',
      };
      toast.error(errorMessages[sumupError] || `Erreur SumUp: ${sumupError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchWebhooks = async () => {
      const { data, error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) setWebhooks(data);
    };
    fetchWebhooks();
  }, [profile?.id]);

  const handleConnectStripe = async () => {
    setStripeConnectLoading(true);
    try {
      const res = await fetch('/api/stripe-connect/oauth-url', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Impossible de lancer la connexion Stripe');
    } catch (e: any) { toast.error(e.message || 'Erreur de connexion Stripe'); }
    finally { setStripeConnectLoading(false); }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm('Déconnecter votre compte Stripe ? Les liens de paiement existants ne seront plus actifs.')) return;
    setStripeConnectLoading(true);
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: null,
          stripe_connect_access_token: null,
          stripe_connect_refresh_token: null,
          stripe_connect_token_expires_at: null,
          stripe_connect_onboarding_completed: false,
        })
        .eq('id', profile?.id);
      await fetchProfile(profile?.id ?? '');
      setStripeStatus(null);
      toast.success('Stripe déconnecté');
    } catch (e: any) { toast.error(e.message || 'Erreur de déconnexion'); }
    finally { setStripeConnectLoading(false); }
  };

  useEffect(() => {
    fetch('/api/sumup/connect')
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setSumupConnected(true);
          setSumupMerchantCode(d.merchantCode || '');
          if (d.sumupEmail) setSumupEmail(d.sumupEmail);
          setSumupEmailMissing(!!d.emailMissing);
          if (d.tokenExpiresAt) setSumupTokenExpiresAt(d.tokenExpiresAt);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnectSumUp = () => {
    setSumupLoading(true);
    window.location.href = '/api/sumup/oauth';
  };

  const handleDisconnectSumUp = async () => {
    if (!confirm('Déconnecter votre compte SumUp ? Les liens de paiement existants ne seront plus actifs.')) return;
    setSumupLoading(true);
    try {
      const res = await fetch('/api/sumup/connect', { method: 'DELETE' });
      if (res.ok) {
        setSumupConnected(false);
        setSumupMerchantCode('');
        setSumupEmail('');
        setSumupEmailMissing(false);
        setSumupTokenExpiresAt(null);
        toast.success('SumUp déconnecté avec succès !');
      }
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la déconnexion SumUp'); }
    finally { setSumupLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateProfile({ ...form, template_id: parseInt(form.template_id) } as any);
      if (form.language !== profile?.language) await changeLanguage(form.language);
      await fetchProfile(profile?.id ?? '');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide (JPG, PNG, etc.).');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Non authentifié');
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await getSupabaseClient()
        .storage
        .from('logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        console.error('[Logo Upload] Upload error:', uploadError);
        throw uploadError;
      }
      const { data: { publicUrl } } = getSupabaseClient()
        .storage
        .from('logos')
        .getPublicUrl(filePath);
      await updateProfile({ logo_url: publicUrl } as any);
      toast.success('Logo mis à jour avec succès !');
    } catch (e: any) {
      console.error('[Logo Upload] Error:', e);
      setError(e.message || 'Erreur lors du téléchargement du logo');
      toast.error(e.message || 'Erreur lors du téléchargement du logo');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Impossible d\'accéder au portail');
    } catch (e: any) {
      toast.error(e.message || 'Erreur portail');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide (JPG, PNG, etc.).');
      return;
    }
    setUploadingSig(true);
    setError('');
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Non authentifié');
      const ext = file.name.split('.').pop();
      const fileName = `signature.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await getSupabaseClient()
        .storage
        .from('logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        console.error('[Signature Upload] Upload error:', uploadError);
        throw uploadError;
      }
      const { data: { publicUrl } } = getSupabaseClient()
        .storage
        .from('logos')
        .getPublicUrl(filePath);
      await updateProfile({ signature_url: publicUrl } as any);
      toast.success('Signature mise à jour avec succès !');
    } catch (e: any) {
      console.error('[Signature Upload] Error:', e);
      setError(e.message || 'Erreur lors du téléchargement de la signature');
      toast.error(e.message || 'Erreur lors du téléchargement de la signature');
    } finally {
      setUploadingSig(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveSignature = async () => {
    try {
      await updateProfile({ signature_url: null } as any);
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      await signOut();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression du compte');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      toast.loading('Déconnexion en cours...', { id: 'logout' });
      await signOut();
      toast.success('Déconnecté avec succès', { id: 'logout' });
    } catch (error) {
      toast.error('Erreur lors de la déconnexion', { id: 'logout' });
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  const handleToggleWebhookEvent = (eventValue: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter((e) => e !== eventValue)
        : [...prev.events, eventValue],
    }));
  };

  const handleSaveWebhook = async () => {
    if (!webhookForm.url.trim() || webhookForm.events.length === 0 || !profile?.id) return;
    setSavingWebhook(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .insert({ user_id: profile.id, url: webhookForm.url.trim(), events: webhookForm.events, active: true })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setWebhooks((prev) => [data, ...prev]);
      setShowWebhookModal(false);
      setWebhookForm({ url: '', events: [] });
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la sauvegarde'); }
    finally { setSavingWebhook(false); }
  };

  const handleToggleWebhookActive = async (webhook: WebhookEndpoint) => {
    const { error } = await getSupabaseClient()
      .from('webhook_endpoints')
      .update({ active: !webhook.active })
      .eq('id', webhook.id);
    if (!error) {
      setWebhooks((prev) => prev.map((w) => w.id === webhook.id ? { ...w, active: !w.active } : w));
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setDeletingWebhookId(id);
    try {
      const { error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la suppression'); }
    finally { setDeletingWebhookId(null); }
  };

  // ── Section Renderers ──────────────────────────────────────────────────────

  const renderCompanySection = () => (
    <div className="space-y-4">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-slate-500">{(form.company_name || 'F').charAt(0)}</span>
            )}
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-slate-300 text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={14} />
            )}
            {profile?.logo_url ? 'Changer' : 'Ajouter un logo'}
          </button>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG · max 2MB</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>
      <CompanySearch
        label="Nom de l'entreprise"
        value={form.company_name}
        onChange={(v) => set('company_name', v)}
        onSelect={(company) => {
          set('company_name', company.name);
          if (company.siret) set('siret', company.siret);
          if (company.address) set('address', company.address);
          if (company.postal_code) set('postal_code', company.postal_code);
          if (company.city) set('city', company.city);
          if (company.vat_number) set('vat_number', company.vat_number);
        }}
        placeholder="Rechercher votre entreprise..."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Téléphone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <Input label="Adresse" value={form.address} onChange={(e) => set('address', e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="CP" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
        <Input label="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} className="col-span-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Statut juridique" value={form.legal_status} onChange={(e) => set('legal_status', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} />
        <Select label="Secteur" value={form.sector} onChange={(e) => set('sector', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="SIRET" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
        <Input label="N° TVA" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
      </div>
    </div>
  );

  const renderBillingSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Préfixe numéro" value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} placeholder="FACT" />
        <Select label="Devise" value={form.currency} onChange={(e) => set('currency', e.target.value)} options={CURRENCY_OPTS} />
      </div>
      <Textarea label="Conditions de paiement" value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} rows={2} placeholder="Payable sous 30 jours par virement..." />
      <Textarea label="Mentions légales" value={form.legal_mention} onChange={(e) => set('legal_mention', e.target.value)} rows={2} placeholder="Numéro RCS, capital social..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="RCS" value={form.rcs_number} onChange={(e) => set('rcs_number', e.target.value)} placeholder="RCS Paris 123 456 789" />
        <div>
          <Input label="RM" value={form.rm_number} onChange={(e) => set('rm_number', e.target.value)} placeholder="RM 1234567" />
          <p className="text-[10px] text-slate-500 mt-0.5">Uniquement pour les artisans</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Capital social" value={form.capital_social} onChange={(e) => set('capital_social', e.target.value)} placeholder="10 000" />
        <Input label="NAF/APE" value={form.naf_code} onChange={(e) => set('naf_code', e.target.value)} placeholder="6202A" />
      </div>
      <Select label="Régime fiscal" value={form.regime_fiscal} onChange={(e) => set('regime_fiscal', e.target.value)} options={[
        { value: 'reel', label: 'Réel normal' },
        { value: 'reel_simplifie', label: 'Réel simplifié' },
        { value: 'micro', label: 'Micro-entreprise' },
        { value: 'micro_bic', label: 'Micro BIC' },
        { value: 'micro_bnc', label: 'Micro BNC' },
        { value: 'autoliquidation', label: 'Autoliquidation' },
      ]} />
      <div>
        <Textarea label="Conditions Générales de Vente" value={form.cgv_text} onChange={(e) => set('cgv_text', e.target.value)} rows={4} placeholder="Saisissez vos CGV ici..." />
        <p className="text-[10px] text-slate-500 mt-0.5">Ces conditions seront ajoutées automatiquement à vos factures et devis</p>
      </div>
    </div>
  );

  const renderTemplateSection = () => (
    <div className="space-y-4">
      {profile?.custom_template_html && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
          <Sparkles size={15} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-300">Template personnalisé actif</p>
          <button onClick={handleResetCustomTemplate} className="ml-auto text-xs text-emerald-400/70 hover:text-emerald-300 font-semibold transition-colors">Réinitialiser</button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { id: '1', name: 'Minimaliste', desc: 'Épuré', headerColor: '#1D9E75', headerH: 'h-1' },
          { id: '2', name: 'Classique', desc: 'Sobre', headerColor: '#1e293b', headerH: 'h-5' },
          { id: '3', name: 'Moderne', desc: 'Coloré', headerColor: '#1D9E75', headerH: 'h-5' },
          { id: '4', name: 'Élégant', desc: 'Chaleureux', headerColor: '#fbbf24', headerH: 'h-1' },
          { id: '5', name: 'Corporate', desc: 'Pro', headerColor: '#475569', headerH: 'h-5' },
          { id: '6', name: 'Nature', desc: 'Organique', headerColor: '#15803d', headerH: 'h-5' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { if (!profile?.custom_template_html) set('template_id', t.id); }}
            className={`relative p-3 rounded-xl border text-center transition-all duration-300 ${
              profile?.custom_template_html ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-100/20'
              : form.template_id === t.id
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-gray-200 bg-gray-100/20 hover:border-gray-300'
            }`}
            style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
          >
            <div className="w-full h-14 rounded-lg bg-gray-200 mb-2 overflow-hidden flex flex-col border border-gray-200">
              <div style={{ backgroundColor: t.headerColor }} className={`${t.headerH} w-full`} />
              <div className="flex-1 p-1.5 space-y-1">
                <div className="bg-slate-600/40 h-1.5 rounded-full w-2/3" />
                <div className="bg-slate-600/20 h-1 rounded-full w-full" />
                <div className="bg-slate-600/20 h-1 rounded-full w-4/5" />
              </div>
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">{t.name}</p>
            <p className="text-[10px] text-slate-500">{t.desc}</p>
            {form.template_id === t.id && !profile?.custom_template_html && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 size={10} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* AI Template Upload */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className={sub.canUseCustomTemplate ? 'text-emerald-400' : 'text-gray-400'} />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Importer un template avec l'IA</h4>
          {!sub.canUseCustomTemplate && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">PRO</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">Uploadez une facture et l'IA créera un template basé sur son style.</p>

        {sub.canUseCustomTemplate ? (
          <div className="space-y-3">
            <div
              onClick={() => templateFileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-gray-300 p-4 text-center transition-all cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/5"
            >
              <input ref={templateFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAnalyzeTemplate} />
              {analyzingTemplate ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-400">L'IA analyse votre facture...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={20} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-400">Glissez ou <span className="text-emerald-400">parcourez</span></p>
                  <p className="text-[10px] text-gray-400">PNG, JPG, PDF</p>
                </div>
              )}
            </div>

            {analyzedTemplateHtml && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Template généré</p>
                    <p className="text-[10px] text-emerald-400/70">{analyzedStyleDesc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplatePreview(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-slate-300 hover:border-white/20 hover:text-gray-900 transition-colors"
                  >
                    <Eye size={13} /> Aperçu
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomTemplate}
                    disabled={savingTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {savingTemplate ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    Sauvegarder
                  </button>
                </div>
              </div>
            )}

            {templateError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="text-red-400" />
                <p className="text-xs text-red-400">{templateError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-xs text-slate-500">Disponible avec le plan Pro</p>
            <button onClick={() => router.push('/paywall')} className="mt-2 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors">Voir les offres →</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderBankSection = () => (
    <div className="space-y-4">
      <Input label="Banque" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="BNP Paribas" />
      <Input label="IBAN" value={form.iban} onChange={(e) => set('iban', e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
      <Input label="BIC/SWIFT" value={form.bic} onChange={(e) => set('bic', e.target.value)} placeholder="BNPAFRPP" />
    </div>
  );

  const renderStripeSection = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Connectez votre compte Stripe professionnel pour accepter des paiements en ligne directement sur vos factures.
      </p>

      {stripeStatus === 'connected' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-300">Stripe connecté avec succès !</p>
        </div>
      )}
      {stripeStatus === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
          <XCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">Erreur lors de la connexion. Réessayez.</p>
        </div>
      )}

      {profile?.stripe_connect_account_id ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-300">Compte Stripe connecté</p>
              <p className="text-xs text-emerald-400/60 font-mono truncate">{profile.stripe_connect_account_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Link2 size={14} className="text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              Un bouton <strong>Payer en ligne</strong> apparaît sur vos factures. Les paiements arrivent directement sur votre compte Stripe.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDisconnectStripe}
            disabled={stripeConnectLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Unlink size={14} />
            Déconnecter Stripe
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              { label: 'Paiement par carte', desc: 'Visa, Mastercard, Amex' },
              { label: 'Virement direct', desc: 'Les fonds vont sur votre Stripe' },
              { label: 'Mise à jour auto', desc: 'Facture passée en "Payée"' },
            ].map((f) => (
              <div key={f.label} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-slate-300">{f.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleConnectStripe}
            disabled={stripeConnectLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] text-gray-900 dark:text-white text-sm font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-50"
          >
            {stripeConnectLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Link2 size={15} />
            )}
            Connecter avec Stripe
          </button>
        </div>
      )}
    </div>
  );

  const renderSumUpSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Acceptez des paiements en ligne directement sur vos factures avec SumUp.
        </p>
        <button
          type="button"
          onClick={() => setShowSumupTutorial(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-gray-100 transition-colors"
        >
          <HelpCircle size={12} />
          Aide
        </button>
      </div>

      {sumupConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-emerald-300">Compte SumUp connecté</p>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">Actif</span>
              </div>
              <p className="text-xs text-emerald-400/60 font-mono truncate">{sumupMerchantCode}</p>
              {sumupTokenExpiresAt && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-500">
                    Token expire : {new Date(sumupTokenExpiresAt).toLocaleDateString('fr-FR')}
                  </p>
                  {new Date(sumupTokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && (
                    <button
                      type="button"
                      onClick={handleConnectSumUp}
                      className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 underline transition-colors"
                    >
                      Reconnecter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Link2 size={14} className="text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              Un bouton <strong>Payer avec SumUp</strong> apparaît sur vos factures.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDisconnectSumUp}
            disabled={sumupLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Unlink size={14} />
            Déconnecter SumUp
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-[10px] font-bold text-red-400 uppercase">Non connecté</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Carte', desc: 'Visa, Mastercard', icon: CreditCard },
              { label: 'Terminal', desc: 'En personne', icon: Smartphone },
              { label: 'Auto', desc: 'Statut mis à jour', icon: RefreshCw },
            ].map((f) => (
              <div key={f.label} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <f.icon size={16} className="text-slate-500 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-slate-300">{f.label}</p>
                <p className="text-[9px] text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleConnectSumUp}
            disabled={sumupLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {sumupLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} />
                <span>Connecter avec SumUp</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Vous serez redirigé vers SumUp pour autoriser l'accès à votre compte en toute sécurité.
          </p>
        </div>
      )}
    </div>
  );

  const renderSignatureSection = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Ajoutez votre signature manuscrite. Elle apparaîtra automatiquement en bas de vos factures et devis.</p>

      <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/15">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <PenTool size={18} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">À quoi sert la signature électronique ?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Votre signature manuscrite sera <strong className="text-slate-300">ajoutée automatiquement en bas de tous vos documents PDF</strong>. Cela donne un aspect professionnel et authentique à vos documents.
            </p>
            <div className="mt-2 text-xs text-slate-500">
              <strong className="text-blue-400">Note :</strong> Cette signature est différente de la signature client par email (disponible avec Pro). Ici, c'est VOTRE signature.
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-full sm:w-48 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile?.signature_url ? (
            <img src={profile.signature_url} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
          ) : (
            <div className="text-center">
              <PenTool size={20} className="text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Aucune signature</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => sigFileRef.current?.click()}
            disabled={uploadingSig}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-slate-300 text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            {uploadingSig ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={14} />
            )}
            {profile?.signature_url ? 'Changer la signature' : 'Importer une signature'}
          </button>
          {profile?.signature_url && (
            <button type="button" onClick={handleRemoveSignature} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
              <X size={12} />
              Supprimer la signature
            </button>
          )}
          <p className="text-xs text-slate-500">PNG transparent recommandé · max 1MB</p>
          <input ref={sigFileRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
        </div>
      </div>
      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/15">
        <p className="text-xs text-blue-300">
          <strong>Conseil :</strong> Signez sur une feuille blanche, prenez une photo, puis utilisez un outil en ligne pour supprimer le fond et exporter en PNG transparent.
        </p>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-4">
      <Select label="Langue" value={form.language} onChange={(e) => set('language', e.target.value)} options={LANG_OPTS} />

      {/* Keyboard shortcuts */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <Keyboard size={18} className="text-slate-400" />
          <div>
            <label className="text-sm font-semibold text-gray-900 dark:text-white block">Raccourcis clavier</label>
            <p className="text-xs text-slate-500 mt-0.5">
              {require('@/hooks/useKeyboardShortcuts').areShortcutsDisabled()
                ? 'Désactivés — Utilisez le bouton ? pour réactiver'
                : 'Activés — Appuyez sur ? pour voir la liste'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const { areShortcutsDisabled, setShortcutsDisabled } = require('@/hooks/useKeyboardShortcuts');
            const newState = !areShortcutsDisabled();
            setShortcutsDisabled(newState);
            toast.success(newState ? 'Raccourcis clavier désactivés' : 'Raccourcis clavier activés');
            forceUpdate();
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
            !require('@/hooks/useKeyboardShortcuts').areShortcutsDisabled()
              ? 'bg-emerald-500'
              : 'bg-slate-700'
          }`}
          style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              !require('@/hooks/useKeyboardShortcuts').areShortcutsDisabled()
                ? 'translate-x-6'
                : 'translate-x-1'
            }`}
            style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
          />
        </button>
      </div>

      {/* Accent color */}
      <div>
        <label className="text-sm font-semibold text-slate-300 block mb-2">Couleur accent</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAccentOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div
              className="w-6 h-6 rounded-full border border-gray-300"
              style={{ backgroundColor: form.accent_color }}
            />
            <span className="text-sm font-medium text-slate-300">{form.accent_color}</span>
            <Palette size={14} className="text-slate-500" />
          </button>
          <span className="text-xs text-slate-500">Cliquez pour personnaliser</span>
        </div>

        <Dialog open={accentOpen} onOpenChange={setAccentOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-300">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Palette className="h-5 w-5" />
                Choisir la couleur accent
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Personnalisez la couleur principale de votre espace de travail
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm font-medium text-slate-300">Couleurs prédéfinies</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-10 w-10 rounded-full border-2 transition-all cursor-pointer ${
                          form.accent_color === c
                            ? 'border-white scale-110'
                            : 'hover:scale-105 border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => { set('accent_color', c); setAccentOpen(false); }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-slate-300">Couleur personnalisée</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => set('accent_color', e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-md border border-gray-300 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={form.accent_color}
                      onChange={(e) => {
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          set('accent_color', e.target.value);
                        }
                      }}
                      placeholder="#000000"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 bg-gray-100 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                    />
                  </div>
                </div>
                <div
                  className="rounded-xl border border-gray-300 p-4"
                  style={{ backgroundColor: form.accent_color + '20' }}
                >
                  <p className="text-sm font-medium" style={{ color: form.accent_color }}>
                    Aperçu : voici comment votre couleur accent apparaîtra dans l'application.
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setAccentOpen(false)}>Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  const renderWebhooksSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Recevez des notifications HTTP POST quand une facture est créée, envoyée ou payée.
        </p>
        <button
          onClick={() => { setWebhookForm({ url: '', events: [] }); setShowWebhookModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors"
        >
          <Plus size={13} />
          Ajouter
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-gray-300">
          <Globe size={22} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Aucun webhook configuré</p>
          <p className="text-xs text-gray-400 mt-1">Ajoutez une URL pour recevoir des notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{wh.url}</p>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    wh.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {wh.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {wh.events.map((ev) => (
                    <span key={ev} className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-md font-medium">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleToggleWebhookActive(wh)}
                  className="text-xs text-slate-500 hover:text-emerald-400 transition-colors font-medium"
                  title={wh.active ? 'Désactiver' : 'Activer'}
                >
                  {wh.active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDeleteWebhook(wh.id)}
                  disabled={deletingWebhookId === wh.id}
                  className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-4">
      {/* Subscription info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Mon abonnement</h4>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          sub.tier === 'business' ? 'bg-purple-500/20 text-purple-400' :
          sub.tier === 'pro' ? 'bg-amber-500/20 text-amber-400' :
          sub.tier === 'solo' ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {sub.tier === 'business' ? <Sparkles size={11} /> : sub.tier === 'pro' ? <Crown size={11} /> : sub.tier === 'solo' ? <Zap size={11} /> : null}
          {sub.tier === 'free' ? 'Gratuit' : sub.tier === 'solo' ? 'Solo' : sub.tier === 'pro' ? 'Pro' : 'Business'}
        </div>
      </div>

      {/* Subscription upgrade for free users */}
      {sub.isFree && (
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-sm font-semibold text-emerald-300 mb-1">Passez à Solo ou Pro</p>
          <p className="text-xs text-slate-400 mb-3">Factures illimitées, dictée vocale IA, templates premium et bien plus.</p>
          <button onClick={() => router.push('/paywall')} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors">
            <Zap size={14} />
            Voir les offres
            <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      {/* Active subscription management */}
      {!sub.isFree && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CreditCard size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Abonnement actif</p>
                <p className="text-xs text-slate-500">Gérez votre facturation et vos méthodes de paiement</p>
              </div>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-slate-300 hover:border-white/20 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {portalLoading ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <ArrowUpRight size={14} />}
              Gérer
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <XCircle size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Résilier l&apos;abonnement</p>
                <p className="text-xs text-slate-500">Accédez au portail Stripe pour résilier</p>
              </div>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Résilier
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/15">
            <ArrowUpRight size={14} className="text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              Pour changer de plan, <button onClick={() => router.push('/paywall')} className="font-semibold underline underline-offset-2">consultez les offres</button> ou gérez directement depuis le portail Stripe.
            </p>
          </div>
        </div>
      )}

      {/* Team management - Business */}
      {sub.isBusiness && (
        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users size={16} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Équipe</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">BUSINESS</span>
              </div>
              <p className="text-xs text-slate-500">Invitez des collaborateurs et attribuez des rôles</p>
            </div>
          </div>
          <Link
            href="/settings/team"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-slate-300 hover:border-white/20 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <ArrowUpRight size={14} />
            Gérer
          </Link>
        </div>
      )}

      {/* Referral */}
      {sub.isFree && (
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/15">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-emerald-400" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Parrainage</h4>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Parrainez un ami et gagnez 1 mois gratuit pour chaque inscription !
          </p>
          <button
            onClick={() => router.push('/settings/referral')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
          >
            <Zap size={14} />
            Mon lien de parrainage
          </button>
        </div>
      )}

      {/* Accounting export */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Export comptabilité</h4>
        <p className="text-xs text-slate-400 mb-3">Exportez vos écritures comptables au format FEC pour votre expert-comptable.</p>
        <div className="flex gap-2 flex-wrap">
          {[new Date().getFullYear(), new Date().getFullYear() - 1].map((year) => (
            <a
              key={year}
              href={`/api/export/fec?year=${year}`}
              className="flex items-center gap-2 border border-gray-300 text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold hover:border-white/20 hover:text-gray-900 transition-colors"
            >
              <Download size={14} />
              FEC {year}
            </a>
          ))}
        </div>
      </div>

      {/* Account actions */}
      <div className="pt-4 border-t border-gray-200 space-y-4">
        {/* Logout */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-300">Se déconnecter</p>
            <p className="text-xs text-slate-500">Vous serez redirigé vers la page de connexion</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-slate-400 hover:border-white/20 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                Déconnexion
              </>
            )}
          </button>
        </div>

        {/* RGPD Export */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-300">Exporter mes données (RGPD)</p>
            <p className="text-xs text-slate-500">Téléchargez une archive ZIP de vos données personnelles.</p>
          </div>
          <a
            href="/api/export/rgpd"
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/20 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
          >
            <Download size={14} />
            Exporter
          </a>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-400">Supprimer le compte</p>
            <p className="text-xs text-slate-500">Supprime définitivement votre compte, vos factures et vos clients. Irréversible.</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );

  // ── Section Map ────────────────────────────────────────────────────────────

  const sectionRenderers: Record<TabKey, () => React.ReactNode> = {
    company: renderCompanySection,
    billing: renderBillingSection,
    template: renderTemplateSection,
    bank: renderBankSection,
    stripe: renderStripeSection,
    sumup: renderSumUpSection,
    signature: renderSignatureSection,
    preferences: renderPreferencesSection,
    webhooks: renderWebhooksSection,
    account: renderAccountSection,
  };

  const sectionLabels: Record<TabKey, string> = {
    company: 'Entreprise',
    billing: 'Facturation',
    template: 'Modèle de facture',
    bank: 'Coordonnées bancaires',
    stripe: 'Paiement en ligne (Stripe)',
    sumup: 'Paiement en ligne (SumUp)',
    signature: 'Signature électronique',
    preferences: 'Préférences',
    webhooks: 'Webhooks sortants',
    account: 'Gestion du compte',
  };

  return (
    <>
      <h1 className="sr-only">Paramètres - Factu.me</h1>
      <main aria-label="Paramètres du compte">
        <div className="min-h-screen">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Paramètres</h2>
            {!sub.isFree && (
              <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-full">
                <Crown size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 capitalize">{sub.tier}</span>
              </div>
            )}
          </div>

          {/* Subscription banner for free users */}
          {sub.isFree && (
            <button
              onClick={() => router.push('/paywall')}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-500 hover:to-emerald-400 transition-all text-left mb-6"
              style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
            >
              <Crown size={22} className="text-amber-300 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Passer à Solo ou Pro</p>
                <p className="text-sm text-emerald-100/80">Factures illimitées, dictée vocale, templates...</p>
              </div>
            </button>
          )}

          {/* Desktop: sidebar + content layout */}
          <div className="lg:flex lg:gap-6">
            {/* Desktop sidebar */}
            <nav className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-6 space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.key
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-gray-100'
                    }`}
                    style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Mobile: horizontal scrollable tab bar */}
            <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                      activeTab === tab.key
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-gray-50 text-slate-400 border border-gray-200 hover:text-slate-300'
                    }`}
                    style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              <form onSubmit={handleSave} className="space-y-4">
                {/* Active section card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {sectionLabels[activeTab]}
                  </h3>
                  {sectionRenderers[activeTab]?.()}
                </div>

                {/* Save button (for form sections) */}
                {['company', 'billing', 'template', 'bank', 'preferences'].includes(activeTab) && (
                  <>
                    {error && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                        <AlertTriangle size={14} />
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 px-6 rounded-xl bg-emerald-500 text-white font-semibold transition-all duration-300 disabled:opacity-50"
                      style={{ transitionTimingFunction: `cubic-bezier(${EASE.join(',')})` }}
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enregistrement...
                        </span>
                      ) : saved ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} />
                          Enregistré !
                        </span>
                      ) : (
                        'Enregistrer les modifications'
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>

          {/* Webhook modal */}
          <Modal
            open={showWebhookModal}
            onClose={() => setShowWebhookModal(false)}
            title="Ajouter un webhook"
            size="sm"
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1.5">URL de destination</label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://votre-serveur.com/webhook"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">Événements à écouter</label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(ev.value)}
                        onChange={() => handleToggleWebhookEvent(ev.value)}
                        className="w-4 h-4 rounded border-slate-600 bg-gray-100 text-emerald-500 focus:ring-emerald-500/30"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-gray-900 transition-colors">{ev.label}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{ev.value}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/15">
                <p className="text-xs text-amber-300">
                  Votre URL recevra un POST avec <code className="font-mono bg-amber-500/15 px-1 rounded">{"{ event, data, timestamp }"}</code>. Assurez-vous qu&apos;elle est accessible publiquement.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-slate-300 text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  disabled={!webhookForm.url.trim() || webhookForm.events.length === 0 || savingWebhook}
                  onClick={handleSaveWebhook}
                >
                  {savingWebhook ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </div>
          </Modal>

          {/* Template preview modal */}
          <Modal
            open={showTemplatePreview}
            onClose={() => setShowTemplatePreview(false)}
            title="Aperçu du template"
            size="xl"
          >
            {analyzedTemplateHtml && (
              <div className="space-y-3">
                <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ maxHeight: '70vh' }}>
                  <iframe
                    srcDoc={buildPreviewHtml(analyzedTemplateHtml)}
                    className="w-full border-0"
                    style={{ height: '600px', minWidth: '600px', transform: 'scale(0.6)', transformOrigin: 'top left', width: '166.6%' }}
                    title="Template preview"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplatePreview(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-slate-300 text-sm font-semibold hover:bg-white/15 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    disabled={savingTemplate}
                    onClick={async () => { await handleSaveCustomTemplate(); setShowTemplatePreview(false); }}
                  >
                    {savingTemplate ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      'Sauvegarder ce template'
                    )}
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* Delete account confirmation modal */}
          <Modal
            open={showDeleteModal}
            onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeletePassword(''); }}
            title="Supprimer le compte"
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/15">
                <ShieldAlert size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300 font-medium">
                  Cette action est <strong>irréversible</strong>. Vos données personnelles seront anonymisées conformément au RGPD. Les factures existantes sont conservées pour des raisons légales comptables.
                </p>
              </div>

              <ul className="text-sm text-slate-400 space-y-1 pl-4">
                <li className="list-disc">Vos données personnelles seront anonymisées</li>
                <li className="list-disc">Votre abonnement Stripe sera annulé</li>
                <li className="list-disc">Vos connexions tierces (Google, SumUp) seront supprimées</li>
                <li className="list-disc">Les factures déjà émises seront conservées (obligation légale)</li>
              </ul>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-2">
                  Tapez <span className="font-black text-red-400">SUPPRIMER</span> pour confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeletePassword(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-slate-300 text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'SUPPRIMER' || !deletePassword || deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </Modal>

          {/* SumUp Tutorial Modal */}
          <SumUpTutorialModal
            isOpen={showSumupTutorial}
            onClose={() => setShowSumupTutorial(false)}
          />
        </div>
      </main>

      {/* Hide scrollbar for mobile tab bar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
