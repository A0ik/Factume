'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useInvoiceRealtime } from '@/hooks/use-invoice-realtime';
import { formatCurrency } from '@/lib/utils';
import { downloadInvoicePdf, hasPaymentLink, getPaymentUrl } from '@/lib/pdf';
import { Invoice, InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Edit2, Download, Mail, CreditCard, Copy, CheckCircle,
  Clock, AlertTriangle, FileText, Send, Trash2, MoreVertical,
  Receipt, ShoppingCart, Truck, RefreshCw, Banknote, Check,
  ExternalLink, X, Loader2, Building2, Calendar, Hash, Eye,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import EmailPreviewModal from '@/components/ui/EmailPreviewModal';
import QuoteActionModal from '@/components/ui/QuoteActionModal';
import PdfPreviewModal from '@/components/ui/PdfPreviewModal';
import PaymentProviderModal from '@/components/ui/PaymentProviderModal';
import PaymentLinkSuccessModal from '@/components/ui/PaymentLinkSuccessModal';
import { FacturXButton, FacturXInfoTooltip } from '@/components/ui/FacturXButton';
import { isFacturXEligible } from '@/lib/facturx';
import { motion, AnimatePresence } from 'framer-motion';
import MobileActionBar from '@/components/invoices/InvoiceMobileActionBar';
import { PdpStatusBadge } from '@/components/invoices/PdpStatusBadge';

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function getDocListPath(type: string): string {
  const map: Record<string, string> = {
    invoice: '/documents/factures',
    quote: '/documents/devis',
    credit_note: '/documents/avoirs',
    purchase_order: '/documents/commandes',
    delivery_note: '/documents/livraisons',
    deposit: '/documents/acomptes',
  };
  return map[type] ?? '/documents/factures';
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; dotColor: string; icon: any }> = {
  draft:     { label: 'Brouillon',   color: 'text-slate-400',    bg: 'bg-gray-100',     dotColor: 'bg-slate-500',    icon: FileText },
  sent:      { label: 'Envoyée',     color: 'text-blue-400',     bg: 'bg-blue-500/10',      dotColor: 'bg-blue-400',     icon: Send },
  paid:      { label: 'Payée',       color: 'text-emerald-400',  bg: 'bg-emerald-500/10',   dotColor: 'bg-emerald-400',  icon: CheckCircle },
  overdue:   { label: 'En retard',   color: 'text-red-400',      bg: 'bg-red-500/10',       dotColor: 'bg-red-400',      icon: AlertTriangle },
  accepted:  { label: 'Accepté',     color: 'text-teal-400',     bg: 'bg-teal-500/10',      dotColor: 'bg-teal-400',     icon: Check },
  refused:   { label: 'Refusé',      color: 'text-orange-400',   bg: 'bg-orange-500/10',    dotColor: 'bg-orange-400',   icon: X },
  cancelled: { label: 'Annulé',      color: 'text-red-400',      bg: 'bg-red-500/10',       dotColor: 'bg-red-400',      icon: X },
  refunded:  { label: 'Remboursé',   color: 'text-orange-400',   bg: 'bg-orange-500/10',    dotColor: 'bg-orange-400',   icon: X },
  rejected:  { label: 'Rejeté',      color: 'text-red-400',      bg: 'bg-red-500/10',       dotColor: 'bg-red-400',      icon: X },
  expired:   { label: 'Expiré',      color: 'text-slate-400',    bg: 'bg-gray-100',     dotColor: 'bg-slate-500',    icon: AlertTriangle },
  pending:   { label: 'En attente',  color: 'text-yellow-400',   bg: 'bg-yellow-500/10',    dotColor: 'bg-yellow-400',   icon: AlertTriangle },
  partial:   { label: 'Partiel',     color: 'text-blue-400',     bg: 'bg-blue-500/10',      dotColor: 'bg-blue-400',     icon: CheckCircle },
  delivered: { label: 'Livré',       color: 'text-emerald-400',  bg: 'bg-emerald-500/10',   dotColor: 'bg-emerald-400',  icon: CheckCircle },
};

const DOC_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  invoice:        { label: 'Facture',           icon: Receipt,      color: 'text-emerald-400' },
  quote:          { label: 'Devis',             icon: FileText,     color: 'text-blue-400' },
  purchase_order: { label: 'Bon de commande',   icon: ShoppingCart, color: 'text-amber-400' },
  delivery_note:  { label: 'Bon de livraison',  icon: Truck,        color: 'text-cyan-400' },
  credit_note:    { label: 'Avoir',             icon: RefreshCw,    color: 'text-purple-400' },
  deposit:        { label: "Facture d'acompte", icon: Banknote,     color: 'text-emerald-400' },
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, session } = useAuthStore();
  const { invoices, updateInvoiceStatus, deleteInvoice, duplicateInvoice } = useDataStore();
  const { isFree, isPro, isBusiness, isTrialActive, tier } = useSubscription();

  const canUseFacturX = isPro || isBusiness || isTrialActive;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [retrying, setRetrying] = useState(false);

  // ATELIER (e-invoicing) — bouton « Réessayer la transmission » : relance
  // manuellement POST /api/invoices/transmit (utile si la transmission auto a
  // échoué : SIRET manquant à l'époque, 403 enrollment, erreur réseau…).
  const handleRetryTransmission = async () => {
    if (!invoice || retrying) return;
    setRetrying(true);
    try {
      const res = await fetch('/api/invoices/transmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setInvoice((inv) => inv ? {
          ...inv,
          pdp_status: 'transmitted',
          pdp_transmission_id: data.superPdpId ?? inv.pdp_transmission_id,
          pdp_transmitted_at: new Date().toISOString(),
          pdp_last_error: undefined,
        } as Invoice : inv);
      } else {
        setInvoice((inv) => inv ? {
          ...inv,
          pdp_status: 'failed',
          pdp_last_error: data?.error || data?.message || 'Échec de la transmission',
        } as Invoice : inv);
      }
    } catch (e: any) {
      setInvoice((inv) => inv ? {
        ...inv,
        pdp_status: 'failed',
        pdp_last_error: e?.message || 'Erreur réseau',
      } as Invoice : inv);
    } finally {
      setRetrying(false);
    }
  };
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showQuoteActionModal, setShowQuoteActionModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentSuccessUrl, setPaymentSuccessUrl] = useState('');
  // FIXER (BUG 1) — drapeau one-shot pour forcer la régénération du lien quand
  // l'utilisateur change de prestataire (contourne le verrou early-return des routes).
  const forcePaymentSwitchRef = useRef(false);
  // INSPECTOR (BUG 3) — anti-boucle pour l'auto-régén silencieuse : on ne retente
  // qu'une fois par facture (clé = invoice.id) tant que le drapeau stale est levé.
  const autoRegenAttemptedRef = useRef<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isReminder, setIsReminder] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [generatingSumUpLink, setGeneratingSumUpLink] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFacturXDetails, setShowFacturXDetails] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  const { invoice: realtimeInvoice } = useInvoiceRealtime(invoice ? invoice.id : undefined);

  useEffect(() => {
    if (realtimeInvoice) {
      if (previousStatus && previousStatus !== 'paid' && realtimeInvoice.status === 'paid') {
        toast.success('Paiement reçu ! La facture a été marquée comme payée.', {
          duration: 5000,
          position: 'top-right',
        });
      }
      setPreviousStatus(realtimeInvoice.status);
      setInvoice(realtimeInvoice);
    } else {
      const found = invoices.find((inv) => inv.id === id);
      if (found) {
        setInvoice(found);
        setPreviousStatus(found.status);
      }
    }
  }, [realtimeInvoice, invoices, id]);

  useEffect(() => {
    if (searchParams.get('paid') === 'true' && invoice && invoice.status !== 'paid') {
      updateInvoiceStatus(id, 'paid').then(() => {
        toast.success('Paiement reçu ! La facture a été marquée comme payée.', { duration: 5000 });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, invoice?.id, id]);

  // INSPECTOR (BUG 3) — Auto-régén silencieuse : quand une édition de prix a
  // invalidé le lien (payment_link_stale), on recrée immédiatement le lien au
  // même prestataire, sans intervention utilisateur. En cas d'échec (prestataire
  // déconnecté, réseau), le drapeau reste levé → la bannière ci-dessous invite à
  // recréer manuellement. Le PDF n'affiche AUCUN QR tant que stale = true.
  //
  // ⚠️ FIX React #310 (Règles des hooks) : cet effet DOIT rester AVANT le return
  // anticipé « if (!invoice) » ci-dessous. Placé après, le 2e rendu (une fois la
  // facture chargée) appelait un hook de plus que le 1er rendu (où l'on return
  // avant de l'atteindre) → « Rendered more hooks than during the previous render »
  // → error boundary → page d'erreur générique sur TOUTE facture. La garde interne
  // « if (!invoice) return » le rend inactif tant que la facture est nulle.
  useEffect(() => {
    if (!invoice) return;
    if (
      invoice.payment_link_stale &&
      invoice.payment_provider &&
      autoRegenAttemptedRef.current !== invoice.id
    ) {
      autoRegenAttemptedRef.current = invoice.id;
      const provider = invoice.payment_provider;
      (provider === 'stripe' ? handleCreatePaymentLink(true, true) : handleSumUpLink(true, true)).catch(() => {
        toast.error('Lien de paiement obsolète — recréez-le via « Lien de paiement ».');
      });
    }
    // Le lien n'est plus stale (régén réussie) → on réarme le verrou.
    if (!invoice.payment_link_stale && autoRegenAttemptedRef.current === invoice.id) {
      autoRegenAttemptedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, invoice?.payment_link_stale, invoice?.payment_provider]);

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const docCfg = DOC_CONFIG[invoice.document_type] || DOC_CONFIG.invoice;
  const DocIcon = docCfg.icon;
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client inconnu';
  const clientEmail = invoice.client?.email || '';

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const facturXEligibility = profile ? isFacturXEligible(invoice, profile) : { eligible: false, reason: 'Profil utilisateur manquant', warnings: [] };
  const facturXWarnings = facturXEligibility.warnings || [];

  const handleDownloadPdf = async () => {
    await downloadInvoicePdf(invoice, profile);
  };

  const handleSendEmail = async (email: string, subject: string, message: string) => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          email: email.trim(),
          subject,
          message,
          profile,
          isReminder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (invoice.status === 'draft') await updateInvoiceStatus(id, 'sent');
      toast.success(`Facture envoyée à ${email} !`);
      // Notification e-invoicing PDP
      if (data.pdpTransmission?.transmitted) {
        toast.success("Facture envoyée et transmise à l'État", { duration: 6000 });
      } else if (data.pdpTransmission && !data.pdpTransmission.transmitted) {
        toast.info("Facture envoyée. Transmission électronique en cours...", { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi.");
      throw e;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRequestSignature = async (clientEmail: string) => {
    if (!session || !invoice) return;

    try {
      const res = await fetch('/api/quote-signing/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: invoice.id,
          clientEmail: clientEmail.trim(),
          clientName: invoice.client?.name || invoice.client_name_override || 'Client',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.alreadyExists) {
        toast.info('Une demande de signature est déjà en cours. Un nouvel email a été envoyé au client.');
      } else {
        toast.success('Demande de signature envoyée ! Le client recevra un email avec le lien de signature.');
      }

      if (invoice.status === 'draft') {
        await updateInvoiceStatus(id, 'sent');
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la demande de signature.");
      throw e;
    }
  };

  const handleCreatePaymentLink = async (force = false, silent = false) => {
    if (!profile?.stripe_connect_account_id) {
      toast.error('Stripe non connecté. Configurez votre compte dans les paramètres.');
      return;
    }
    setGeneratingPaymentLink(true);
    try {
      const res = await fetch('/api/stripe-connect/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh invoice from DB to get updated payment_link + stripe_payment_url
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      const { data: updatedInvoice } = await supabase.from('invoices').select('*, client:clients(*)').eq('id', invoice.id).single();

      // FIXER (BUG 1) — si l'écriture DB a échoué silencieusement (loguée, non thrown),
      // on patche l'état local avec l'URL retournée : le bouton reflète le lien actif et
      // le QR est généré côté client depuis cette URL.
      const merged =
        updatedInvoice && (updatedInvoice.stripe_payment_url || updatedInvoice.payment_link)
          ? updatedInvoice
          : { ...invoice, stripe_payment_url: data.paymentLinkUrl, payment_link: data.paymentLinkUrl, sumup_checkout_id: null };
      setInvoice(merged);
      useDataStore.getState().updateInvoiceInList(merged);

      // INSPECTOR (BUG 3) — silent = régénération automatique après édition de
      // prix : on ne pop pas le modal de succès, juste un toast discret.
      if (silent) {
        toast.success('Lien de paiement recréé avec le nouveau montant.');
      } else {
        setPaymentSuccessUrl(data.paymentLinkUrl);
        setShowPaymentSuccessModal(true);
      }
      setShowPaymentModal(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création du lien.');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleSumUpLink = async (force = false, silent = false) => {
    setGeneratingSumUpLink(true);
    try {
      const res = await fetch('/api/sumup/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh invoice from DB to get updated payment_link + sumup_checkout_id
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      const { data: updatedInvoice } = await supabase.from('invoices').select('*, client:clients(*)').eq('id', invoice.id).single();

      // FIXER (BUG 1) — même garde-fou qu'au-dessus : patch local si la BDD n'a pas persisté.
      const merged =
        updatedInvoice && (updatedInvoice.sumup_checkout_id || updatedInvoice.payment_link)
          ? updatedInvoice
          : { ...invoice, sumup_checkout_id: data.checkoutId, payment_link: data.url, stripe_payment_url: null };
      setInvoice(merged);
      useDataStore.getState().updateInvoiceInList(merged);

      // INSPECTOR (BUG 3) — même garde-fou silencieux que Stripe.
      if (silent) {
        toast.success('Lien de paiement recréé avec le nouveau montant.');
      } else {
        setPaymentSuccessUrl(data.url);
        setShowPaymentSuccessModal(true);
      }
      setShowPaymentModal(false);
      if (data.warning) {
        toast.info(data.warning, { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création du lien SumUp.');
    } finally {
      setGeneratingSumUpLink(false);
    }
  };

  const handleSelectPaymentProvider = async (provider: 'stripe' | 'sumup') => {
    // FIXER (BUG 1) — force la régénération quand l'utilisateur change de prestataire.
    const force = forcePaymentSwitchRef.current;
    forcePaymentSwitchRef.current = false;
    if (provider === 'stripe') {
      await handleCreatePaymentLink(force);
    } else {
      await handleSumUpLink(force);
    }
  };

  // FIXER (BUG 1) — permet de changer de prestataire depuis le modal « Voir le lien ».
  const handleChangePaymentProvider = () => {
    forcePaymentSwitchRef.current = true;
    setShowPaymentSuccessModal(false);
    setShowPaymentModal(true);
  };

  const handleMarkPaid = async () => {
    setStatusLoading(true);
    try {
      await updateInvoiceStatus(id, 'paid');
      toast.success('Facture marquée comme payée !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleMarkSent = async () => {
    setStatusLoading(true);
    try {
      await updateInvoiceStatus(id, 'sent');
      toast.success('Facture marquée comme envoyée.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!profile) {
      toast.error('Profil introuvable. Veuillez vous reconnecter.');
      return;
    }
    try {
      const dup = await duplicateInvoice(id, profile);
      toast.success('Facture dupliquée !');
      router.push(`/invoices/${dup.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la duplication.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInvoice(id);
      toast.success('Facture supprimée.');
      router.push(getDocListPath(invoice?.document_type ?? 'invoice'));
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSendClick = () => {
    if (invoice.document_type === 'quote') {
      setShowQuoteActionModal(true);
    } else {
      setIsReminder(false);
      setShowEmailModal(true);
    }
  };

  const discountAmount = invoice.discount_amount || 0;

  return (
    <div className="max-w-5xl mx-auto pb-32 lg:pb-0">
      {/* INSPECTOR (BUG 3) — bannière de lien de paiement désynchronisé.
          Le lien a été invalidé (montant modifié) et la régénération auto a
          échoué (prestataire déconnecté, réseau…). Aucun QR obsolète n'est rendu
          tant que stale = true ; on invite explicitement à recréer le lien. */}
      {invoice.payment_link_stale && invoice.payment_provider && (
        <div className="mt-3 mx-4 lg:mx-6 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Lien de paiement désynchronisé
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
              Le montant de la facture a changé. L&apos;ancien lien ({invoice.payment_provider === 'stripe' ? 'Stripe' : 'SumUp'}) a été invalidé par sécurité — recréez-le avec le montant à jour.
            </p>
          </div>
          <button
            onClick={() =>
              invoice.payment_provider === 'stripe'
                ? handleCreatePaymentLink(true)
                : handleSumUpLink(true)
            }
            disabled={generatingPaymentLink || generatingSumUpLink}
            className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 transition-colors"
          >
            {generatingPaymentLink || generatingSumUpLink ? 'Création…' : 'Recréer le lien'}
          </button>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-gray-200">
        <div className="px-4 py-3 lg:px-6 lg:py-4">
          {/* Back + menu row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(getDocListPath(invoice.document_type))}
                className="p-2 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-400 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              {/* Desktop: show number inline */}
              <div className="hidden lg:flex items-center gap-2">
                <DocIcon size={16} className={docCfg.color} />
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{invoice.number}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Factur-X (desktop) */}
              {invoice.document_type === 'invoice' && canUseFacturX && (
                <div className="hidden lg:block">
                  <FacturXButton
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.number}
                    variant="secondary"
                    warnings={facturXWarnings}
                  />
                </div>
              )}

              {/* Edit (desktop) */}
              {!(invoice.document_type === 'quote' && invoice.status === 'accepted' && invoice.signed_at) && (
                <button
                  onClick={() => router.push(`/invoices/${id}/edit`)}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold transition-colors"
                >
                  <Edit2 size={15} />
                  Modifier
                </button>
              )}

              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-400 hover:text-gray-900 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease }}
                        className="absolute right-0 top-full mt-2 bg-white border border-gray-300 rounded-2xl z-40 w-56 overflow-hidden"
                      >
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => { setShowMenu(false); handleMarkPaid(); }}
                            disabled={statusLoading}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            <CheckCircle size={16} />
                            Marquer comme payée
                          </button>
                        )}
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => { setShowMenu(false); handleMarkSent(); }}
                            disabled={statusLoading}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Send size={16} />
                            Marquer comme envoyée
                          </button>
                        )}
                        <button
                          onClick={() => { setShowMenu(false); handleDuplicate(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-gray-100 transition-colors"
                        >
                          <Copy size={16} />
                          Dupliquer
                        </button>
                        <div className="h-px bg-gray-50 mx-4" />
                        {invoice.document_type === 'invoice' && canUseFacturX && (
                          <FacturXButton
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.number}
                            variant="compact"
                            warnings={facturXWarnings}
                          />
                        )}
                        <div className="h-px bg-gray-50 mx-4" />
                        <button
                          onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Mobile: Client name + status — Magic Move target */}
          <motion.div
            layoutId={`invoice-card-${invoice.id}`}
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
            className="lg:hidden mt-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{clientName}</h1>
                <p className="text-sm text-slate-500 font-mono mt-0.5">{invoice.number}</p>
              </div>
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0',
                status.bg, status.color
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
                {status.label}
              </span>
              <PdpStatusBadge status={invoice.pdp_status} transmittedAt={invoice.pdp_transmitted_at} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ========== STATUS BANNERS ========== */}
      <div className="px-4 lg:px-6 mt-4 space-y-3">
        <AnimatePresence mode="wait">
          {invoice.status === 'paid' && (
            <motion.div
              key="paid"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease }}
              className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3"
            >
              <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Facture payée {invoice.paid_at ? `le ${fmtDate(invoice.paid_at)}` : ''}</p>
                <p className="text-xs text-emerald-500/70">Le paiement a bien été reçu et enregistré.</p>
              </div>
            </motion.div>
          )}

          {invoice.status === 'overdue' && (
            <motion.div
              key="overdue"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease }}
              className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-400">Facture en retard</p>
                  <p className="text-xs text-red-400/70">Échéance dépassée le {fmtDate(invoice.due_date)}.</p>
                </div>
              </div>
              <button
                onClick={() => { setIsReminder(true); setShowEmailModal(true); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500 text-gray-900 dark:text-white text-xs font-semibold hover:bg-red-400 transition-colors flex-shrink-0"
              >
                <Mail size={13} />
                Relancer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========== MAIN LAYOUT ========== */}
      <div className="px-4 lg:px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

        {/* LEFT / MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-4">

          {/* Invoice header card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocIcon size={15} className={docCfg.color} />
                <span className="text-sm font-semibold text-slate-300">{docCfg.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{invoice.number}</span>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">Client</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{clientName}</p>
                {clientEmail && <p className="text-xs text-slate-500 mt-0.5">{clientEmail}</p>}
                {invoice.client?.address && <p className="text-xs text-slate-500 mt-0.5">{invoice.client.address}</p>}
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">Date d'émission</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtDate(invoice.issue_date)}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">Échéance</p>
                  <p className={cn('text-sm font-semibold', invoice.status === 'overdue' ? 'text-red-400' : 'text-gray-900 dark:text-white')}>
                    {fmtDate(invoice.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line items - MOBILE (vertical card list) */}
          <div className="lg:hidden space-y-2">
            <div className="px-1 mb-2">
              <h3 className="text-sm font-semibold text-slate-300">Prestations</h3>
            </div>
            {invoice.items.map((item, i) => (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease, delay: i * 0.04 }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4"
              >
                <p className="text-sm text-gray-900 dark:text-white leading-snug">{item.description || '—'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {item.quantity} x {formatCurrency(item.unit_price)} &middot; TVA {item.vat_rate}%
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Line items - DESKTOP (table) */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-slate-300">Prestations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2.5">Description</th>
                    <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 w-16">Qté</th>
                    <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 w-28">Prix HT</th>
                    <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 w-16">TVA</th>
                    <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2.5 w-28">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-gray-100 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-white">{item.description || '—'}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-400 text-center">{item.quantity}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-300 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-500 text-right">{item.vat_rate}%</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals - MOBILE */}
          <div className="lg:hidden bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Sous-total HT</span>
                <span className="font-semibold text-slate-200 tabular-nums">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>TVA</span>
                <span className="font-semibold text-slate-200 tabular-nums">{formatCurrency(invoice.vat_amount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Remise ({invoice.discount_percent}%)</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-200">Total TTC</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Totals - DESKTOP (inside table card) */}
          <div className="hidden lg:block">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="border-t border-gray-200 px-5 py-4">
                <div className="ml-auto max-w-xs space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Sous-total HT</span>
                    <span className="font-semibold text-slate-200 tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>TVA</span>
                    <span className="font-semibold text-slate-200 tabular-nums">{formatCurrency(invoice.vat_amount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Remise ({invoice.discount_percent}%)</span>
                      <span className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-200">Total TTC</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Notes</h3>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* RIGHT / SIDEBAR (desktop only) */}
        <div className="hidden lg:block space-y-4">
          {/* Total card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Montant total</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(invoice.total)}</p>
            <div className={cn('inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-3 py-1.5 rounded-full', status.bg, status.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
              {status.label}
            </div>
            <PdpStatusBadge status={invoice.pdp_status} transmittedAt={invoice.pdp_transmitted_at} className="mt-2" />
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
            <h3 className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Actions rapides</h3>

            <button
              onClick={() => setShowPdfPreview(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-300 text-sm font-semibold transition-colors"
            >
              <Eye size={16} className="text-purple-400" />
              Prévisualiser le PDF
            </button>

            <button
              onClick={handleSendClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-300 text-sm font-semibold transition-colors"
            >
              <Mail size={16} className="text-blue-400" />
              Envoyer par e-mail
            </button>

            {invoice.document_type === 'invoice' && invoice.status !== 'paid' && (
              <button
                onClick={() => {
                  if (hasPaymentLink(invoice)) {
                    setPaymentSuccessUrl(getPaymentUrl(invoice));
                    setShowPaymentSuccessModal(true);
                  } else {
                    setShowPaymentModal(true);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-300 text-sm font-semibold transition-colors"
              >
                <CreditCard size={16} className="text-emerald-400" />
                {hasPaymentLink(invoice) ? 'Voir le lien de paiement' : 'Créer un lien de paiement'}
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-slate-300 text-sm font-semibold transition-colors"
            >
              <Download size={16} className="text-slate-400" />
              Télécharger en PDF
            </button>

            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                disabled={statusLoading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {statusLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Marquer comme payée
              </button>
            )}

            {!(invoice.document_type === 'quote' && invoice.status === 'accepted' && invoice.signed_at) && (
              <button
                onClick={() => router.push(`/invoices/${id}/edit`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-sm font-semibold transition-colors"
              >
                <Edit2 size={16} />
                Modifier la facture
              </button>
            )}
          </div>

          {/* Factur-X section */}
          {invoice.document_type === 'invoice' && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setShowFacturXDetails(!showFacturXDetails)}
                className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gray-100 border border-gray-200">
                    <FileText size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Factur-X</h3>
                      {canUseFacturX && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Format conforme à la <span className="text-slate-400">réforme 2026+</span>
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: showFacturXDetails ? 90 : 0 }}
                  transition={{ duration: 0.2, ease }}
                  className="flex-shrink-0"
                >
                  <ChevronRight size={18} className="text-slate-500" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showFacturXDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Format de facture électronique conforme aux obligations légales françaises.
                        Intègre les données XML structurées directement dans le PDF.
                      </p>

                      {canUseFacturX ? (
                        <div className="w-full">
                          <FacturXButton
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.number}
                            variant="primary"
                            className="w-full"
                            warnings={facturXWarnings}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push('/paywall')}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors"
                        >
                          Débloquer Factur-X
                        </button>
                      )}

                      <a
                        href="https://fnfe-mpe.org/factur-x/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-500 hover:text-slate-300 block text-center transition-colors"
                      >
                        Qu'est-ce que Factur-X ? →
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* PDP Transmission Status */}
          {invoice.pdp_status && invoice.pdp_status !== 'not_transmitted' && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">E-invoicing</h3>
                      <PdpStatusBadge status={invoice.pdp_status} transmittedAt={invoice.pdp_transmitted_at} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Transmission via PDP agréée (Super PDP)
                    </p>
                  </div>
                </div>
                {invoice.pdp_transmission_id && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ID de transmission</p>
                    <p className="text-xs font-mono text-slate-400 truncate">{invoice.pdp_transmission_id}</p>
                  </div>
                )}
                {invoice.pdp_status === 'failed' && invoice.pdp_last_error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs text-red-500 font-medium">Erreur : {invoice.pdp_last_error}</p>
                  </div>
                )}
                {invoice.pdp_status === 'pending_retry' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-600">Nouvelle tentative de transmission programmée...</p>
                  </div>
                )}
                {(invoice.pdp_status === 'failed' || invoice.pdp_status === 'pending_retry') && (
                  <button
                    onClick={handleRetryTransmission}
                    disabled={retrying}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-black dark:hover:bg-zinc-900 text-white dark:border dark:border-white/10 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
                    {retrying ? 'Transmission en cours…' : 'Réessayer la transmission'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Informations</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Hash size={14} className="text-gray-400" />
                <span className="text-xs">Numéro :</span>
                <span className="font-semibold text-slate-200 ml-auto">{invoice.number}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs">Créée le :</span>
                <span className="font-semibold text-slate-200 ml-auto">{fmtDate(invoice.created_at)}</span>
              </div>
              {invoice.sent_at && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Send size={14} className="text-gray-400" />
                  <span className="text-xs">Envoyée le :</span>
                  <span className="font-semibold text-slate-200 ml-auto">{fmtDate(invoice.sent_at)}</span>
                </div>
              )}
              {invoice.client?.siret && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Building2 size={14} className="text-gray-400" />
                  <span className="text-xs">SIRET :</span>
                  <span className="font-semibold text-slate-200 ml-auto">{invoice.client.siret}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== FLOATING ACTION BAR (MOBILE) ========== */}
      <MobileActionBar
        mode="custom"
        mainAction={{
          icon: Send,
          label: 'Envoyer',
          onClick: handleSendClick,
          variant: 'primary',
        }}
        actions={[
          {
            icon: Eye,
            label: 'Prévisualiser le PDF',
            onClick: () => setShowPdfPreview(true),
            description: 'Aperçu du document',
          },
          ...(invoice.document_type === 'invoice' && invoice.status !== 'paid' ? [{
            icon: CreditCard,
            label: hasPaymentLink(invoice) ? 'Lien de paiement' : 'Encaisser',
            onClick: () => {
              if (hasPaymentLink(invoice)) {
                setPaymentSuccessUrl(getPaymentUrl(invoice));
                setShowPaymentSuccessModal(true);
              } else {
                setShowPaymentModal(true);
              }
            },
            description: hasPaymentLink(invoice) ? 'Voir le lien de paiement' : 'Créer un lien de paiement',
          }] : []),
          ...(invoice.status !== 'paid' ? [{
            icon: CheckCircle,
            label: 'Marquer comme payée',
            onClick: handleMarkPaid,
            description: 'Enregistrer le paiement',
          }] : []),
          {
            icon: Download,
            label: 'Télécharger PDF',
            onClick: handleDownloadPdf,
            description: 'Exporter en PDF',
          },
          ...(!(invoice.document_type === 'quote' && invoice.status === 'accepted' && invoice.signed_at) ? [{
            icon: Edit2,
            label: 'Modifier',
            onClick: () => router.push(`/invoices/${id}/edit`),
            description: 'Modifier la facture',
          }] : []),
          ...(invoice.document_type === 'invoice' ? [{
            icon: FileText,
            label: 'Factur-X',
            onClick: () => setShowFacturXDetails(true),
            description: 'Facture électronique conforme',
          }] : []),
        ]}
      />

      {/* ========== MODALS ========== */}

      {/* Email modal */}
      {profile && (
        <EmailPreviewModal
          invoice={invoice}
          profile={profile}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendEmail}
          defaultEmail={invoice.client?.email || ''}
          isReminder={isReminder}
        />
      )}

      {/* Quote action modal */}
      {invoice && profile && (
        <QuoteActionModal
          invoice={invoice}
          isOpen={showQuoteActionModal}
          onClose={() => setShowQuoteActionModal(false)}
          onSendEmail={() => {
            setShowQuoteActionModal(false);
            setIsReminder(false);
            setShowEmailModal(true);
          }}
          onRequestSignature={handleRequestSignature}
        />
      )}

      {/* PDF preview modal */}
      {showPdfPreview && (
        <PdfPreviewModal
          invoice={invoice}
          profile={profile}
          onClose={() => setShowPdfPreview(false)}
        />
      )}

      {/* Payment provider selection modal */}
      <PaymentProviderModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelectProvider={handleSelectPaymentProvider}
        hasStripe={!!(profile?.stripe_connect_account_id || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
        hasSumUp={!!profile?.sumup_merchant_code}
        amount={invoice.total}
      />

      {/* Payment link success modal */}
      {invoice && (
        <PaymentLinkSuccessModal
          isOpen={showPaymentSuccessModal}
          onClose={() => setShowPaymentSuccessModal(false)}
          paymentLinkUrl={paymentSuccessUrl}
          invoiceNumber={invoice.number}
          invoiceTotal={invoice.total}
          onDownloadPdf={handleDownloadPdf}
          onChangeProvider={handleChangePaymentProvider}
        />
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="bg-white border-t lg:border border-gray-300 rounded-t-3xl lg:rounded-2xl w-full lg:max-w-sm p-6 space-y-4 lg:shadow-2xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={22} className="text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer la facture ?</h2>
                <p className="text-sm text-slate-400 mt-1">Cette action est irréversible. La facture <strong className="text-slate-200">{invoice.number}</strong> sera définitivement supprimée.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-slate-300 text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-gray-900 dark:text-white text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
