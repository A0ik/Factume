'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, FileText, CreditCard,
  Mic, Settings, Mail, Shield, Zap, ArrowUpRight,
  BookOpen, HelpCircle, ChevronRight, Send, Clock,
  Download, RefreshCw, Headphones, Ticket,
  MessageSquare, CheckCircle2, Loader2,
  Landmark, ScanLine, Bot, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { InlineAIChat } from '@/components/support/AIChatWidget';

interface FAQ {
  q: string;
  a: string;
}

const CATEGORIES = [
  {
    id: 'facturation',
    icon: FileText,
    label: 'Facturation',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Créer, envoyer et gérer vos factures',
    faqs: [
      { q: 'Comment créer ma première facture ?', a: 'Cliquez sur "Factures" dans le menu, puis sur le bouton "Nouveau". Vous pouvez soit dicter votre facture à voix haute (plan Pro), soit la saisir manuellement. Renseignez le client, les prestations, les dates et cliquez sur "Créer la facture".' },
      { q: 'Comment envoyer une facture par email ?', a: 'Depuis la page de détail d\'une facture, utilisez le bouton "Envoyer par email". Votre client recevra un email professionnel avec la facture en PDF.' },
      { q: 'Comment relancer un client pour une facture impayée ?', a: 'Sur la page de détail d\'une facture au statut "Envoyée" ou "En retard", un bouton "Relancer" apparaît. Cliquez dessus pour envoyer automatiquement un email de relance poli à votre client.' },
      { q: 'Comment marquer une facture comme payée ?', a: 'Ouvrez la facture depuis la liste, puis utilisez le bouton "Marquer comme payée". Vous pouvez aussi filtrer par statut dans la liste pour retrouver rapidement vos factures impayées.' },
      { q: 'Comment partager une facture sans email ?', a: 'Chaque facture dispose d\'un lien de partage public sécurisé. Sur la page de détail, cliquez sur "Partager" pour copier le lien. Votre client pourra consulter et télécharger la facture sans se connecter.' },
      { q: 'Comment numéroter mes factures ?', a: 'La numérotation est automatique selon votre préfixe (ex: FACT-2024-001). Vous pouvez personnaliser le préfixe dans Paramètres > Facturation.' },
      { q: 'Comment ajouter mon logo et mes infos d\'entreprise ?', a: 'Rendez-vous dans Paramètres (icône en bas du menu). Dans la section "Entreprise", vous pouvez uploader votre logo, renseigner vos coordonnées, SIRET, numéro de TVA, et vos coordonnées bancaires. Ces informations apparaîtront automatiquement sur toutes vos factures.' },
      { q: 'Puis-je créer des factures récurrentes ?', a: 'Oui ! Dans la section "Récurrentes", cliquez sur "Nouvelle récurrence". Définissez le client, les prestations et la fréquence (hebdomadaire, mensuelle, trimestrielle, annuelle). La facture sera générée automatiquement à chaque échéance.' },
    ],
  },
  {
    id: 'devis',
    icon: FileText,
    label: 'Devis',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    description: 'Créer et convertir vos devis',
    faqs: [
      { q: 'Comment créer un devis ?', a: 'Allez dans la section "Devis" du menu, puis cliquez sur "Nouveau". Le processus est identique à la création d\'une facture. Remplissez les informations client et les lignes de prestations.' },
      { q: 'Comment convertir un devis en facture ?', a: 'Depuis la page de détail d\'un devis accepté, un bouton "Convertir en facture" est disponible. La facture héritera automatiquement de toutes les informations du devis.' },
      { q: 'Mon client peut-il signer un devis en ligne ?', a: 'Oui, chaque devis dispose d\'un lien de signature sécurisé que vous pouvez envoyer à votre client. Il pourra l\'accepter ou le refuser directement depuis son navigateur.' },
      { q: 'Quelle est la différence entre Facture, Devis et Avoir ?', a: 'Une Facture est un document de paiement définitif. Un Devis est une proposition commerciale non engageante. Un Avoir (note de crédit) annule tout ou partie d\'une facture déjà émise, par exemple en cas de remboursement.' },
    ],
  },
  {
    id: 'contrats',
    icon: FileText,
    label: 'Contrats',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Gestion des contrats et documents',
    faqs: [
      { q: 'Comment créer un contrat ?', a: 'Accédez à la section "Contrats" dans le menu. Cliquez sur "Nouveau contrat", choisissez un modèle ou créez-le de zéro. Vous pouvez utiliser la dictée vocale pour générer le contenu automatiquement.' },
      { q: 'Comment faire signer un contrat électroniquement ?', a: 'Après avoir créé votre contrat, envoyez-le pour signature. Votre client recevra un lien sécurisé pour signer électroniquement le document. Vous serez notifié dès la signature effectuée.' },
      { q: 'Puis-je modifier un contrat déjà signé ?', a: 'Pour modifier un contrat signé, vous devez créer un avenant. Celui-ci sera soumis à la signature des deux parties, comme le contrat original.' },
    ],
  },
  {
    id: 'ia',
    icon: Mic,
    label: 'IA & Voix',
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Dictée vocale et intelligence artificielle',
    faqs: [
      { q: 'Comment fonctionne la dictée vocale ?', a: 'Disponible avec les plans Pro et Business. Cliquez sur "Créer une facture" puis sur le microphone. Parlez naturellement ("Facture pour Dupont SA, développement site web, 5 jours à 500€"). L\'IA analyse votre audio et remplit automatiquement tous les champs.' },
      { q: 'Dans quelle langue puis-je dicter ?', a: 'Factu.me comprend 7 langues : français, arabe, anglais, espagnol, allemand, italien et portugais. Dictez dans la langue de votre choix, l\'IA s\'adapte automatiquement.' },
      { q: 'Que faire si la dictée n\'est pas précise ?', a: 'Parlez clairement en articulant les chiffres et noms de clients. Après traitement, tous les champs restent modifiables avant de créer la facture.' },
      { q: 'Quelles autres fonctions IA sont disponibles ?', a: 'L\'IA peut aussi catégoriser vos dépenses, analyser vos documents, générer des suggestions de clauses contractuelles et analyser vos relevés bancaires pour un suivi comptabilité automatisé.' },
    ],
  },
  {
    id: 'paiements',
    icon: CreditCard,
    label: 'Paiements',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    description: 'Encaissement et suivi des paiements',
    faqs: [
      { q: 'Comment accepter les paiements en ligne ?', a: 'Connectez votre compte Stripe ou SumUp dans Paramètres > Paiements. Vos clients pourront alors payer directement depuis le lien de facture par carte bancaire.' },
      { q: 'Comment fonctionne le paiement par lien ?', a: 'Quand vous envoyez une facture avec le paiement activé, votre client reçoit un lien sécurisé vers une page de paiement. Le montant est automatiquement enregistré comme payé une fois la transaction validée.' },
      { q: 'Puis-je accepter les paiements SEPA ?', a: 'Oui, avec Stripe Connect vous pouvez proposer des prélèvements SEPA à vos clients européens. Configurez cette option dans Paramètres > Paiements > SEPA.' },
    ],
  },
  {
    id: 'abonnements',
    icon: CreditCard,
    label: 'Abonnements',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    description: 'Plans, tarifs et gestion d\'abonnement',
    faqs: [
      { q: 'Quels sont les différents plans ?', a: 'Plan Starter (Gratuit) : 3 factures/mois, 1 cabinet, e-facturation certifiée, dictée vocale IA activée.\nPlan Pro (14,99€/mois) : Factures illimitées, URSSAF One-Click, Voice Expense illimité, Copilot Factu IA, export FEC, contrats, CRM.\nPlan Business (39,99€/mois) : Tout Pro + 5 cabinets, Comptable Connect, multi-utilisateur (5), API & Webhooks, support dédié.\n\nEssai gratuit de 14 jours disponible, sans carte bancaire.' },
      { q: 'Comment passer à un plan payant ?', a: 'Cliquez sur "Passer à Pro" dans le menu ou dans Paramètres. Le paiement est sécurisé par Stripe. Vous pouvez annuler à tout moment depuis les paramètres. Essai gratuit de 14 jours sans carte bancaire.' },
      { q: 'Mes données sont-elles conservées si je résilie ?', a: 'Oui, vos factures et clients sont conservés. Votre compte repasse en plan Starter avec les limitations associées.' },
    ],
  },
  {
    id: 'comptabilite',
    icon: Download,
    label: 'Comptabilité',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    description: 'Exports comptables et FEC',
    faqs: [
      { q: 'Qu\'est-ce que l\'export FEC ?', a: 'Le Fichier des Écritures Comptables (FEC) est un format réglementaire français que votre expert-comptable peut importer directement. Il contient toutes vos écritures de ventes et encaissements, conformément aux exigences de la DGFiP.' },
      { q: 'Comment générer mon FEC ?', a: 'Dans Paramètres > Export comptabilité, sélectionnez l\'année et cliquez sur "FEC [année]". Le fichier est téléchargé immédiatement. Vous pouvez l\'envoyer directement à votre comptable.' },
      { q: 'Quels comptes comptables sont utilisés ?', a: 'Les comptes suivent le Plan Comptable Général français : 411000 (Clients), 706000 (Prestations de services), 445710 (TVA collectée), 512000 (Banque).' },
    ],
  },
  {
    id: 'technique',
    icon: Settings,
    label: 'Technique',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    description: 'Sécurité, données et intégrations',
    faqs: [
      { q: 'Où sont stockées mes données ?', a: 'Vos données sont hébergées sur Supabase (infrastructure AWS), dans des datacenters situés en Europe (eu-west-3, Paris). Toutes les communications sont chiffrées via TLS.' },
      { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres > Compte, cliquez sur "Supprimer le compte". Cette action est irréversible et supprime définitivement toutes vos données (factures, clients, profil).' },
      { q: 'Factu.me est-il conforme au RGPD ?', a: 'Oui. Vos données ne sont jamais vendues à des tiers. Vous pouvez demander l\'export ou la suppression de vos données à tout moment via les paramètres.' },
      { q: 'Comment créer un client ?', a: 'Allez dans la section "Clients" et cliquez sur "Nouveau client". Vous pouvez également créer un client directement lors de la création d\'une facture en tapant son nom.' },
      { q: 'Puis-je utiliser Factu.me sur mobile ?', a: 'Factu.me est une application web responsive, optimisée pour tous les écrans. Vous pouvez l\'utiliser sur votre téléphone, tablette ou ordinateur sans installer quoi que ce soit. Installez-la comme PWA pour un accès rapide depuis l\'écran d\'accueil.' },
      { q: 'Comment personnaliser mes modèles de facture ?', a: 'Allez dans Paramètres > Modèles. Vous pouvez choisir parmi 6 templates intégrés, importer votre propre facture pour créer un template personnalisé, ou modifier la couleur d\'accent et le logo.' },
      { q: 'Comment fonctionnent les factures récurrentes ?', a: 'Dans la section "Récurrentes", créez une récurrence en définissant le client, les prestations et la fréquence (hebdomadaire, mensuelle, trimestrielle, annuelle). La facture sera générée automatiquement à chaque échéance.' },
    ],
  },
  {
    id: 'ocr',
    icon: ScanLine,
    label: 'Scan OCR',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    description: 'Numérisation intelligente de documents',
    faqs: [
      { q: 'Comment scanner une facture ou un reçu ?', a: 'Allez dans la section "Scan OCR" (plan Business) ou utilisez le bouton d\'import dans la liste des factures. Uploadez un PDF ou une photo de votre document. L\'IA extrait automatiquement les informations : fournisseur, montant, TVA, date, lignes de prestation.' },
      { q: 'Quels formats sont supportés ?', a: 'Le scan OCR accepte les fichiers PDF, JPG, PNG et HEIC. Les documents multipages sont supportés : l\'IA détecte et sépare automatiquement les différentes factures dans un même PDF.' },
      { q: 'Puis-je importer ma propre facture comme modèle ?', a: 'Oui ! Uploadez une facture dont vous aimez le design dans Paramètres > Modèles > Importer. L\'IA analyse le style visuel (couleurs, polices, layout) et crée un template personnalisé que vous pouvez réutiliser pour toutes vos factures.' },
    ],
  },
  {
    id: 'banque',
    icon: Landmark,
    label: 'Banque',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Rapprochement bancaire et transactions',
    faqs: [
      { q: 'Comment connecter mon compte bancaire ?', a: 'Allez dans la section "Banque" (plan Pro ou supérieur). Cliquez sur "Connecter une banque" pour accéder au portail sécurisé Nordigen/GoCardless. Sélectionnez votre banque, authentifiez-vous, et vos transactions seront importées automatiquement.' },
      { q: 'Qu\'est-ce que le rapprochement bancaire ?', a: 'Le rapprochement bancaire permet de faire correspondre vos factures émises avec les encaissements sur votre compte bancaire. Cela vous permet de savoir précisément quelles factures ont été payées et lesquelles sont encore en attente.' },
      { q: 'Mes données bancaires sont-elles sécurisées ?', a: 'Oui. La connexion se fait via l\'API réglementée Nordigen/GoCardless (Open Banking PSD2). Factu.me n\'a jamais accès à vos identifiants bancaires. Seules les données de transactions sont importées en lecture seule.' },
    ],
  },
  {
    id: 'facturx',
    icon: FileText,
    label: 'Factur-X',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    description: 'Facturation électronique 2026',
    faqs: [
      { q: 'Qu\'est-ce que Factur-X ?', a: 'Factur-X est le standard français de facturation électronique (norme EN 16931). À partir de septembre 2026, toutes les entreprises françaises devront émettre et recevoir des factures électroniques en B2B. Factu.me génère automatiquement des factures conformes Factur-X.' },
      { q: 'Comment me conformer à la réforme 2026 ?', a: 'Avec les plans Pro et Business de Factu.me, vos factures sont automatiquement conformes Factur-X (EN 16931). Le PDF généré contient un fichier XML embarqué avec toutes les données structurées. Vous n\'avez rien de supplémentaire à configurer.' },
      { q: 'Qu\'est-ce qu\'un PDP (Portail de Dématérialisation Partenaire) ?', a: 'Un PDP est une plateforme agréée par l\'État pour transmettre les factures électroniques. Factu.me est compatible avec les principaux PDP du marché. Consultez notre guide dédié dans le centre d\'aide pour plus de détails.' },
    ],
  },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse', color: 'text-gray-500', bg: 'bg-gray-100' },
  { value: 'normal', label: 'Normale', color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'high', label: 'Haute', color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600', bg: 'bg-red-50' },
];

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('border-b border-gray-100 last:border-0', open && 'bg-gray-50/50')}>
      <button
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left group hover:bg-gray-50/80 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={cn('text-sm font-semibold transition-colors', open ? 'text-primary' : 'text-gray-800 group-hover:text-gray-900')}>
          {faq.q}
        </span>
        <motion.span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors bg-gray-100 text-gray-400"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{faq.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactForm() {
  const { user, profile } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Veuillez remplir le sujet et le message');
      return;
    }
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setSending(true);
    try {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Session expirée');

      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile?.first_name || user.email,
          email: user.email,
          subject,
          message,
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      toast.success('Ticket créé avec succès !');
      setSent(true);
      setSubject('');
      setMessage('');
      setPriority('normal');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Headphones size={15} className="text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Contacter le support</h3>
          <p className="text-xs text-gray-400">Nous répondons sous 24h en moyenne</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">Message envoyé !</h4>
            <p className="text-sm text-gray-500 mb-4">
              Votre ticket a été créé. Vous pouvez le suivre dans la section{" "}
              <Link href="/help/tickets" className="text-primary font-semibold hover:underline">
                Mes tickets
              </Link>.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Envoyer un autre message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom</label>
                <input
                  type="text"
                  value={profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Résumez votre demande..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Priorité</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
                      priority === opt.value
                        ? `${opt.bg} ${opt.color} border-current/20 ring-2 ring-current/10`
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre problème ou votre question en détail..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all',
                sending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30'
              )}
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Envoyer le message
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        !search ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => !search || cat.faqs.length > 0);

  const visibleCats = activeCategory
    ? filtered.filter((c) => c.id === activeCategory)
    : filtered;

  const totalFaqs = CATEGORIES.reduce((s, c) => s + c.faqs.length, 0);

  const stats = [
    { icon: BookOpen, label: 'Articles d\'aide', value: totalFaqs.toString(), color: 'text-blue-600' },
    { icon: Clock, label: 'Temps de réponse', value: '< 24h', color: 'text-emerald-600' },
    { icon: MessageSquare, label: 'Satisfaction', value: '98%', color: 'text-violet-600' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* FAQ Schema for SEO */}
      <FAQSchema items={CATEGORIES.flatMap(cat => cat.faqs.map(f => ({ question: f.q, answer: f.a })))} />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <HelpCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Centre d&apos;aide</h1>
            <p className="text-sm text-gray-400">{totalFaqs} questions pour maîtriser Factu.me</p>
          </div>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.color === 'text-blue-600' ? 'bg-blue-50' : stat.color === 'text-emerald-600' ? 'bg-emerald-50' : 'bg-violet-50')}>
                <Icon size={16} className={stat.color} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 leading-tight">{stat.value}</p>
                <p className="text-[11px] text-gray-400">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative"
      >
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher dans l'aide..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
        />
      </motion.div>

      {/* Category pills */}
      {!search && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                  activeCategory === cat.id
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm',
                )}
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                  <Icon size={14} className={cat.color} />
                </div>
                <div className="min-w-0">
                  <span className={cn('text-xs font-semibold block', activeCategory === cat.id ? 'text-primary' : 'text-gray-700')}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate block">{cat.faqs.length} question{cat.faqs.length !== 1 ? 's' : ''}</span>
                </div>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* FAQ sections */}
      <div className="space-y-3">
        {visibleCats.map((cat) => {
          if (cat.faqs.length === 0) return null;
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', cat.bg)}>
                  <Icon size={15} className={cat.color} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{cat.label}</h3>
                <span className="ml-auto text-[11px] font-semibold text-gray-400">{cat.faqs.length} question{cat.faqs.length !== 1 ? 's' : ''}</span>
              </div>
              <div>
                {cat.faqs.map((faq, idx) => (
                  <FAQItem key={idx} faq={faq} />
                ))}
              </div>
            </motion.div>
          );
        })}

        {search && filtered.every((c) => c.faqs.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <HelpCircle size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">Aucun résultat pour &laquo; {search} &raquo;</p>
            <p className="text-sm text-gray-300 mt-1">Essayez d&apos;autres mots-clés ou contactez le support</p>
          </motion.div>
        )}
      </div>

      {/* Contact section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Besoin d&apos;aide ?</h2>
          <Link
            href="/help/tickets"
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Ticket size={14} />
            Mes tickets
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick actions */}
          <div className="space-y-3">
            <a
              href="mailto:contact@factu.me"
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail size={17} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">Email support</p>
                <p className="text-xs text-gray-400 mt-0.5">contact@factu.me</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </a>

            <a
              href="https://github.com/A0ik/FacturmeWeb/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <BookOpen size={17} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">Signaler un bug</p>
                <p className="text-xs text-gray-400 mt-0.5">GitHub Issues</p>
              </div>
              <ArrowUpRight size={13} className="text-gray-300 group-hover:text-primary transition-colors" />
            </a>

            <button
              onClick={() => setShowForm(!showForm)}
              className={cn(
                'w-full flex items-center gap-3 rounded-2xl border p-4 transition-all group shadow-sm',
                showForm
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-gray-100 bg-white hover:border-primary/30 hover:shadow-md'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={17} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-gray-900 text-sm">Ouvrir un ticket</p>
                <p className="text-xs text-gray-400 mt-0.5">Formulaire de contact</p>
              </div>
              <ChevronRight size={14} className={cn('text-gray-300 transition-all', showForm ? 'rotate-90 text-primary' : 'group-hover:text-primary group-hover:translate-x-0.5')} />
            </button>

            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={cn(
                'w-full flex items-center gap-3 rounded-2xl border p-4 transition-all group shadow-sm',
                showAIChat
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-gray-100 bg-white hover:border-purple-300 hover:shadow-md'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-gray-900 text-sm">Assistant IA</p>
                <p className="text-xs text-gray-400 mt-0.5">Posez votre question en direct</p>
              </div>
              <ChevronRight size={14} className={cn('text-gray-300 transition-all', showAIChat ? 'rotate-90 text-purple-500' : 'group-hover:text-purple-500 group-hover:translate-x-0.5')} />
            </button>

            <div className="flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/15 p-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap size={17} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Version actuelle</p>
                <p className="text-xs text-primary font-semibold mt-0.5">v2.0 -- Mai 2026</p>
              </div>
            </div>
          </div>

          {/* AI Chat inline */}
          <AnimatePresence>
            {showAIChat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="lg:col-span-1"
              >
                <div className="rounded-2xl border border-purple-200 bg-white overflow-hidden shadow-md">
                  <div className="flex items-center justify-between bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <Bot size={18} />
                      <span className="font-semibold text-sm">Assistant Factu.me</span>
                    </div>
                    <button onClick={() => setShowAIChat(false)} className="rounded-full hover:bg-white/20 p-1 transition-colors">
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <InlineAIChat />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contact form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="lg:col-span-1"
              >
                <ContactForm />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
