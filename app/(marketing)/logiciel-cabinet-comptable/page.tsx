import { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Users, BarChart3, FileText, Shield, Clock, CheckCircle2, TrendingUp, Bell, Calendar, Landmark, Briefcase } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Logiciel Cabinet Comptable – Gerez Tous Vos Clients | Factu.me',
  description: 'Logiciel tout-en-un pour cabinets d\'expertise comptable : tableau de bord multi-clients, relances automatiques, rapprochement bancaire, echeances fiscales, lettres de mission. Essai gratuit 7 jours.',
  openGraph: {
    title: 'Logiciel Cabinet Comptable – Gerez Tous Vos Clients | Factu.me',
    description: 'Le logiciel tout-en-un pour cabinets d\'expertise comptable. Tableau de bord multi-clients, relances, rapprochement, echeances fiscales.',
    url: 'https://factu.me/logiciel-cabinet-comptable',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-cabinet.png', width: 1200, height: 630, alt: 'Logiciel Cabinet Comptable Factu.me' }],
  },
  alternates: { canonical: 'https://factu.me/logiciel-cabinet-comptable' },
};

const features = [
  { icon: BarChart3, title: 'Dashboard multi-clients', description: 'Vue consolidee du CA, depenses et sante financiere de chaque client en un coup d\'oeil.' },
  { icon: Bell, title: 'Relances automatiques', description: '3 niveaux de relance progressifs : courtoise, ferme, mise en demeure. Envoi en un clic ou automatise.' },
  { icon: Landmark, title: 'Rapprochement bancaire', description: 'Centralisez les transactions de tous vos clients. Filtrez, recherchez et rapprochez en quelques clics.' },
  { icon: Calendar, title: 'Echeances fiscales & sociales', description: 'Calendrier interactif avec TVA, IS, bilan, DSN. Alertes automatiques pour ne rien rater.' },
  { icon: Briefcase, title: 'Lettres de mission', description: 'Creez et suivez vos missions : expertise comptable, paie, CAC, conseil fiscal. Reconduction automatique.' },
  { icon: FileText, title: 'Facturation centralisee', description: 'Consultez et exportez les factures de tous vos clients. Generation PDF, Factur-X et e-invoicing.' },
  { icon: Shield, title: 'Marque blanche', description: 'Personnalisez l\'interface avec votre logo, couleurs et nom de cabinet. Vos clients voient votre marque.' },
  { icon: TrendingUp, title: 'Analyses avancees', description: 'Graphiques de revenus, repartition des factures, top clients par CA. Export CSV pour vos rapports.' },
];

const steps = [
  { num: '1', title: 'Creez votre cabinet', desc: 'Nom, SIRET, logo et couleurs en 2 minutes.' },
  { num: '2', title: 'Invitez vos clients', desc: 'Envoyez une invitation par email. Ils acceptent et vous accedez a leurs donnees.' },
  { num: '3', title: 'Pilotez tout depuis un dashboard', desc: 'CA, depenses, relances, echeances — tout est centralise.' },
];

const faqs = [
  { q: 'Qui peut utiliser le module Cabinet ?', a: 'Le module Cabinet est inclus dans le plan Business, destine aux cabinets d\'expertise comptable, aux gestionnaires de patrimoine et aux professionnels qui gerent plusieurs clients.' },
  { q: 'Mes clients voient-ils la marque Factu.me ?', a: 'Non. Avec la marque blanche (plan Business), vous pouvez personnaliser l\'interface avec votre logo, vos couleurs et le nom de votre cabinet.' },
  { q: 'Comment mes clients me donnent acces a leurs donnees ?', a: 'Vous envoyez une invitation par email. Le client accepte depuis son tableau de bord et vous recevez automatiquement l\'acces a ses factures, depenses et transactions.' },
  { q: 'Les relances sont-elles automatiques ?', a: 'Oui. Vous pouvez configurer 3 niveaux de relance et les envoyer individuellement ou en lot. Chaque relance est tracee dans l\'historique.' },
  { q: 'Puis-je exporter les donnees pour mon outil comptable ?', a: 'Oui. Export CSV des clients, factures, transactions et analyses pour une integration dans votre outil comptable habituel.' },
];

export default function LogicielCabinetComptablePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-6">
            <Building2 size={16} />
            Pour cabinets d&apos;expertise comptable
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-tight mb-6">
            Gerez <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">tous vos clients</span><br />
            depuis un seul dashboard
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Relances automatiques, rapprochement bancaire, echeances fiscales, lettres de mission.
            Le logiciel tout-en-un pour les cabinets comptables francais.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35 transition-all hover:scale-105"
            >
              Essai gratuit 7 jours
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Decouvrir les fonctionnalites
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '18+', label: 'Pages dediees cabinet' },
            { value: '3 niveaux', label: 'Relances automatiques' },
            { value: '100%', label: 'Marque blanche' },
            { value: 'CSV', label: 'Export universel' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Tout ce dont un cabinet a besoin
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Un logiciel complet pour gerer votre portefeuille clients, de la facturation aux echeances fiscales.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-6 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Comment ca marche ?</h2>
            <p className="text-gray-500 dark:text-gray-400">3 etapes pour centraliser la gestion de tous vos clients</p>
          </div>
          <div className="space-y-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="flex items-start gap-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-lg">{num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{title}</h3>
                  <p className="text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Factu.me vs gestion manuelle
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Gagnez des heures chaque semaine</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
            <h3 className="font-bold text-red-700 dark:text-red-400 mb-4">Avant (sans Factu.me)</h3>
            <ul className="space-y-3">
              {['Tableurs Excel disperses', 'Relances envoyees manuellement', 'Pas de vue consolidee', 'Echeances oubliees', 'Donnees non synchronisees'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <span className="w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-300 flex-shrink-0">x</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-4">Apres (avec Factu.me)</h3>
            <ul className="space-y-3">
              {['Dashboard multi-clients centralise', 'Relances automatiques 3 niveaux', 'Analytics et graphiques en temps reel', 'Calendrier fiscal avec alertes', 'Donnees synchronisees automatiquement'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">Questions frequentes</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800">
                <summary className="font-bold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl">
            <Building2 size={40} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-black mb-4">Pret a transformer votre cabinet ?</h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">
              Rejoignez les cabinets comptables qui utilisent Factu.me pour gerer leur portefeuille clients. Essai gratuit 7 jours, sans engagement.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Commencer l&apos;essai gratuit
            </Link>
          </div>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Logiciel Cabinet Comptable', url: 'https://factu.me/logiciel-cabinet-comptable' },
        ]}
      />
    </main>
  );
}
