import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Mic, Clock, ShieldCheck, Building2, ArrowRight, CheckCircle2, Volume2 } from 'lucide-react';

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

  const title = `Facture Voix pour ${data.nom} — Dictez vos factures | Factu.me`;
  const description = `Logiciel de facture vocale pour ${data.nomLower}. Dictez votre facture de ${data.nomLower}, l'IA applique la TVA à ${data.tva.taux}%, ajoute les mentions légales et génère un Factur-X conforme. Essai gratuit.`;
  const url = `https://factu.me/facture-voix/${slug}`;

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
          url: `/api/og?title=Facture%20Voix%20${encodeURIComponent(data.nom)}&description=${encodeURIComponent(`Dictez vos factures de ${data.nomLower}`)}&theme=blue`,
          width: 1200,
          height: 630,
          alt: `Facture vocale pour ${data.nom} — Factu.me`,
        },
      ],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

export default async function FactureVoixProfessionPage({ params }: Props) {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) notFound();

  const terrain = data.secteur === 'artisan' ? 'sur le chantier' : data.secteur === 'freelance' ? 'entre deux missions' : 'en déplacement';
  const exemple = data.lignesExemple[0];
  const exempleTexte = exemple
    ? `« Crée une facture pour mon client. ${exemple.description}, ${exemple.quantite} à ${exemple.prixUnitaire} € HT, TVA ${exemple.tva} %. »`
    : `« Crée une facture pour mon client, ma prestation de ${data.nomLower} ce mois-ci. »`;

  const faqItems = [
    {
      question: `Comment créer une facture pour ${data.nomLower} avec la voix ?`,
      answer: `Ouvrez Factu.me, appuyez sur le micro et dictez naturellement votre prestation de ${data.nomLower}. L'IA transforme votre voix en facture complète avec TVA à ${data.tva.taux}%, mentions légales et format Factur-X, prête à signer et envoyer en 30 secondes.`,
    },
    {
      question: `La facture vocale pour ${data.nomLower} est-elle conforme ?`,
      answer: `Oui. Chaque facture dictée contient les mentions obligatoires${data.obligations.length > 0 ? ` (${data.obligations[0].toLowerCase()})` : ''}, le numéro SIRET, les conditions de paiement et respecte le format Factur-X (EN 16931) pour la facturation électronique 2026.`,
    },
    {
      question: `Quel taux de TVA l'IA applique-t-elle pour un ${data.nomLower} ?`,
      answer: `L'IA applique automatiquement le taux de TVA adapté à votre activité de ${data.nomLower} (${data.tva.taux} %${data.tva.franchise ? ', ou la franchise en base de TVA si vous êtes concerné' : ''}). ${data.tva.mentionSpecifique ? `Mention insérée : « ${data.tva.mentionSpecifique} ».` : ''}`,
    },
    {
      question: `Peut-on dicter une facture de ${data.nomLower} ${terrain} ?`,
      answer: `C'est l'usage idéal. ${data.nom === 'Plombier' || data.secteur === 'artisan' ? `Les ${data.nomLower}s facturent souvent ${terrain}, sans ordinateur.` : `Les ${data.nomLower}s facturent ${terrain}.`} Avec la voix, vous dictez la facture en 30 secondes depuis votre téléphone et l'envoyez avant de quitter le client.`,
    },
    {
      question: `Combien de temps faut-il pour dicter une facture de ${data.nomLower} ?`,
      answer: `Environ 30 secondes : vous dictez, l'IA génère la facture en 2 à 3 secondes, vous vérifiez puis envoyez. Soit un gain de temps d'environ 95 % par rapport à la saisie manuelle.`,
    },
    {
      question: data.tva.franchise ? `La mention de franchise de TVA est-elle ajoutée seule ?` : `L'IA reconnaît-elle le vocabulaire de ${data.nomLower} ?`,
      answer: data.tva.franchise
        ? `Oui. Si vous êtes en franchise en base de TVA, la mention « TVA non applicable, article 293 B du CGI » est insérée automatiquement. Vous n'avez rien à mémoriser ni à saisir.`
        : `Oui. Le modèle vocal est entraîné sur le vocabulaire des métiers français, y compris les termes techniques du métier de ${data.nomLower}. Le taux de compréhension dépasse 98 %.`,
    },
  ];

  const howToSteps = [
    { name: `Ouvrez Factu.me et activez le micro`, text: `Lancez l'application sur votre téléphone ou ordinateur, appuyez sur le microphone. Le micro de votre appareil suffit.` },
    { name: `Dictez votre facture de ${data.nomLower}`, text: `Parlez naturellement. ${exempleTexte} L'IA comprend le langage naturel et le vocabulaire de votre métier.` },
    { name: `L'IA calcule, structure et met en conformité`, text: `En 2 à 3 secondes, l'IA génère la facture avec lignes détaillées, TVA à ${data.tva.taux}%, mentions légales et format Factur-X.` },
    { name: `Vérifiez, signez et envoyez`, text: `Relisez la facture pré-remplie, corrigez si besoin, signez (eIDAS) et envoyez par email ou lien de paiement. Le suivi est automatique.` },
  ];

  const benefits = [
    { icon: Clock, title: '30 secondes par facture', text: `Dicter votre facture de ${data.nomLower} prend ~30 s, contre 10-20 min à la main. Gain de ~95 %.` },
    { icon: Volume2, title: `Mains libres ${terrain}`, text: `Idéal ${terrain}. Vous parlez, vous ne tapez pas. Le micro du téléphone suffit.` },
    { icon: ShieldCheck, title: 'Conformité automatique', text: `TVA à ${data.tva.taux}% appliquée, mentions légales${data.obligations.length > 0 ? ` (${data.obligations[0].toLowerCase()})` : ''} et Factur-X générés automatiquement.` },
    { icon: Building2, title: 'Zéro oubli', text: `L'IA ajoute les mentions obligatoires et applique les bons taux. Fini les oublis coûteux en redressement.` },
  ];

  return (
    <main id="landing" className="min-h-screen bg-white text-gray-900 antialiased overflow-x-hidden">
      <FAQSchema items={faqItems} />
      <HowToSchema
        name={`Comment créer une facture vocale pour ${data.nomLower}`}
        description={`Guide pas à pas pour dicter une facture de ${data.nomLower} avec Factu.me.`}
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture Voix', url: 'https://factu.me/facture-voix' },
          { name: `Facture voix ${data.nom}`, url: `https://factu.me/facture-voix/${slug}` },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.seo-def', '.howto-step']}
        url={`https://factu.me/facture-voix/${slug}`}
        name={`Facture voix pour ${data.nom}`}
        description={`Créer une facture de ${data.nomLower} par dictée vocale IA.`}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-6">
            <Mic className="w-3.5 h-3.5" /> Facture vocale
          </div>
          <h1 className="text-[clamp(2.1rem,6.5vw,3.4rem)] md:text-5xl font-bold tracking-tight leading-[1.08]">
            Facture voix pour <span className="text-blue-400">{data.nom}</span>
          </h1>
          <p className="seo-def mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dictez votre facture de {data.nomLower}, l'IA applique la TVA à {data.tva.taux}%, ajoute les mentions légales
            et génère un Factur-X conforme — en 30 secondes, {terrain}.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400">
              Essayer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/facture-voix" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10">
              Voir le logiciel facture voix
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">Sans carte bancaire · 3 factures offertes · Conforme Factur-X 2026</p>
        </div>
      </section>

      {/* BÉNÉFICES */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Pourquoi dicter vos factures de {data.nomLower}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-200 p-6 transition-colors hover:border-blue-300">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
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
            Comment dictée une facture de {data.nomLower}, étape par étape
          </h2>
          <ol className="space-y-5">
            {howToSteps.map((step, i) => (
              <li key={i} className="howto-step flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white">{i + 1}</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{step.name}</h3>
                  <p className="mt-1.5 text-gray-600 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <p className="text-sm text-blue-900 leading-relaxed">
              <CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5 text-blue-600" />
              <strong>Exemple de dictée pour {data.nomLower} :</strong> {exempleTexte}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-10">
            Questions fréquentes — facture voix {data.nomLower}
          </h2>
          <div className="space-y-3">
            {faqItems.map((f) => (
              <details key={f.question} className="group rounded-xl border border-gray-200 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-gray-900 list-none">
                  {f.question}
                  <span className="text-blue-500 transition-transform group-open:rotate-45">+</span>
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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Prêt à dicter vos factures de {data.nomLower} ?</h2>
          <p className="mt-3 text-slate-300">30 secondes par facture, conforme Factur-X, signé eIDAS. Sans carte bancaire.</p>
          <Link href="/register" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400">
            Commencer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* RELATED */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <RelatedPages
            pages={[
              { href: '/facture-voix', label: 'Facture Voix — le logiciel' },
              { href: '/facture-avec-la-voix', label: 'Comment faire une facture avec la voix' },
              { href: '/facture-ia', label: 'Facture IA' },
              { href: '/facture-rapide', label: 'Facture rapide' },
              { href: `/facture-ia/${slug}`, label: `Facture IA pour ${data.nom}` },
              ...professions
                .filter((p) => data.metiersSimilaires.includes(p.slug))
                .slice(0, 4)
                .map((p) => ({ href: `/facture-voix/${p.slug}`, label: `Facture voix ${p.nom}` })),
            ]}
          />
        </div>
      </section>
    </main>
  );
}
