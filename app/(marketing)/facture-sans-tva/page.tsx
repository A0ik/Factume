import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Scale, ShieldCheck, Stamp, Receipt, FileCheck, PenTool } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Facture sans TVA – Auto-Entrepreneurs & Micro-Entreprises | Factu.me',
  description: 'Créez vos factures sans TVA conformément a l\'article 293 B du CGI. Mention "TVA non applicable" automatique. Ideal auto-entrepreneurs et micro-entreprises.',
  openGraph: {
    title: 'Facture sans TVA – Auto-Entrepreneurs & Micro-Entreprises',
    description: 'Factures HT conformes article 293 B CGI. Mention legale automatique. Pret pour declaration URSSAF.',
    url: 'https://factu.me/facture-sans-tva',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facture-sans-tva.png',
        width: 1200,
        height: 630,
        alt: 'Facture sans TVA – Auto-Entrepreneurs',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facture-sans-tva',
  },
};

const benefits = [
  {
    icon: Scale,
    title: 'Conformite article 293 B',
    description: 'Factures automatiquement conformes a l\'article 293 B du Code General des Impots. La mention legale est inseree pour vous.',
  },
  {
    icon: ShieldCheck,
    title: 'Mentions legales automatiques',
    description: 'La mention "TVA non applicable, article 293 B du CGI" apparait sur chaque facture. Plus besoin de y penser.',
  },
  {
    icon: Receipt,
    title: 'Fait pour les auto-entrepreneurs',
    description: 'Regime micro-entreprise, micro-BIC, micro-BNC : Factu.me sait quelles mentions appliquer a votre statut.',
  },
  {
    icon: FileCheck,
    title: 'Pret pour URSSAF',
    description: 'Vos factures sont pretes pour la declaration trimestrielle URSSAF. Exportez votre CA en 1 clic.',
  },
  {
    icon: PenTool,
    title: 'Simplicite absolue',
    description: 'Pas de calculs de TVA a faire, pas de taux a choisir. Vous facturez en HT, point final. Comme votre regime le prevoit.',
  },
  {
    icon: Stamp,
    title: 'Zero risque d\'erreur',
    description: 'Impossible d\'oublier une mention ou de facturer avec TVA par megarde. Votre facture est toujours reglementaire.',
  },
];

const features = [
  {
    title: 'Factures HT conformes',
    items: [
      'Prix affiches en HT uniquement',
      'Mention "TVA non applicable, art. 293 B CGI"',
      'Numero de SIRET et RCS/RM automatiques',
      'Conditions de paiement personnalisees',
    ],
  },
  {
    title: 'Adapte a votre regime',
    items: [
      'Micro-entreprise (auto-entrepreneur)',
      'Micro-BIC et micro-BNC',
      'Regime de la franchise de base TVA',
      'Declaration URSSAF facilitee',
    ],
  },
  {
    title: 'Export et declarations',
    items: [
      'Export CA pour declaration URSSAF',
      'Registre des factures ordonne',
      'Export PDF professionnel',
      'Archivage reglementaire 10 ans',
    ],
  },
];

const testimonials = [
  {
    name: 'Mehdi R.',
    job: 'Developpeur web auto-entrepreneur',
    text: 'Je ne savais jamais quelle mention mettre sur mes factures HT. Avec Factu.me, c\'est automatique. Plus aucune inquietude.',
  },
  {
    name: 'Lea F.',
    job: 'Graphiste micro-entreprise',
    text: 'Mon comptable m\'avait signale une mention manquante sur mes anciennes factures. Depuis Factu.me, tout est conforme du premier coup.',
  },
  {
    name: 'Karim B.',
    job: 'Coach sportif independant',
    text: 'L\'export pour URSSAF, c\'est le truc que j\'attendais. Je declare mon CA en 2 clics au lieu de tout recompter manuellement.',
  },
];

export default function FactureSansTvaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              <Scale className="w-4 h-4" />
              Article 293 B du CGI
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facture sans TVA – <span className="text-emerald-600">Auto-Entrepreneurs & Micro-Entreprises</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Factures <strong>100% HT, conformes a l\'article 293 B</strong>. Mention legale automatique, pret pour URSSAF. Zero prise de tete.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Creer ma facture HT
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir un exemple
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Conforme art. 293 B CGI • Mention automatique • Export URSSAF
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facture HT sans risque, sans stress
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal info section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Que dit la loi sur les factures sans TVA ?
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-emerald-800 mb-2">Article 293 B du CGI</h3>
              <p className="text-gray-700">
                Les assujettis beneficiaires de la franchise en base de TVA ne facturent pas la TVA a leurs clients.
                Ils doivent obligatoirement faire figurer sur leurs factures la mention :{" "}
                <strong>"TVA non applicable, article 293 B du Code general des impots"</strong>.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Qui est concerne ?</h3>
              <p className="text-gray-700">
                Auto-entrepreneurs, micro-entreprises, entreprises en franchise de base TVA dont le CA annuel
                est inferieur aux seuils legaux (85 800 euros pour les ventes, 34 400 euros pour les prestations de services).
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Risque en cas d\'oubli</h3>
              <p className="text-gray-700">
                L\'absence de la mention "TVA non applicable" sur une facture est une irregularite.
                En cas de controle fiscal, cela peut entrainer une amende de 15 euros par facture
                non conforme, plafonnee a 1/4 du CA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Tout pour facturer sans TVA correctement
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ils facturent l\'esprit tranquille
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg">
                <p className="text-gray-700 mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.job}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Facturez en HT en toute conformite
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Mention legale automatique, export URSSAF, zero prise de tete
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Creer ma facture sans TVA
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Conforme art. 293 B • Export URSSAF • Sans engagement
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages pages={[
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
        ]} />
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture sans TVA', url: 'https://factu.me/facture-sans-tva' },
        ]}
      />
    </div>
  );
}
