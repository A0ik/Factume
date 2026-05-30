import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowRight, Zap, Search } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { professions } from '@/lib/seo-data';

export const metadata: Metadata = {
  title: 'Modèles de Facture Gratuits pour Tous les Métiers — Conforme 2026 | Factu.me',
  description: 'Découvrez nos modèles de facture gratuits pour plus de 25 métiers : artisans, freelances, professions libérales, commerçants. Conformes loi 2026, personnalisables.',
  openGraph: {
    title: 'Modèles de Facture Gratuits pour Tous les Métiers | Factu.me',
    description: 'Plus de 25 modèles de facture gratuits et conformes pour chaque métier.',
    url: 'https://factu.me/modeles-facture',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-modeles-facture.png', width: 1200, height: 630, alt: 'Modèles de facture' }],
  },
  alternates: { canonical: 'https://factu.me/modeles-facture' },
};

const secteurs = [
  { key: 'artisan', label: 'Artisans du BTP', icon: '🔧' },
  { key: 'freelance', label: 'Freelances & Indépendants', icon: '💻' },
  { key: 'service', label: 'Services professionnels', icon: '⚖️' },
  { key: 'sante', label: 'Santé & Bien-être', icon: '🏥' },
  { key: 'commerce', label: 'Commerce', icon: '🛒' },
];

export default function ModelesFactureHub() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Modèles de Facture pour <span className="text-purple-600">Tous les Métiers</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Trouvez le modèle de facture adapté à votre métier. Conforme loi 2026, avec mentions légales pré-remplies.
            </p>
          </div>
        </div>
      </section>

      {/* Sections par secteur */}
      {secteurs.map(({ key, label, icon }) => {
        const profs = professions.filter(p => p.secteur === key);
        if (profs.length === 0) return null;
        return (
          <section key={key} className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8">
                <span className="mr-3">{icon}</span>{label}
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profs.map((prof) => (
                  <Link
                    key={prof.slug}
                    href={`/modeles-facture/${prof.slug}`}
                    className="group p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all"
                  >
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                      Facture {prof.nom}
                    </h3>
                    <p className="text-sm text-gray-500">TVA {prof.tva.taux}% • {prof.obligations.length} obligations</p>
                    <span className="inline-flex items-center gap-1 text-xs text-purple-600 mt-2 font-medium">
                      Voir le modèle <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Votre métier n'est pas dans la liste ?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Factu.me s'adapte à tous les métiers. Créez vos factures personnalisées en 30 secondes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-purple-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Commencer gratuitement
          </Link>
        </div>
      </section>

      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Modèles de facture', url: 'https://factu.me/modeles-facture' },
        ]}
      />
    </div>
  );
}
