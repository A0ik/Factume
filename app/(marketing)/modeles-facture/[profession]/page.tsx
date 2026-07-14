import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, FileText, Zap, ArrowRight, Shield, Calculator, Scale, AlertTriangle } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';
import { getProfession, getAllProfessionSlugs, professions } from '@/lib/seo-data';

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: Promise<{ profession: string }>;
}

export async function generateStaticParams() {
  return getAllProfessionSlugs().map((profession) => ({ profession }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) return {};

  const title = `Modèle de Facture ${data.nom} Gratuit — Conforme 2026 | Factu.me`;
  const description = `Modèle de facture pour ${data.nomLower} : TVA ${data.tva.taux}%, mentions légales, obligations. Gratuit, personnalisable, conforme 2026. Créez en 30 secondes.`;
  const url = `https://factu.me/modeles-facture/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Factu.me',
      images: [{ url: `https://factu.me/og-facture-${slug}.png`, width: 1200, height: 630, alt: `Facture ${data.nom}` }],
    },
    alternates: { canonical: url },
  };
}

export default async function ProfessionPage({ params }: Props) {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) notFound();

  const totalExemple = data.lignesExemple.reduce((acc, l) => acc + l.quantite * l.prixUnitaire, 0);
  const similarProfessions = data.metiersSimilaires
    .map(s => professions.find(p => p.slug === s))
    .filter(Boolean);

  const faqItems = [
    {
      question: `Quelles sont les mentions obligatoires sur une facture de ${data.nomLower} ?`,
      answer: `Une facture de ${data.nomLower} doit contenir : votre nom/prénom ou raison sociale, adresse, SIRET, numéro de facture séquentiel, date, nom du client, description des prestations, prix HT et TTC, taux de TVA${data.tva.franchise ? `, et la mention "${data.tva.mentionSpecifique}"` : ''}.`,
    },
    {
      question: `Quel taux de TVA appliquer pour un(e) ${data.nomLower} ?`,
      answer: data.tva.franchise
        ? `En franchise de TVA (micro-entreprise), vous n'êtes pas assujetti. Mentionnez "${data.tva.mentionSpecifique}" sur vos factures. Le taux normal est de ${data.tva.taux}% si vous dépassez les seuils.`
        : `Le taux de TVA applicable est de ${data.tva.taux}%. Vous devez collecter et reverser la TVA sur toutes vos factures.`,
    },
    {
      question: `Factu.me gère-t-il les spécificités de facturation des ${data.nomLower}s ?`,
      answer: `Oui, Factu.me intègre les spécificités de facturation des ${data.nomLower}s : TVA à ${data.tva.taux}% ${data.tva.franchise ? 'ou mention de franchise' : ''}, ${data.obligations[0]?.toLowerCase() || 'obligations légales'}, mentions légales pré-remplies, export PDF professionnel. Gratuit jusqu'à 10 factures par mois.`,
    },
    {
      question: data.tva.franchise
        ? `Que se passe-t-il si je dépasse les seuils de micro-entreprise en tant que ${data.nomLower} ?`
        : `Quelle est la différence entre le réel simplifié et le réel normal pour un(e) ${data.nomLower} ?`,
      answer: data.tva.franchise
        ? `Si vous dépassez les seuils de la micro-entreprise, vous basculez automatiquement vers le régime réel. Vous devrez alors collecter et reverser la TVA à ${data.tva.taux}%, tenir une comptabilité complète et établir une liasse fiscale. Anticipez ce passage avec Factu.me qui gère les deux régimes.`
        : `Le réel simplifié limite les obligations déclaratives (liasse fiscale allégée) mais ne permet pas de déduire toutes les charges. Le réel normal est plus contraignant mais offre une déduction au réel de toutes vos charges professionnelles de ${data.nomLower}.`,
    },
    {
      question: data.tva.franchise
        ? `Puis-je facturer en tant que ${data.nomLower} auto-entrepreneur ?`
        : `Quelles sont les obligations comptables pour un(e) ${data.nomLower} ?`,
      answer: data.tva.franchise
        ? `Oui, vous pouvez facturer en tant que ${data.nomLower} auto-entrepreneur. Vos factures doivent simplement mentionner "${data.tva.mentionSpecifique}" et ne pas inclure de TVA.`
        : `Vous devez tenir une comptabilité régulière, facturer avec TVA à ${data.tva.taux}%, établir une liasse fiscale annuelle et conserver vos factures 10 ans.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Visual Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Modèles de facture', href: '/modeles-facture' },
            { label: `Facture ${data.nom}`, href: `/modeles-facture/${slug}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
              <FileText className="w-4 h-4" />
              Modèle conforme 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facture pour <span className="text-emerald-600">{data.nom}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              {data.texteIntro}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Gratuit jusqu'à 10 factures/mois • ✓ Conforme loi 2026
            </p>
          </div>
        </div>
      </section>

      {/* Mentions obligatoires */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Mentions obligatoires pour les {data.nomLower}s
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Chaque facture de {data.nomLower} doit contenir ces mentions légales pour être conforme.
          </p>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                {data.obligations.map((obligation, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{obligation}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Numéro de facture séquentiel</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Date d'émission et date d'échéance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Prix HT, TVA et TTC par ligne</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Coordonnées complètes du client</span>
                </div>
                {data.tva.franchise && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{data.tva.mentionSpecifique}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exemple de facture */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Exemple de facture pour {data.nomLower}
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">FACTURE</h3>
                    <p className="text-emerald-200 text-sm">FA-2026-001 • 30 mai 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Factu.me</p>
                    <p className="text-emerald-200 text-sm">Votre Entreprise</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Facturé à</p>
                  <p className="font-semibold">Client Exemple</p>
                  <p className="text-sm text-gray-600">123 Rue Exemple, 75001 Paris</p>
                </div>
                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-semibold text-gray-900">Description</th>
                      <th className="text-center py-3 text-sm font-semibold text-gray-900">Qté</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-900">Prix unit. HT</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-900">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lignesExemple.map((ligne, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 text-sm text-gray-700">{ligne.description}</td>
                        <td className="py-3 text-sm text-gray-700 text-center">{ligne.quantite}</td>
                        <td className="py-3 text-sm text-gray-700 text-right">{ligne.prixUnitaire.toLocaleString('fr-FR')} €</td>
                        <td className="py-3 text-sm text-gray-700 text-right font-medium">{(ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR')} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">Total HT</span>
                      <span className="font-medium">{totalExemple.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-gray-600">TVA ({data.tva.taux}%)</span>
                      <span className="font-medium">{(totalExemple * data.tva.taux / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200">
                      <span>Total TTC</span>
                      <span className="text-emerald-600">{(totalExemple * (1 + data.tva.taux / 100)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    {data.tva.franchise && (
                      <p className="text-xs text-gray-500 mt-2 italic">{data.tva.mentionSpecifique}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg"
              >
                Créer cette facture maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Conseils de facturation */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Conseils de facturation pour {data.nomLower}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {data.description}
          </p>
          <div className="space-y-6">
            {data.conseilsFacturation.map((conseil, i) => (
              <div key={i} className="flex gap-4 p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 font-bold text-sm">{i + 1}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{conseil}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TVA & Régime */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            TVA et régime fiscal pour {data.nomLower}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-emerald-100">
              <Calculator className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Taux de TVA applicable</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                  <span className="text-gray-700">Taux applicable</span>
                  <span className="font-bold text-emerald-600">{data.tva.taux}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                  <span className="text-gray-700">Franchise de TVA</span>
                  <span className={`font-bold ${data.tva.franchise ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {data.tva.franchise ? 'Oui (sous seuil)' : 'Non'}
                  </span>
                </div>
                {data.tva.franchise && (
                  <p className="text-sm text-gray-600 pt-2 italic">{data.tva.mentionSpecifique}</p>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-emerald-100">
              <Scale className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Régimes compatibles</h3>
              <ul className="space-y-3">
                {data.regimes.map((regime, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700">{regime}</span>
                  </li>
                ))}
                {data.statuts.map((statut, i) => (
                  <li key={`s-${i}`} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <Link href={`/comment-facturer/${statut}`} className="text-gray-700 hover:text-emerald-600 transition-colors">
                      Statut : {statut}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Erreurs à éviter */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Erreurs de facturation à éviter pour les {data.nomLower}s
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Ces erreurs courantes peuvent entraîner des sanctions fiscales ou des litiges avec vos clients.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {data.erreursCourantes.map((erreur, i) => (
              <div key={i} className="flex gap-3 p-5 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed">{erreur}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Obligations spécifiques */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Obligations spécifiques aux {data.nomLower}s
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {data.obligations.map((obligation, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Shield className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{obligation}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Obligation légale à respecter pour l'exercice de votre activité de {data.nomLower}.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Métiers similaires */}
      {similarProfessions.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
              Facturation pour des métiers similaires
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {similarProfessions.map((prof) => prof && (
                <Link
                  key={prof.slug}
                  href={`/modeles-facture/${prof.slug}`}
                  className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    Facture {prof.nom}
                  </h3>
                  <p className="text-sm text-gray-600">TVA {prof.tva.taux}% • {prof.secteur}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600 mt-3 font-medium">
                    Voir le modèle <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Final */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez votre facture de {data.nomLower} maintenant
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Gratuit, conforme loi 2026, prêt en 30 secondes
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            10 factures gratuites par mois • Sans engagement • Sans carte bancaire
          </p>
        </div>
      </section>

      {/* Schema.org */}
      <FAQSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Modèles de facture', url: 'https://factu.me/modeles-facture' },
          { name: `Facture ${data.nom}`, url: `https://factu.me/modeles-facture/${slug}` },
        ]}
      />
      <HowToSchema
        name={`Comment créer une facture pour ${data.nomLower}`}
        description={`Guide pour créer une facture conforme pour ${data.nomLower} avec Factu.me`}
        steps={[
          { name: 'Inscrivez-vous gratuitement', text: 'Créez votre compte Factu.me gratuitement en 30 secondes.' },
          { name: `Choisissez le modèle ${data.nom}`, text: `Sélectionnez le modèle de facture adapté aux ${data.nomLower}s avec les mentions légales pré-remplies.` },
          { name: 'Remplissez et envoyez', text: 'Ajoutez vos lignes de prestation, le montant et envoyez directement par email.' },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": `Factu.me — Facturation pour ${data.nom}`,
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "description": `Logiciel de facturation conforme pour ${data.nomLower}. TVA ${data.tva.taux}%, mentions légales pré-remplies. Gratuit jusqu'à 10 factures/mois.`,
            "featureList": data.conseilsFacturation.slice(0, 3).join(' ; '),
          })
        }}
      />
      <RelatedPages
        pages={[
          { href: '/modeles-facture', label: 'Tous les modèles de facture' },
          { href: '/facture-gratuite', label: 'Facture gratuite en ligne' },
          { href: '/creer-facture', label: 'Créer une facture' },
          ...similarProfessions.map(p => p && { href: `/modeles-facture/${p.slug}`, label: `Facture ${p.nom}` }),
        ].filter(Boolean) as { href: string; label: string }[]}
      />
    </div>
  );
}
