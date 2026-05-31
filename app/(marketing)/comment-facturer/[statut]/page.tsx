import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Zap, ArrowRight, FileText, Shield, Scale, ArrowRightCircle } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';
import { getStatut, getAllStatutSlugs, statuts, professions } from '@/lib/seo-data';

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: Promise<{ statut: string }>;
}

export async function generateStaticParams() {
  return getAllStatutSlugs().map((statut) => ({ statut }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { statut: slug } = await params;
  const data = getStatut(slug);
  if (!data) return {};

  const title = `Comment Facturer en tant que ${data.nom} — Guide 2026 | Factu.me`;
  const description = `Guide complet pour facturer en ${data.nom} : obligations, mentions légales, TVA, régime fiscal. Outil gratuit conforme loi 2026.`;
  const url = `https://factu.me/comment-facturer/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Factu.me',
      images: [{ url: `https://factu.me/og-facturer-${slug}.png`, width: 1200, height: 630, alt: `Facturer en ${data.nom}` }],
    },
    alternates: { canonical: url },
  };
}

export default async function StatutPage({ params }: Props) {
  const { statut: slug } = await params;
  const data = getStatut(slug);
  if (!data) notFound();

  const similarStatuts = data.statutsCompatibles
    .map(s => statuts.find(st => st.slug === s))
    .filter(Boolean);

  const compatibleProfessions = professions.filter(
    p => p.statuts.includes(slug)
  );

  const faqItems = [
    {
      question: `Quelles mentions légales sur une facture de ${data.nom} ?`,
      answer: `Les mentions obligatoires pour une facture de ${data.nom} sont : ${data.mentionsSpecifiques.join(', ')}, numéro de facture séquentiel, date, description des prestations, prix HT/TTC, taux de TVA. ${data.tva.assujetti ? '' : data.tva.mentionFranchise}`,
    },
    {
      question: `${data.nom} : quel régime fiscal ?`,
      answer: `${data.nom} est soumis au régime : ${data.regimeImposition}. ${data.tva.assujetti ? 'Vous êtes assujetti à la TVA et devez la collecter sur vos factures.' : `Vous n'êtes pas assujetti à la TVA. ${data.tva.seuilFranchise}`}`,
    },
    {
      question: `Quand choisir le statut ${data.nom} ?`,
      answer: data.casUsage,
    },
    {
      question: `${data.nom} vs ${similarStatuts[0]?.nom || 'autres statuts'} : quelle différence ?`,
      answer: data.comparaison,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Comment facturer', href: '/comment-facturer' },
            { label: data.nom, href: `/comment-facturer/${slug}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
              <Shield className="w-4 h-4" />
              Guide conforme 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Comment facturer en tant que <span className="text-emerald-600">{data.nom}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              {data.texteIntro}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Commencer à facturer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quand choisir ce statut */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Quand choisir le statut {data.nom} ?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto text-lg leading-relaxed">
            {data.casUsage}
          </p>
        </div>
      </section>

      {/* Mentions obligatoires */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Vos obligations de facturation en {data.nom}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Voici toutes les mentions légales que vous devez faire figurer sur vos factures.
          </p>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                {data.mentionsSpecifiques.map((mention, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{mention}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Numéro de facture séquentiel</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Date d'émission</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Identité et adresse du client</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Description des prestations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Prix HT, TVA et TTC</span>
                </div>
                {data.tva.mentionFranchise && (
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{data.tva.mentionFranchise}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Régime fiscal & TVA */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Régime fiscal et TVA en {data.nom}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg">
              <Scale className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Régime d'imposition</h3>
              <p className="text-gray-700 mb-4">{data.regimeImposition}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Assujetti TVA</span>
                  <span className={`font-bold ${data.tva.assujetti ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {data.tva.assujetti ? 'Oui' : 'Non (franchise)'}
                  </span>
                </div>
                {data.tva.seuilFranchise && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600">Seuil de franchise : <strong>{data.tva.seuilFranchise}</strong></p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg">
              <FileText className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Comment créer vos factures</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-medium text-gray-900">Inscrivez-vous sur Factu.me</p>
                    <p className="text-sm text-gray-600">Gratuit, 30 secondes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-medium text-gray-900">Sélectionnez votre statut {data.nom}</p>
                    <p className="text-sm text-gray-600">Les mentions légales se remplissent automatiquement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-medium text-gray-900">Créez et envoyez votre facture</p>
                    <p className="text-sm text-gray-600">Export PDF ou envoi direct par email</p>
                  </div>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center justify-center w-full px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all"
              >
                Commencer gratuitement <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages & Inconvénients */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Avantages et inconvénients du statut {data.nom}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-emerald-100">
              <h3 className="text-xl font-bold text-emerald-700 mb-6">Avantages</h3>
              <ul className="space-y-3">
                {data.avantages.map((avantage, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{avantage}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-3xl p-8 border border-amber-100">
              <h3 className="text-xl font-bold text-amber-700 mb-6">Points d'attention</h3>
              <ul className="space-y-3">
                {data.inconvenients.map((inconvenient, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{inconvenient}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparaison */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            {data.nom} vs autres statuts
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto text-lg leading-relaxed">
            {data.comparaison}
          </p>
        </div>
      </section>

      {/* Professions compatibles — Maillage Statut→Profession */}
      {compatibleProfessions.length > 0 && (
        <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
              Modèles de facture compatibles avec {data.nom}
            </h2>
            <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {compatibleProfessions.map(prof => (
                <Link
                  key={prof.slug}
                  href={`/modeles-facture/${prof.slug}`}
                  className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    Facture {prof.nom}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">TVA {prof.tva.taux}% • {prof.secteur}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium">
                    Voir le modèle <ArrowRightCircle className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Autres statuts */}
      {similarStatuts.length > 0 && (
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
              Autres statuts juridiques
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {similarStatuts.map(s => s && (
                <Link
                  key={s.slug}
                  href={`/comment-facturer/${s.slug}`}
                  className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">{s.nom}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{s.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600 mt-3 font-medium">
                    Voir le guide <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Prêt à facturer en tant que {data.nom} ?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Créez vos factures conformes en 30 secondes
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            10 factures gratuites par mois • Sans engagement • Conforme loi 2026
          </p>
        </div>
      </section>

      {/* Schema.org */}
      <FAQSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Comment facturer', url: 'https://factu.me/comment-facturer' },
          { name: data.nom, url: `https://factu.me/comment-facturer/${slug}` },
        ]}
      />
      <HowToSchema
        name={`Comment facturer en tant que ${data.nom}`}
        description={`Guide complet pour facturer en ${data.nom} : mentions légales, TVA, régime fiscal.`}
        steps={[
          { name: 'Inscrivez-vous', text: 'Créez votre compte Factu.me gratuitement.' },
          { name: 'Sélectionnez votre statut', text: `Choisissez ${data.nom} pour que les mentions légales se remplissent.` },
          { name: 'Créez votre facture', text: 'Remplissez les prestations, vérifiez et envoyez.' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/comment-facturer', label: 'Tous les statuts' },
          { href: '/facture-gratuite', label: 'Facture gratuite' },
          { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
          ...compatibleProfessions.slice(0, 3).map(p => ({ href: `/modeles-facture/${p.slug}`, label: `Facture ${p.nom}` })),
          ...similarStatuts.map(s => s && { href: `/comment-facturer/${s.slug}`, label: s.nom }),
        ].filter(Boolean) as { href: string; label: string }[]}
      />
    </div>
  );
}
