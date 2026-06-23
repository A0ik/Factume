import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Zap, Clock, ShieldCheck, Building2, ArrowRight, CheckCircle2, Gauge } from 'lucide-react';

import { getProfession, getAllProfessionSlugs, professions } from '@/lib/seo-data';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

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

  const title = `Facture Rapide pour ${data.nom} — En moins de 60 secondes | Factu.me`;
  const description = `Créez une facture de ${data.nomLower} en moins de 60 secondes avec l'IA de Factu.me. TVA à ${data.tva.taux}% appliquée, mentions légales, format Factur-X. Le moyen le plus rapide de facturer pour ${data.nomLower}.`;
  const url = `https://factu.me/facture-rapide/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Factu.me',
      type: 'website',
      locale: 'fr_FR',
      images: [
        {
          url: `/api/og?title=Facture%20Rapide%20${encodeURIComponent(data.nom)}&description=${encodeURIComponent(`Facture pour ${data.nomLower} en moins de 60 secondes`)}&theme=green`,
          width: 1200,
          height: 630,
          alt: `Facture rapide pour ${data.nom} — Factu.me`,
        },
      ],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

export default async function FactureRapideProfessionPage({ params }: Props) {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) notFound();

  const terrain = data.secteur === 'artisan' ? 'sur le chantier' : data.secteur === 'freelance' ? 'entre deux missions' : 'en déplacement';
  const exemple = data.lignesExemple[0];
  const exempleTexte = exemple
    ? `« Facture pour mon client : ${exemple.description}, ${exemple.quantite} à ${exemple.prixUnitaire} € HT. »`
    : `« Facture pour mon client, ma prestation de ${data.nomLower} ce mois-ci. »`;

  const faqItems = [
    {
      question: `Comment faire une facture rapide pour ${data.nomLower} ?`,
      answer: `Décrivez votre prestation de ${data.nomLower} (au clavier ou à la voix), l'IA de Factu.me pré-remplit la facture, applique la TVA à ${data.tva.taux}%, ajoute les mentions légales et génère un Factur-X. Vous vérifiez et envoyez — le tout en moins de 60 secondes.`,
    },
    {
      question: `Combien de temps faut-il pour créer une facture de ${data.nomLower} ?`,
      answer: `Moins de 60 secondes avec Factu.me, contre 10 à 20 minutes avec un tableur ou un logiciel classique. L'IA pré-remplit les champs, calcule la TVA à ${data.tva.taux}% et ajoute les mentions à votre place.`,
    },
    {
      question: `La facture rapide pour ${data.nomLower} est-elle conforme ?`,
      answer: `Oui. La rapidité ne sacrifie jamais la conformité : chaque facture contient les mentions obligatoires${data.obligations.length > 0 ? ` (${data.obligations[0].toLowerCase()})` : ''}, le numéro SIRET, les conditions de paiement et respecte le format Factur-X (EN 16931) pour la facturation électronique 2026.`,
    },
    {
      question: `Quel taux de TVA pour une facture de ${data.nomLower} ?`,
      answer: `L'IA applique automatiquement le bon taux pour ${data.nomLower} : ${data.tva.taux} %${data.tva.franchise ? ', ou la franchise en base de TVA si vous êtes sous les seuils' : ''}.${data.tva.mentionSpecifique ? ` Mention associée : « ${data.tva.mentionSpecifique} ».` : ''} Vous n'avez aucun calcul à faire.`,
    },
    {
      question: `Peut-on créer une facture rapide de ${data.nomLower} depuis un téléphone ?`,
      answer: `Oui. Factu.me est une application web progressive (PWA) qui fonctionne sur mobile, ordinateur et ${terrain}. Vous facturez en moins d'une minute depuis votre téléphone, même entre deux clients.`,
    },
    {
      question: `Facture rapide ou facture classique pour ${data.nomLower} ?`,
      answer: `Une facture rapide de ${data.nomLower} a exactement la même valeur légale qu'une facture classique. La seule différence : l'IA fait le travail de saisie, de calcul de TVA et d'ajout des mentions à votre place. Vous gagnez 95 % de temps sans rien sacrifier à la conformité.`,
    },
  ];

  const howToSteps = [
    { name: `Décrivez votre prestation de ${data.nomLower}`, text: `Saisissez ou dictez votre facture en une phrase. ${exempleTexte} L'IA comprend et pré-remplit tous les champs.` },
    { name: `L'IA calcule et met en conformité`, text: `En 2 à 3 secondes, l'IA applique la TVA à ${data.tva.taux}%, ajoute les mentions légales${data.obligations.length > 0 ? ` (${data.obligations[0].toLowerCase()})` : ''} et génère le format Factur-X.` },
    { name: `Vérifiez en un coup d'œil`, text: `Relisez la facture pré-remplie, corrigez si besoin. Chaque champ est contrôlé : montants, TVA, coordonnées, échéance.` },
    { name: `Signez et envoyez`, text: `Signez (eIDAS gratuit), envoyez par email ou lien de paiement. Le suivi d'encaissement est automatique.` },
  ];

  const benefits = [
    { icon: Gauge, title: 'Moins de 60 secondes', text: `Une facture de ${data.nomLower} en moins d'une minute, contre 10-20 min à la main. L'IA fait la saisie et les calculs.` },
    { icon: Zap, title: `IA accélératrice`, text: `L'IA pré-remplit, applique la TVA à ${data.tva.taux}% et ajoute les mentions. Vous ne saisissez plus, vous validez.` },
    { icon: ShieldCheck, title: 'Conforme, même rapide', text: `Mentions légales, Factur-X (EN 16931), signature eIDAS. La vitesse ne sacrifie jamais la conformité.` },
    { icon: Building2, title: 'Zéro aller-retour', text: `Pas de tableur, pas de logiciel à configurer. Tout est pré-rempli depuis votre profil et vos clients habituels.` },
  ];

  return (
    <main id="landing" className="min-h-screen bg-white text-gray-900 antialiased overflow-x-hidden">
      <FAQSchema items={faqItems} />
      <HowToSchema
        name={`Comment créer une facture rapide pour ${data.nomLower}`}
        description={`Créer une facture de ${data.nomLower} en moins de 60 secondes avec Factu.me.`}
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture rapide', url: 'https://factu.me/facture-rapide' },
          { name: `Facture rapide ${data.nom}`, url: `https://factu.me/facture-rapide/${slug}` },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.seo-def', '.howto-step']}
        url={`https://factu.me/facture-rapide/${slug}`}
        name={`Facture rapide pour ${data.nom}`}
        description={`Créer une facture de ${data.nomLower} en moins de 60 secondes.`}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-6">
            <Zap className="w-3.5 h-3.5" /> En moins de 60 secondes
          </div>
          <h1 className="text-[clamp(2.1rem,6.5vw,3.4rem)] md:text-5xl font-bold tracking-tight leading-[1.08]">
            Facture rapide pour <span className="text-amber-400">{data.nom}</span>
          </h1>
          <p className="seo-def mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Créez une facture de {data.nomLower} en moins de 60 secondes. L'IA pré-remplit, applique la TVA à {data.tva.taux}%,
            ajoute les mentions légales — vous validez et envoyez, {terrain}.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400">
              Essayer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/facture-rapide" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10">
              Voir la facture rapide
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">Sans carte bancaire · 3 factures offertes · Conforme Factur-X 2026</p>
        </div>
      </section>

      {/* BÉNÉFICES */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            La facture la plus rapide pour {data.nomLower}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-200 p-6 transition-colors hover:border-amber-300">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1.5 text-gray-600 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOWTO + EXEMPLE */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Une facture de {data.nomLower} en 4 étapes, 60 secondes
          </h2>
          <ol className="space-y-5">
            {howToSteps.map((step, i) => (
              <li key={i} className="howto-step flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-white">{i + 1}</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{step.name}</h3>
                  <p className="mt-1.5 text-gray-600 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5 text-amber-600" />
              <strong>Exemple pour {data.nomLower} :</strong> {exempleTexte} → l'IA sort une facture complète, TVA {data.tva.taux}% calculée, prête à signer.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-10">
            Questions fréquentes — facture rapide {data.nomLower}
          </h2>
          <div className="space-y-3">
            {faqItems.map((f) => (
              <details key={f.question} className="group rounded-xl border border-gray-200 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-gray-900 list-none">
                  {f.question}
                  <span className="text-amber-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Facturez vos {data.nomLower} en 60 secondes</h2>
          <p className="mt-3 text-slate-300">Conforme Factur-X, signé eIDAS. Sans carte bancaire.</p>
          <Link href="/register" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400">
            Commencer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* RELATED */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <RelatedPages
            pages={[
              { href: '/facture-rapide', label: 'Facture rapide — En moins de 60 secondes' },
              { href: '/facture-voix', label: 'Facture Voix — le logiciel' },
              { href: '/facture-ia', label: 'Facture IA' },
              { href: `/facture-ia/${slug}`, label: `Facture IA pour ${data.nom}` },
              { href: `/facture-voix/${slug}`, label: `Facture voix ${data.nom}` },
              ...professions
                .filter((p) => data.metiersSimilaires.includes(p.slug))
                .slice(0, 3)
                .map((p) => ({ href: `/facture-rapide/${p.slug}`, label: `Facture rapide ${p.nom}` })),
            ]}
          />
        </div>
      </section>
    </main>
  );
}
