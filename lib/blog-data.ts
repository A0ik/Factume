export interface BlogPostSection {
  title: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readTime: string;
  category: string;
  image: string;
  content: BlogPostSection[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'guide-facturation-auto-entrepreneur-2025',
    title: 'Guide complet de la facturation pour auto-entrepreneur en 2025',
    description: 'Tout ce que vous devez savoir sur la facturation quand vous êtes auto-entrepreneur : obligations légales, seuils de TVA, mentions obligatoires, outils et bonnes pratiques.',
    date: '2025-01-15',
    author: 'Équipe Factu.me',
    readTime: '8 min',
    category: 'Guide',
    image: '/blog/facturation-auto-entrepreneur.jpg',
    content: [
      {
        title: 'Pourquoi la facturation est essentielle pour un auto-entrepreneur',
        paragraphs: [
          'En tant qu\'auto-entrepreneur, la facturation n\'est pas une simple formalité administrative : c\'est une obligation légale. Chaque prestation de service ou vente de marchandise doit faire l\'objet d\'une facture, même si votre client ne vous la réclame pas. Ne pas émettre de facture vous expose à des sanctions financières pouvant aller jusqu\'a 50% du montant de la transaction.',
          'Au-dela de l\'obligation légale, une facture professionnelle renforce votre crédibilité auprès de vos clients. Elle constitue un document comptable indispensable pour votre bilan annuel, le calcul de vos cotisations sociales et la justification de vos revenus auprès de l\'administration fiscale.',
          'En 2025, avec la dématérialisation progressive de l\'économie, disposer d\'un système de facturation fiable et conforme est plus important que jamais. Les outils modernes comme Factu.me vous permettent de créer des factures professionnelles en quelques clics, tout en respectant les normes en vigueur. Découvrez aussi nos [modèles de facture pour auto-entrepreneur](https://factu.me/comment-facturer/auto-entrepreneur).',
        ],
      },
      {
        title: 'Les mentions obligatoires sur votre facture',
        paragraphs: [
          'Une facture d\'auto-entrepreneur doit contenir un certain nombre de mentions obligatoires sous peine d\'amende. Vous devez indiquer : votre nom ou dénomination sociale, votre adresse, votre numéro SIRET, votre numéro RCS ou RM, la mention "Auto-entrepreneur" ainsi que "Entrepreneur individuel a responsabilité limitée" ou "EIRL" le cas échéant.',
          'Côté client, la facture doit mentionner le nom et l\'adresse du destinataire. Le numéro de facture doit être unique et séquentiel (sans trou dans la numérotation). La date de la facture, la désignation précisé des prestations ou produits, le prix unitaire hors taxes, la quantité et le montant total HT sont également obligatoires.',
          'Si vous etes exonéré de TVA (seuil non dépassé), vous devez impérativement ajouter la mention "TVA non applicable, article 293 B du CGI". C\'est l\'une des oublis les plus fréquents chez les auto-entrepreneurs débutants. Oublier cette mention peut valoir refus de la facture par votre client professionnel. Consultez notre [guide complet des mentions obligatoires](https://factu.me/modeles-facture).',
        ],
      },
      {
        title: 'Seuils de TVA et régimes d\'imposition en 2025',
        paragraphs: [
          'En 2025, les seuils de franchise de TVA pour les auto-entrepreneurs restent fixés à 37 500 euros pour les prestations de services et 85 000 euros pour la vente de marchandises. Tant que votre chiffre d\'affaires annuel reste en dessous de ces seuils, vous bénéficiez de la franchise de TVA et n\'avez pas à facturer la TVA à vos clients.',
          'Si vous dépassez ces seuils sur deux années consécutives, vous basculez automatiquement dans le régime réel d\'imposition. Vous devrez alors facturer la TVA (20% pour la plupart des prestations), la collecter et la reverser à l\'Etat. Cette transition impose de revoir votre tarification et vos processus comptables.',
          'Il est essentiel de surveiller votre chiffre d\'affaires tout au long de l\'année pour anticiper un éventuel dépassement de seuil. Un logiciel de facturation comme Factu.me vous alerte automatiquement quand vous approchez des limités.',
        ],
      },
      {
        title: 'Comment créer une facture professionnelle',
        paragraphs: [
          'Pour créer une facture professionnelle, commencez par choisir un modèle clair et structure. L\'en-tête doit comporter vos informations complètes (nom, adresse, SIRET). Le corps de la facture détaille chaque prestation avec sa description, sa quantité et son prix unitaire. Le pied de facture affiche les totaux, les mentions légales et vos coordonnées bancaires.',
          'Utilisez une numérotation cohérente, par exemple FAC-2025-001, FAC-2025-002, etc. Cette numérotation séquentielle est obligatoire et sera contrôlée en cas d\'inspection fiscale. Ne sautez jamais un numéro, même en cas d\'annulation : conservez la facture annulée dans vos archives.',
          'Avec un outil comme Factu.me, la création de facture est simplifiée : vous choisissez votre client, ajoutez vos lignes de prestations, et le logiciel calculé automatiquement les totaux, applique les mentions légales et généré un PDF professionnel prêt à envoyer.',
        ],
      },
      {
        title: 'Les erreurs de facturation a éviter',
        paragraphs: [
          'La première erreur courante est l\'absence de facture. Meme pour un petit montant ou une prestation informelle, une facture est obligatoire. La deuxième erreur est l\'oubli des mentions légales, notamment la mention d\'exonération de TVA. Sans cette mention, votre client peut refuser la facture et retarder le paiement.',
          'Autre erreur fréquente : la numérotation incohérente. Si l\'administration fiscale detecte des numéros manquants ou dans le désordre, elle peut soupconner une fraude. De même, ne pas dater correctement la facture ou confondre date d\'émission et date d\'échéance peut poser problème.',
          'Enfin, beaucoup d\'auto-entrepreneurs négligent la conservation des factures. Vous devez conserver une copie de chaque facture émise et reçue pendant 10 ans. Un logiciel de facturation en ligne comme Factu.me stocke automatiquement toutes vos factures de manière sécurisée et accessible a tout moment. Pour aller plus loin, lisez notre [guide sur les mentions obligatoires](https://factu.me/modeles-facture).',
        ],
      },
      {
        title: 'Les outils pour faciliter votre facturation',
        paragraphs: [
          'En 2025, de nombreux outils existent pour simplifier la facturation des auto-entrepreneurs. Le choix du bon logiciel dépend de vos besoins : simplicite d\'utilisation, automatisation des relances, conformité légale, generation de PDF professionnels, ou encore intégration avec votre comptable.',
          'Factu.me est conçu spécialement pour les auto-entrepreneurs et freelances français. Il propose la création de factures par dictée vocale grace a l\'IA, des modèles professionnels conformes à la loi française, la gestion des devis, le suivi des paiements et des relances automatiques.',
          'Quel que soit l\'outil choisi, assurez-vous qu\'il respecte la réglementation française, qu\'il permet d\'exporter vos données et qu\'il offre un support reactif. Un bon logiciel de facturation est un investissement qui vous fait gagner du temps et vous protégé juridiquement.',
        ],
      },
    ],
  },
  {
    slug: 'facture-electronique-obligatoire-2026',
    title: 'Facture électronique obligatoire en 2026 : tout savoir sur la reforme',
    description: 'La facture électronique sera obligatoire pour toutes les entreprises françaises. Découvrez les échéances, les obligations et comment vous préparer des maintenant.',
    date: '2025-02-10',
    author: 'Équipe Factu.me',
    readTime: '7 min',
    category: 'Réglementation',
    image: '/blog/facture-électronique-2026.jpg',
    content: [
      {
        title: 'Pourquoi la facture électronique devient obligatoire',
        paragraphs: [
          'La loi de finances pour 2024 a acte la generalisation de la facture électronique pour toutes les entreprises françaises. Cette reforme vise a lutter contre la fraude fiscale, estimee à plusieurs milliards d\'euros par an en France, et a moderniser le système fiscal en alignant la France sur les standards européens.',
          'L\'objectif est double : améliorer la collecte de la TVA en detectant plus rapidement les fraudes carrousels, et simplifier les obligations declaratives des entreprises. A terme, les données de facturation seront transmises automatiquement a l\'administration fiscale via des plateformes de dématérialisation certifiées (PDP).',
          'Cette reforme s\'inscrit dans le projet européen ViDA (VAT in the Digital Age) qui prevoit la generalisation de la facture électronique dans toute l\'UE d\'ici 2030. La France fait figure de pionniere avec une mise en oeuvre anticipée.',
        ],
      },
      {
        title: 'Les échéances de la reforme',
        paragraphs: [
          'Le calendrier de déploiement à été revu. A partir du 1er septembre 2026, toutes les grandes entreprises (plus de 250 salaries ou plus de 50 millions d\'euros de chiffre d\'affaires) devront émettre et recevoir des factures électroniques. Les PME et micro-entreprises seront progressivement integrees dans le perimêtre.',
          'Pour les petites et moyennes entreprises (PME), l\'obligation d\'émission de factures électroniques est prevue pour le 1er septembre 2027. En revanche, l\'obligation de reception de factures électroniques s\'appliquérà des le 1er septembre 2026 pour toutes les entreprises, quelle que soit leur taille.',
          'Meme si les auto-entrepreneurs et micro-entreprises beneficient d\'un calendrier plus souple, il est recommande de s\'y préparer des maintenant. Les plateformes de facturation comme Factu.me anticipent déjà ces changements en integrant les formats normatifs (Factur-X, UBL, CII). En savoir plus sur la [facturation électronique](https://factu.me/facturation-electronique).',
        ],
      },
      {
        title: 'Les formats et normes a respecter',
        paragraphs: [
          'La facture électronique devra respecter la norme européenne EN 16931, qui définit les informations obligatoires et leur structure. Deux formats principaux sont autorises en France : le format Factur-X (galement appele ZUGFeRD 2.0), qui combine un PDF lisible et des données structurées, et le format UBL (Universal Business Language) au format XML.',
          'Le format Factur-X est particulierement interessant car il permet de conserver un document visuellement identique aux factures PDF actuelles, tout en integrant les données structurées nécessaires à la transmission automatique. Il existe en plusieurs profils (Minimum, Basic WL, Basic, EN 16931, Extended) selon le niveau de détail requis.',
          'Si vous utilisez un logiciel de facturation conforme, vous n\'avez pas à vous soucier de ces spécifications techniques. Le logiciel généré automatiquement le bon format. Factu.me propose par exemple l\'export Factur-X en un clic, garantissant la conformité de vos factures avec la norme.',
        ],
      },
      {
        title: 'Plateformes de dématérialisation (PDP) et portail public',
        paragraphs: [
          'Pour transmettre vos factures électroniques, vous devrez passer par une Plateforme de Dematerialisation Partenaire (PDP) certifiee par l\'Etat, ou par le portail public gratuit mis en place par la DGFiP. Les PDP offrent généralement plus de fonctionnalites et une meilleure intégration avec votre logiciel de facturation.',
          'Le portail public serà une solution gratuite mais basique, adaptée aux petites structures. Les PDP, quant à elles, proposeront des services a valeur ajoutée : automatisation, rapprochement comptable, archivage legal, conformité multi-pays. Le choix entre les deux dépend de la complexite de votre activité.',
          'Il est conseille de vérifier des maintenant que votre logiciel de facturation est compatible avec au moins une PDP. Factu.me travaille déjà a l\'intégration avec les principales plateformes de dématérialisation pour garantir une transition fluide pour ses utilisateurs.',
        ],
      },
      {
        title: 'Comment se préparer des maintenant',
        paragraphs: [
          'Ne attendez pas la dernière minute pour vous mettre en conformité. Commencez par vérifier que votre logiciel de facturation actuel prevoit une mise à jour vers les formats électroniques. Si ce n\'est pas le cas, envisagez une migration vers une solution conforme comme Factu.me.',
          'Faites un audit de vos processus de facturation : comment emettez-vous vos factures actuelles ? Comment les transmettez-vous à vos clients ? Quels outils utilisez-vous pour le suivi et l\'archivage ? Cette analyse vous aidera a identifier les points a adapter.',
          'Enfin, sensibilisez vos équipes et vos clients à cette évolution. La facture électronique est une opportunite de moderniser vos échanges et de réduire les délais de paiement. C\'est aussi un gage de professionnalisme qui renforce la confiance de vos partenaires commerciaux. Découvrez comment [facturer selon votre statut](https://factu.me/comment-facturer).',
        ],
      },
    ],
  },
  {
    slug: 'mentions-legales-facture',
    title: 'Les mentions légales obligatoires sur une facture : guide complet',
    description: 'Quelles sont les mentions légales obligatoires sur une facture en France ? Découvrez la liste complète pour être en règle et éviter les amendes.',
    date: '2025-03-05',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Réglementation',
    image: '/blog/mentions-légales-facture.jpg',
    content: [
      {
        title: 'Pourquoi les mentions légales sont obligatoires',
        paragraphs: [
          'Le Code de commerce français impose un ensemble de mentions obligatoires sur chaque facture. Ces mentions servent a identifier les parties, garantir la traçabilité des transactions et faciliter les contrôles fiscaux. Une facture incomplète est considérée comme irrégulière et peut être sanctionnée d\'une amende de 15 euros par mention manquante, avec un minimum de 15% du montant de la facture.',
          'Au-dela de l\'aspect punitif, les mentions légales protegent le fournisseur et le client. Elles constituent une preuve contractuelle en cas de litige et facilitent les échanges comptables entre entreprises. Pour les auto-entrepreneurs et freelances, une facture bien redigee est aussi un marqueur de professionnalisme. Consultez nos [modèles de facture par métier](https://factu.me/modeles-facture).',
        ],
      },
      {
        title: 'Mentions concernant le vendeur ou prestataire',
        paragraphs: [
          'Votre facture doit obligatoirement indiquer votre dénomination sociale ou votre nom (pour un entrepreneur individuel). L\'adresse de votre siège social ou de votre établissement principal doit figurer clairement. Vous devez également mentionner votre numéro SIRET (14 chiffres) et votre numéro d\'immatriculation au RCS (Registre du Commerce et des Societes) ou au RM (Repertoire des Metiers).',
          'Pour les auto-entrepreneurs, la mention "Auto-entrepreneur" doit figurer explicitement. Si vous avez opte pour l\'EIRL, indiquez "Entrepreneur individuel a responsabilité limitée" ainsi que le nom du patrimoine affecté. Les societes doivent ajouter leur forme juridique (SARL, SAS, EURL, etc.), le capital social et la ville du greffe d\'immatriculation.',
          'Si vous etes assujetti à la TVA, votre numéro de TVA intracommunautaire doit apparaitre. Enfin, votre adresse email et votre numéro de telephone ne sont pas légalement obligatoires mais fortement recommandes pour faciliter les échanges avec vos clients.',
        ],
      },
      {
        title: 'Mentions concernant le client',
        paragraphs: [
          'La facture doit identifier clairement le destinataire. Pour un client professionnel, indiquez sa dénomination sociale, son adresse, son numéro SIRET et, le cas échéant, son numéro de TVA intracommunautaire. Pour un particulier, le nom et l\'adresse suffisent.',
          'Depuis la loi anti-fraude à la TVA de 2018, les factures adressees à des assujettis à la TVA doivent comporter des informations supplementaires, notamment les coordonnées complètes du client professionnel. Cette obligation vise a renforcer la traçabilité des flux commerciaux.',
        ],
      },
      {
        title: 'Mentions financières et détails de la transaction',
        paragraphs: [
          'Le coeur de la facture concerne les détails financiers. Chaque ligne doit preciser la désignation précisé du produit ou service, la quantité, le prix unitaire hors taxes et le total HT par ligne. La facture doit indiquer le montant total hors taxes, le taux de TVA applicable et le montant de TVA, puis le montant total TTC.',
          'Le numéro de facture doit être unique et suivre une sequence chronologique continue. La date d\'émission de la facture est obligatoire, tout comme la date de la transaction si elle est différente. Pour les prestations de services, la date d\'achevement des travaux peut également être requise.',
          'Si vous offrez un escompte pour paiement anticip ou appliquéz des pénalités de retard, ces conditions doivent être mentionnees. Les pénalités de retard sont calculées sur la base du taux directeur de la BCE major de 10 points. L\'indemnite forfaitaire pour frais de recouvrement (40 euros) doit aussi figurer.',
        ],
      },
      {
        title: 'Cas spécifiques : TVA, auto-entrepreneurs et ventes à distance',
        paragraphs: [
          'Les auto-entrepreneurs en franchise de TVA doivent obligatoirement inscrire la mention "TVA non applicable, article 293 B du CGI" sur chaque facture. Cette mention informé le client qu\'aucune TVA n\'est facturée et que l\'auto-entrepreneur ne peut pas la deduire.',
          'Pour les ventes à distance intra-communautaires, des mentions spécifiques s\'appliquént, notamment l\'indication du numéro de TVA du client et les références au régime applicable. Les factures en devises étrangérés doivent preciser le taux de conversion utilisé. Pour savoir comment facturer selon votre statut, consultez notre [guide par statut juridique](https://factu.me/comment-facturer).',
          'En cas d\'erreur sur une facture émise, ne la detruisez jamais. Em evez une facture d\'avoir (ou note de credit) pour annulér la facture initiale, puis emettez une nouvelle facture correcte. Cette procedure garantit la traçabilité exigée par l\'administration fiscale.',
        ],
      },
    ],
  },
  {
    slug: 'facture-sans-tva-auto-entrepreneur',
    title: 'Comment faire une facture sans TVA quand on est auto-entrepreneur',
    description: 'Guide pratique pour créer une facture sans TVA en tant qu\'auto-entrepreneur. Mentions obligatoires, seuils a respecter et modèles a telecharger.',
    date: '2025-02-20',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Pratique',
    image: '/blog/facture-sans-tva.jpg',
    content: [
      {
        title: 'La franchise de TVA : principe et conditions',
        paragraphs: [
          'En tant qu\'auto-entrepreneur, vous bénéficiez du régime de la franchise de base de TVA tant que votre chiffre d\'affaires annuel ne dépassé pas les seuils legaux. Cela signifie que vous ne facturez pas la TVA à vos clients, vous ne la collectez pas et vous ne la reversez pas a l\'Etat.',
          'En 2025, les seuils de franchise de TVA sont de 37 500 euros pour les prestations de services et 85 000 euros pour les activités de vente de marchandises et de fourniture de logement. Ces seuils s\'apprecient sur l\'année civile et sont majorables en cas de debut d\'activité en cours d\'annee.',
          'Attention : être en franchise de TVA signifie aussi que vous ne pouvez pas deduire la TVA sur vos achats professionnels. C\'est un choix strategique a évaluér en fonction de votre activité et de vos investissements.',
        ],
      },
      {
        title: 'La mention obligatoire "TVA non applicable"',
        paragraphs: [
          'La mention "TVA non applicable, article 293 B du CGI" est absolument obligatoire sur chaque facture que vous emettez en tant qu\'auto-entrepreneur en franchise de TVA. Cette mention se place généralement dans le pied de facture, a cote des autres mentions légales.',
          'Sans cette mention, votre facture est irrégulière. Votre client professionnel pourrait la refuser, ce qui retarderait votre paiement. En cas de contrôle fiscal, l\'absence repetitive de cette mention peut être sanctionnée. Elle informé votre client qu\'il ne pourra pas deduire de TVA sur cette facture.',
          'Certains auto-entrepreneurs ajoutent également la mention "Dispense d\'immatriculation au registre du commerce et des societes (RCS) et au repertoire des metiers (RM)" lorsqu\'ils exercent une activité artisanale à titre complementaire. Cette mention n\'est pas obligatoire mais peut être utile.',
        ],
      },
      {
        title: 'Structure d\'une facture sans TVA',
        paragraphs: [
          'Votre facture sans TVA suit la même structure qu\'une facture classique, a quelques differences pres. L\'en-tête comporte vos informations (nom, adresse, SIRET, mention auto-entrepreneur). Le corps détaillé les prestations avec les prix unitaires et quantités. Les totaux sont affiches en HT uniquement.',
          'Dans la section financière, vous n\'affichez pas de colonne TVA. Les montants sont directement en hors taxes et le total facture correspond au total HT. C\'est une simplification appreciable par rapport aux factures avec TVA. Créez votre [facture d\'auto-entrepreneur](https://factu.me/comment-facturer/auto-entrepreneur) avec les mentions pré-remplies.',
          'Le pied de facture contient les mentions légales (conditions de paiement, pénalités de retard, indemnite forfaitaire de recouvrement de 40 euros, et surtout la mention "TVA non applicable, article 293 B du CGI").',
        ],
      },
      {
        title: 'Que se passe-t-il si vous dépassez les seuils',
        paragraphs: [
          'Si votre chiffre d\'affaires dépassé les seuils de franchise de TVA pendant deux années consécutives, vous basculez dans le régime réel d\'imposition. Vous devrez alors facturer la TVA, la collecter et la reverser trimestriellement ou mensuellement.',
          'La transition peut être progressive : si vous dépassez le seuil pour la première fois, vous restez en franchise pendant l\'année en cours. C\'est seulement au deuxième dépassement consecutif que le changement de régime s\'appliqué. Celà vous laisse le temps de vous organiser.',
          'Pour éviter les mauvaises surprises, suivez votre chiffre d\'affaires en temps réel. Un logiciel comme Factu.me affiche votre CA cumule et vous alerte quand vous approchez des seuils. Vous pouvez ainsi anticiper la transition et ajuster votre tarification si nécessaire.',
        ],
      },
      {
        title: 'Facture sans TVA et clients professionnels',
        paragraphs: [
          'Un point important a comprendre : quand vous etes en franchise de TVA, votre client professionnel ne peut pas deduire de TVA sur votre facture. Pour lui, votre prestation coute donc plus cher qu\'un prestataire assujetti à la TVA, puisque ce dernier facture avec TVA deductible.',
          'C\'est un argument commercial a prendre en compte dans votre tarification. Certains auto-entrepreneurs choisissent d\'opter pour le paiement de la TVA pour être plus compétitifs auprès de clients professionnels B2B, même si leur CA est sous les seuils.',
          'Pour les clients particuliers, la question ne se pose pas : le prix TTC est le seul qui les interesse. La franchise de TVA est donc un avantage réel pour les activités tournees vers les consommateurs finaux, puisque vos prix sont directement compétitifs.',
        ],
      },
    ],
  },
  {
    slug: 'devis-facture-difference',
    title: 'Devis vs Facture : quelles differences et quand les utiliser ?',
    description: 'Comprendre la difference entre devis et facture, quand envoyer un devis, quand émettre une facture, et comment gérér le passage de l\'un a l\'autre.',
    date: '2025-01-28',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Guide',
    image: '/blog/devis-facture-difference.jpg',
    content: [
      {
        title: 'Qu\'est-ce qu\'un devis ?',
        paragraphs: [
          'Le devis est un document commercial qui décrit les prestations ou produits que vous proposez à votre client, avec leur prix estime. Il constitue une offre commerciale : il engage le prestataire sur les prix et les conditions indiques, mais n\'engage pas le client tant qu\'il ne l\'a pas accepte.',
          'Un devis bien rédigé doit contenir les mêmes informations qu\'une facture (identités des parties, description détaillée des prestations, prix, conditions) mais se distingue par son caractère provisoire. Il mentionne une date de validité apres laquelle les prix peuvent être réactualisés.',
          'Le devis est un outil commercial essentiel : il permet au client de comparer les offres, de budgetiser son projet et de se decider en connaissance de cause. Pour le prestataire, c\'est aussi un moyen de se proteger en fixant clairement le perimêtre de la mission et les conditions tarifaires.',
        ],
      },
      {
        title: 'Qu\'est-ce qu\'une facture ?',
        paragraphs: [
          'La facture est un document comptable et juridique obligatoire qui atteste d\'une transaction commerciale. Contrairement au devis, elle est def initive et demande le paiement. Une fois émise, elle créé une creance que le client doit régler selon les conditions de paiement indiquées.',
          'La facture doit respecter un format strict et contenir toutes les mentions légales obligatoires. Elle doit être émise des la réalisation de la prestation ou la livraison du bien. Son émission ne peut pas être différée au-delà des délais legaux.',
          'Contrairement au devis, la facture à une valeur juridique forte devant les tribunaux. En cas d\'impaye, c\'est le document principal sur lequel vous vous appuyez pour engager une procedure de recouvrement.',
        ],
      },
      {
        title: 'Les differences cles entre devis et facture',
        paragraphs: [
          'La première difference est le caractère engageant : le devis est une proposition (le client peut refuser), la facture est une obligation de payer (le client doit régler). Le devis est optionnel mais recommande, la facture est obligatoire pour toute transaction.',
          'La numérotation est aussi différente. Les devis suivent leur propre sequence (DEV-001, DEV-002...) et les factures là leur (FAC-001, FAC-002...). Les deux sequences doivent être continues et sans trou, mais elles sont indépendantes l\'une de l\'autre.',
          'Enfin, la facture doit contenir des mentions supplementaires que le devis n\'exigé pas obligatoirement : numéro de TVA intracommunautaire, mention "TVA non applicable" pour les auto-entrepreneurs, conditions d\'escompte et pénalités de retard, indemnite forfaitaire de recouvrement.',
        ],
      },
      {
        title: 'Comment passer du devis à la facture',
        paragraphs: [
          'Le flux ideal est : envoi du devis, acceptation par le client (signature ou accord écrit), réalisation de la prestation, émission de la facture. Certaines situations permettent d\'émettre des factures d\'acompte intermediaires si le devis prevoit des paiements échelonnés.',
          'Avec Factu.me, vous pouvez transformer un devis accept en facture en un seul clic. Les informations du devis (client, prestations, prix) sont automatiquement reportées dans la facture, avec la bonne numérotation et les mentions légales. Cela évité les erreurs de saisie et fait gagner un temps precieux.',
          'Bon à savoir : si le client accepté votre devis sans modification, la facture doit reproduire exactement les mêmes prestations et prix. Si le perimêtre a évolué, creez un nouveau devis ou un avenant avant de facturer. La transparence est la cle de bonnes relations commerciales.',
        ],
      },
      {
        title: 'Bonnes pratiques pour gérér devis et factures',
        paragraphs: [
          'Etablissez toujours un devis avant toute prestation, même pour un client regulier. Le devis fixé les attentes et protégé les deux parties. Conservez une trace de l\'acceptation du devis (email, signature, bon de commande) pour éviter tout litige ulterieur.',
          'Relancez vos devis sans réponse : un client qui ne répond pas n\'est pas forcement un client desinteresse. Un rappel poli apres 7 jours montre votre professionnalisme et peut accélérer la décision. Factu.me propose un suivi des devis avec relances automatisées.',
          'Enfin, archivez methodiquement vos devis et factures. La loi exigé une conservation de 10 ans. Un logiciel de facturation en ligne vous libéré de cette contrainte en stockant automatiquement tous vos documents de manière sécurisée et accessible.',
        ],
      },
    ],
  },
  {
    slug: 'relance-facture-impayee',
    title: 'Comment relancer une facture impayée : methodes et modeles',
    description: 'Découvrez les étapes pour relancer efficacement une facture impayée : relance amiable, mise en demeure, procedure judiciaire et conseils pour accélérer les paiements.',
    date: '2025-03-15',
    author: 'Équipe Factu.me',
    readTime: '7 min',
    category: 'Gestion',
    image: '/blog/relance-facture-impayee.jpg',
    content: [
      {
        title: 'Les délais de paiement legaux en France',
        paragraphs: [
          'En France, le délai de paiement legal entre deux professionnels est de 30 jours à compter de la reception de la facture ou de la livraison des marchandises. Ce délai peut être porte à 60 jours maximum par accord entre les parties. Au-dela, la facture est considérée comme impayée et des pénalités de retard s\'appliquént automatiquement.',
          'Pour les transactions avec un particulier, le délai est généralement fixé par vos conditions générales de vente. En l\'absence de dispositions spécifiques, le délai de 30 jours s\'appliqué par défaut. Il est important de toujours preciser la date d\'échéance sur chaque facture.',
          'Les retards de paiement sont un problème majeur pour les TPE et auto-entrepreneurs : en moyenne, une facture sur trois est payée en retard en France. Ce retard impacte votre trésorerie et peut mettre en péril votre activité. D\'ou l\'importance d\'un suivi rigoureux et de relances adaptées.',
        ],
      },
      {
        title: 'Première étape : la relance amiable',
        paragraphs: [
          'Des le lendemain de la date d\'échéance, vous pouvez envoyer une première relance amiable. Il s\'agit d\'un rappel courtois par email ou par telephone, qui part du principe que l\'oubli est involontaire. La plupart des impayés sont effectivement dus à un simple oubli ou à une desorganisation administrative du client.',
          'Votre premier email de relance doit être poli mais clair. Rappelez le numéro de facture, le montant du, la date d\'échéance dépassée et les coordonnées bancaires pour le paiement. Proposez votre disponibilité en cas de question ou de difficulte. Ce premier contact resout environ 60% des impayes.',
          'Avec Factu.me, les relances amiables sont automatisées : le logiciel detecte les factures impayees et envoie des emails de rappel selon un calendrier predéfini. Vous gagnez du temps tout en assurant un suivi régulier de vos creances.',
        ],
      },
      {
        title: 'Deuxième étape : la relance ferme',
        paragraphs: [
          'Si la première relance reste sans réponse apres 7 à 10 jours, passez à une relance plus ferme. Cet email ou courrier rappelle les penalties de retard applicables et l\'indemnite forfaitaire de recouvrement de 40 euros. Le ton est plus direct mais reste professionnel.',
          'Mentionnez explicitement les consequences d\'un non-paiement prolonge : majoration d\'interets, frais de recouvrement supplementaires, voire procedure judiciaire. L\'objectif est de créer un sentiment d\'urgence sans agressivite. Joignez une copie de la facture originale à votre relance.',
          'A ce stade, un appel telephonique peut être tres efficace. Il permet de comprendre la raison du retard (difficulte financière, litige sur la prestation, erreur administrative) et de trouver une solution adaptée : échéancier de paiement, facture d\'acompte, negociation.',
        ],
      },
      {
        title: 'Troisième étape : la mise en demeure',
        paragraphs: [
          'Si les relances precedentes n\'ont pas abouti dans un délai de 15 à 30 jours apres l\'échéance, vous pouvez adresser une mise en demeure. C\'est un courrier formel envoye en recommande avec accuse de reception qui sommne le debiteur de payer sous un délai precis (généralement 8 à 15 jours).',
          'La mise en demeure n\'est pas une assignation devant le tribunal, mais elle à une valeur juridique importante. Elle marque le debut formel du litige et fait courir les intérêts moratoires. Elle est souvent suffisanté pour convaincre un retardataire chronique de régler sa dette.',
          'Vous pouvez rédiger la mise en demeure vous-même ou faire appel à un avocat pour plus d\'impact. Un courrier sur le papier a en-tête d\'un cabinet d\'avocat à un effet dissuasif considerable et coute généralement moins de 100 euros.',
        ],
      },
      {
        title: 'En dernier recours : la procedure judiciaire',
        paragraphs: [
          'Si la mise en demeure reste sans effet, vous disposez de plusieurs recours judiciaires. Pour les creances inferieures à 5 000 euros, la procedure simplifiée de recouvrement (injonction de payer) est rapide et peu couteuse. Le juge rend une ordonnance sans debat contradictoire, sur la base des documents que vous fournissez.',
          'Pour les creances superieures à 5 000 euros, la procedure d\'injonction de payer reste possible mais peut être contestee par le debiteur, ce qui entraine une audience. L\'aide d\'un avocat est alors recommandee. Les frais de procedure sont à la charge du debiteur en cas de condamnation.',
          'Pour éviter d\'en arriver la, la prevention est la meilleure strategie : vérifiez la solvabilite de vos clients, demandez des acomptes sur les gros projets, fixez des conditions de paiement claires et relancez rapidement. Factu.me vous accompagne dans chacune de ces étapes.',
        ],
      },
      {
        title: 'Conseils pour accélérer vos paiements',
        paragraphs: [
          'Proposez plusieurs moyens de paiement : virement, carte bancaire, lien de paiement en ligne. Plus c\'est facile de payer, plus c\'est rapide. Factu.me integre des liens de paiement Stripe et SumUp pour que vos clients puissent régler directement depuis la facture.',
          'Offrez un escompte pour paiement anticip (par exemple 2% de rémise pour paiement sous 10 jours). Cette incitation financière motive les clients a payer plus vite et améliore votre tresorerie. Mentionnez cette possibilité sur chaque facture.',
          'Enfin, automatiséz vos relances. Un système de relance programmé qui envoie des rappels a J+1, J+7, J+15 et J+30 apres l\'échéance est bien plus efficace qu\'une gestion manuelle irrégulière. Factu.me propose cette automatisation en standard, vous permettant de vous concentrer sur votre coeur de metier.',
        ],
      },
    ],
  },
  {
    slug: 'logiciel-facturation-choisir',
    title: 'Comment choisir son logiciel de facturation en 2025',
    description: 'Comparez les criteres essentiels pour choisir le meilleur logiciel de facturation : fonctionnalites, prix, conformité, sécurité et accompagnement.',
    date: '2025-02-05',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Outils',
    image: '/blog/logiciel-facturation.jpg',
    content: [
      {
        title: 'Pourquoi utiliser un logiciel de facturation',
        paragraphs: [
          'Si vous etes encore sur Excel ou Word pour vos factures, il est temps de passer à un logiciel dedie. Un logiciel de facturation automatisé les taches repetitives, garantit la conformité légale, facilité le suivi des paiements et vous fait gagner un temps considerable.',
          'En 2025, avec l\'arrivee de la facture électronique obligatoire, un logiciel conforme devient indispensable. Les factures créées manuellement sur tableur ne repondront pas aux exigences de format et de transmission de la reforme. Un logiciel certifié vous met a l\'abri de ce risque.',
          'Outre la conformité, un bon logiciel de facturation vous offre une vision claire de votre activité : chiffre d\'affaires en temps réel, factures impayees, échéances a venir, rapports mensuels. C\'est un outil de pilotage indispensable pour tout entrepreneur.',
        ],
      },
      {
        title: 'Les criteres essentiels pour bien choisir',
        paragraphs: [
          'Le premier critere est la conformité à la réglementation française. Votre logiciel doit générer des factures contenant toutes les mentions obligatoires, supporter les formats Factur-X et UBL (pour la facture électronique 2026) et garantir l\'inalterabilite des données.',
          'Le deuxième critere est la facilité d\'utilisation. Un logiciel trop complexe ne sera pas utilisé correctement. Recherchez une interface intuitive, une création de facture en quelques clics, des modèles préconfigurés et une application mobile pour facturer en déplacement.',
          'Le troisième critere est l\'évolution du logiciel. Vérifiez que l\'editeur investit dans le développement de nouvelles fonctionnalites, suit les évolutions réglementaires et offre un support reactif. Un logiciel qui n\'évolué pas sera rapidement dépassé.',
        ],
      },
      {
        title: 'Fonctionnalites incontournables en 2025',
        paragraphs: [
          'Un bon logiciel de facturation doit proposer : création de factures et devis, gestion des clients, suivi des paiements, relances automatisées, export PDF, tableaux de bord, et generation de factures d\'avoir. Ce sont les fonctions de base que tout logiciel digne de ce nom doit offrir.',
          'Les fonctionnalites avancées font la difference : facturation vocale assistee par IA (permettant de dicter une facture), signature électronique des devis, liens de paiement en ligne (Stripe, SumUp), gestion multi-devises, application mobile hors-ligne, et intégration avec votre comptable.',
          'La sécurité des données est également cruciale. Votre logiciel doit proposer un hebergement securise en France (conformité RGPD), des sauvegardes automatiques, une authentification à double facteur et un chiffrement des données sensibles. N\'hesitez pas a vérifier les certifications de l\'editeur.',
        ],
      },
      {
        title: 'Comparaison des tarifs et modeles',
        paragraphs: [
          'Les logiciels de facturation proposent différents modèles tarifaires : gratuit avec fonctionnalites limitées, abonnement mensuel avec plus ou moins de fonctionnalites, ou freemium (gratuit jusqu\'à un certain nombre de factures). Le choix dépend de votre volume d\'activité et de vos besoins.',
          'Attention au prix cache : un logiciel gratuit peut devenir payant quand vous dépassez un quota de factures ou quand vous avez besoin d\'une fonctionnalite spécifique (relances, paiement en ligne, export comptable). Lisez attentivement les conditions avant de vous engager.',
          'Factu.me propose un modèle transparent avec un essai gratuit de 4 jours, sans engagement et sans carte bancaire. Vous pouvez tester toutes les fonctionnalites avant de vous decider. L\'abonnement inclut les mises à jour réglementaires, le support et le stockage illimité de vos documents.',
        ],
      },
      {
        title: 'Notre conseil : testez avant de vous engager',
        paragraphs: [
          'Ne vous engagez jamais sans avoir teste le logiciel. Creez quelques factures, ajoutez des clients, testez les relances, exportez un rapport. C\'est le meilleur moyen de vérifier que l\'outil correspond à vos habitudes de travail et à votre activité.',
          'Vérifiez également la qualité du support client. Un problème de facturation peut bloquer votre trésorerie : vous devez pouvoir joindre quelqu\'un rapidement. Testez la reactivité du support avant de souscrire en posant une question technique.',
          'Enfin, assurez-vous que vous pouvez recuperer vos données si vous decidez de changer de logiciel. L\'export de vos factures, clients et écritures comptables doit être possible en quelques clics. La portabilite des données est un droit garanti par le RGPD.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-freelance-conseils',
    title: '10 conseils pour bien gérér sa facturation quand on est freelance',
    description: 'Découvrez les 10 conseils indispensables pour optimiser votre facturation freelance : organisation, délais, relances, prix et outils pour être paye plus vite.',
    date: '2025-01-20',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Conseils',
    image: '/blog/facturation-freelance.jpg',
    content: [
      {
        title: 'Conseil 1 : Facturez immediatement apres la prestation',
        paragraphs: [
          'La règle d\'or de la facturation freelance : n\'attendez pas pour envoyer votre facture. Plus le délai entre la fin de la prestation et l\'émission de la facture est court, plus vous serez paye rapidement. Les freelances qui facturent le jour même sont payés en moyenne 15 jours plus vite que ceux qui attendent la fin du mois.',
          'Programmez un rappel dans votre agenda pour émettre vos factures au plus tard le lendemain de la fin de chaque mission. Avec un outil comme Factu.me, vous pouvez créer une facture en moins de 2 minutes depuis votre ordinateur ou votre smartphone.',
        ],
      },
      {
        title: 'Conseil 2 et 3 : Soyez clair et fixez des conditions de paiement',
        paragraphs: [
          'Conseil 2 : redigez des factures claires et détaillées. Chaque ligne doit decrire precisement la prestation réalisée, la periode concernee et le taux horaire ou le forfait appliqué. Plus votre facture est precise, moins elle sera contestee et plus elle sera traitee rapidement par le service comptable de votre client.',
          'Conseil 3 : affichez clairement vos conditions de paiement sur chaque facture. Indiquez la date d\'échéance (par exemple "Paiement a reception" ou "Paiement à 30 jours"), les penalties de retard (taux directeur BCE + 10 points) et l\'indemnite forfaitaire de recouvrement de 40 euros. Ces mentions sont obligatoires et dissuasives.',
        ],
      },
      {
        title: 'Conseil 4 et 5 : Relancez sans complexe et suivez vos échéances',
        paragraphs: [
          'Conseil 4 : relancez systematiquement et sans culpabilite. Un retard de paiement n\'est pas une attaque personnelle, c\'est un problème administratif courant. Relancez des le lendemain de l\'échéance par email, puis par telephone si nécessaire. La plupart des impayés se reglent apres une simple relance.',
          'Conseil 5 : utilisez un tableau de suivi pour visualiser toutes vos factures en cours. Date d\'émission, montant, échéance, statut (envoyee, payee, en retard). Cette vue d\'ensemble vous permet d\'identifier rapidement les factures a relancer et d\'anticiper votre tresorerie. Factu.me offre ce tableau de bord en temps réel.',
        ],
      },
      {
        title: 'Conseil 6 et 7 : Demandez des acomptes et diversifiez vos paiements',
        paragraphs: [
          'Conseil 6 : pour les missions importantes (plus de 3 000 euros), demandez toujours un acompte à la signature du devis, généralement 30% à 50% du montant total. Cet acompte securise votre engagement et couvre vos frais en cas d\'annulation ou de retard de paiement final.',
          'Conseil 7 : facilitez le paiement en proposant plusieurs methodes. Le virement bancaire est standard, mais proposer un paiement par carte bancaire via un lien de paiement en ligne accéléré considerablement les règlements. Factu.me integre Stripe et SumUp pour offrir cette possibilité à vos clients.',
        ],
      },
      {
        title: 'Conseil 8 et 9 : Numerotez correctement et automatiséz',
        paragraphs: [
          'Conseil 8 : adoptez une numérotation stricte et cohérente. Format recommande : FAC-2025-001, FAC-2025-002, etc. Ne sautez jamais un numéro et ne reutilisez jamais un numéro annulé. Cette rigueur est exigée par l\'administration fiscale et facilité vos contrôles comptables.',
          'Conseil 9 : automatiséz au maximum. Configuration de vos clients recurrents, modèles de factures pre-remplis, relances programmees, exports comptables. Chaque minute gagnee sur la gestion administrative est une minute investie dans votre activité. Un logiciel comme Factu.me automatisé l\'essentiel de ces taches.',
        ],
      },
      {
        title: 'Conseil 10 : Choisissez le bon outil et formez-vous',
        paragraphs: [
          'Conseil 10 : investissez dans un logiciel de facturation adapte à votre activité freelance. Le bon outil vous fait gagner des heures chaque mois, réduit les erreurs, assure la conformité légale et vous donne une image professionnelle auprès de vos clients.',
          'Factu.me est conçu par et pour des freelances français. Il combine simplicite d\'utilisation, conformité réglementaire et fonctionnalites avancées comme la facturation vocale IA, les liens de paiement, les relances automatiques et l\'export Factur-X. Testez-le gratuitement pendant 4 jours et jugez par vous-même.',
          'En bonus : formez-vous régulièrement aux évolutions réglementaires. La facture électronique arrive en 2026, les seuils de TVA changent, les obligations évoluént. Un bon logiciel vous tient informé, mais une veille personnelle est toujours bénéfique. Le blog Factu.me est là pour vous accompagner dans cette démarche. [Comparez les logiciels](https://factu.me/meilleur-logiciel-facture) ou découvrez notre [alternative à Henrri](https://factu.me/alternative-henrj) et [Tiime](https://factu.me/alternative-tiime). Voir nos [guides par statut juridique](https://factu.me/comment-facturer) et [modèles de facture par métier](https://factu.me/modeles-facture).',
        ],
      },
    ],
  },
  {
    slug: 'facturation-btp-artisan-guide',
    title: 'Facturation BTP : le guide complet pour artisans et entreprises du batiment',
    description: 'Tout savoir sur la facturation dans le BTP : mentions obligatoires, autoliquidation de TVA, factures d\'acompte, retenue de garantie et outils adaptés aux artisans.',
    date: '2025-03-20',
    author: 'Équipe Factu.me',
    readTime: '8 min',
    category: 'Guide',
    image: '/blog/facturation-btp.jpg',
    content: [
      {
        title: 'Spécificités de la facturation dans le BTP',
        paragraphs: [
          'La facturation dans le secteur du BTP (batiment et travaux publics) obéit a des règles particulières qui la distinguent de la facturation classique. Artisans plombiers, électriciens, macons, peintres ou couvreurs doivent respecter des obligations spécifiques liées a l\'autoliquidation de la TVA, aux situations de travaux et a la retenue de garantie.',
          'Si vous êtes artisan du batiment, chaque facture doit mentionner votre numéro SIRET, votre qualification (Qualibat, RGE, etc.), et les mentions légales spécifiques au BTP. La moindre erreur peut entraîner un refus de paiement du client ou des sanctions fiscales.',
          'Heureusement, des outils comme Factu.me simplifient la facturation BTP en automatisant les mentions légales, en gérant l\'autoliquidation de TVA et en permettant de créer des factures directement sur chantier depuis votre smartphone. Voir nos [modèles de facture pour artisans](https://factu.me/modeles-facture/plombier) et [guide facturation BTP](https://factu.me/facturation-btp).',
        ],
      },
      {
        title: 'L\'autoliquidation de TVA dans le BTP',
        paragraphs: [
          'Depuis 2014, le mécanisme d\'autoliquidation de la TVA s\'applique aux travaux immobiliers réalisés pour un assujetti à la TVA. Concrètement, c\'est le client (entreprise) qui déclare et paie la TVA, et non le prestataire. Votre facture doit donc afficher "Autoliquidation de la TVA, article 283, 2 nonies du CGI" et le montant HT uniquement.',
          'Ce mécanisme concerne les travaux de construction, rénovation, aménagement et entretien réalisés sur des immeubles en France. Il ne s\'applique pas aux travaux pour des particuliers (où vous facturez la TVA normalement) ni aux travaux neufs (soumis au taux réduit de TVA).',
          'Attention : l\'autoliquidation ne dispense pas de facturer la TVA sur les fournitures et matériaux que vous achetez et revendez. Seule la main-d\'oeuvre et les prestations de services sont concernées. Factu.me calcule automatiquement la TVA selon le type de client et de prestation.',
        ],
      },
      {
        title: 'Factures d\'acompte et situations de travaux',
        paragraphs: [
          'Dans le BTP, les projets durent souvent plusieurs mois. Vous pouvez émettre des factures d\'acompte ou des situations de travaux pour obtenir des règlements intermédiaires. Chaque situation correspond a un pourcentage d\'avancement des travaux et doit être détaillée.',
          'La facture d\'acompte est émise avant le début des travaux (généralement 30% à la commande). Les situations de travaux sont émises régulièrement (mensuelles ou selon les jalons du devis) pour refléter l\'avancement réel. La facture finale solde le compte en déduisant les acomptes et situations déjà versés.',
          'Factu.me permet de gérer facilement ces facturations échelonnées : transformez votre devis en situations de travaux, suivez les acomptes versés et générez la facture de solde automatiquement. Plus besoin de calculs manuels sur Excel.',
        ],
      },
      {
        title: 'Retenue de garantie et décennale',
        paragraphs: [
          'La retenue de garantie (ou caution) est une somme que le client peut retenir sur le paiement final, généralement 5% du montant total des travaux. Elle est levée a la réception définitive des travaux, un an après la réception provisoire. Votre facture doit mentionner la retenue de garantie si elle est prévue au contrat.',
          'L\'assurance décennale est obligatoire pour tous les constructeurs et artisans du BTP. Son numéro doit figurer sur vos devis et factures. En cas de vice caché ou de malfaçon dans les 10 ans suivant la réception, cette assurance couvre les réparations.',
          'Factu.me intègre un champ dédié au numéro d\'assurance décennale dans vos documents, garantissant la conformité de vos devis et factures avec les obligations légales du secteur.',
        ],
      },
      {
        title: 'Les outils de facturation adaptés au BTP',
        paragraphs: [
          'Les artisans du BTP ont des besoins spécifiques : facturation sur chantier, gestion des acomptes, autoliquidation, suivi des matériaux. Un logiciel de facturation généraliste ne suffit pas toujours. Il vous faut un outil qui comprend les particularités du secteur.',
          'Factu.me est parfaitement adapté aux artisans du batiment. La facturation vocale vous permet de dicter votre facture depuis le chantier (les mains dans le plâtre, pas le temps de taper). Les modèles pré-configurés gèrent l\'autoliquidation, la retenue de garantie et les situations de travaux.',
          'En plus, Factu.me propose un CRM pour suivre vos prospects BTP, des relances automatiques pour les impayés (fréquents dans le batiment) et l\'export FEC pour votre comptable. Le plan Pro à 14,99€/mois inclut toutes ces fonctionnalités BTP.',
        ],
      },
    ],
  },
  {
    slug: 'devis-btp-bonnes-pratiques',
    title: 'Créer un devis BTP professionnel : guide et bonnes pratiques',
    description: 'Apprenez a rédiger un devis BTP conforme et professionnel : mentions obligatoires, calcul des prix, détail des travaux et conseils pour améliorer votre taux d\'acceptation.',
    date: '2025-04-02',
    author: 'Équipe Factu.me',
    readTime: '7 min',
    category: 'Guide',
    image: '/blog/devis-btp.jpg',
    content: [
      {
        title: 'Pourquoi le devis BTP est crucial',
        paragraphs: [
          'Dans le secteur du BTP, le devis est le document fondateur de toute relation commerciale. Il engage les deux parties : vous sur les prix et les prestations, le client sur l\'acceptation du projet. Un devis mal rédigé est la première source de litiges dans le batiment.',
          'Contrairement a d\'autres secteurs, le devis BTP doit être extrêmement détaillé : description des travaux, matériaux utilisés, main-d\'oeuvre, durée estimée, conditions de paiement et garanties. Plus votre devis est précis, moins vous risquez de conflits en cours de chantier.',
          'En France, le devis est obligatoire pour tous les travaux de rénovation d\'un montant supérieur a 150 euros TTC. Pour les travaux soumis a l\'autoliquidation, il doit comporter la mention correspondante.',
        ],
      },
      {
        title: 'Les mentions obligatoires du devis BTP',
        paragraphs: [
          'Un devis BTP doit contenir : votre nom/dénomination sociale, adresse, SIRET, numéro RCS ou RM, numéro d\'assurance décennale et coordonnées de l\'assureur. Côté client : nom, adresse, et si professionnel, SIRET et numéro de TVA.',
          'Le corps du devis détaille chaque poste de travaux avec description, quantité, unité, prix unitaire HT et total HT par poste. Les matériaux et la main-d\'oeuvre sont séparés. Le total HT, le taux et montant de TVA, et le total TTC figurent en bas.',
          'Pour les devis avec autoliquidation, indiquez "Autoliquidation de la TVA" et ne facturez pas la TVA sur la main-d\'oeuvre. Factu.me génère automatiquement devis BTP conformes avec toutes les mentions légales.',
        ],
      },
      {
        title: 'Comment calculer ses prix dans un devis BTP',
        paragraphs: [
          'Le calcul des prix dans le BTP repose sur trois composantes : le coût des matériaux, le coût de la main-d\'oeuvre et la marge bénéficiaire. Les matériaux sont facturés au prix d\'achat majoré de 15 a 30%. La main-d\'oeuvre est calculée au taux horaire ou au forfait.',
          'N\'oubliez pas d\'inclure les frais annexes : location de matériel, échafaudage, évacuation des gravats, frais de déplacement. Ces coûts sont souvent sous-estimés et grignotent votre marge. Intégrez-les systématiquement dans votre devis.',
          'Prévoyez une provision pour imprévus (5 a 10% du montant total) surtout pour les travaux de rénovation où les mauvaises surprises sont fréquentes (découverte de murs porteurs, canalisations vétustes, etc.). Cette provision rassure le client et vous protège.',
        ],
      },
      {
        title: 'Conseils pour améliorer votre taux d\'acceptation',
        paragraphs: [
          'Un devis professionnel et clair est votre meilleur atout commercial. Présentez-le avec une mise en page soignée, des descriptions précises et des photos si possible. Un devis esthétique inspire confiance et crédibilité.',
          'Proposez des options : un devis de base et des variantes avec des matériaux différents ou des prestations supplémentaires. Le client se sent acteur de son projet et peut ajuster le budget. C\'est un puissant levier de vente.',
          'Factu.me vous aide a créer des devis BTD professionnels en quelques minutes. Choisissez votre client, ajoutez vos postes de travaux, et le logiciel calcule les totaux, applique la TVA et génère un PDF impeccable. Vous pouvez même le signer électroniquement avec votre client via la signature eIDAS intégrée.',
        ],
      },
    ],
  },
  {
    slug: 'ocr-recus-note-de-frais',
    title: 'OCR et notes de frais : comment automatiser la gestion de vos dépenses',
    description: 'Découvrez comment l\'OCR (reconnaissance optique) révolutionne la gestion des notes de frais et reçus. Gain de temps, réduction des erreurs et conformité fiscale.',
    date: '2025-04-10',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Outils',
    image: '/blog/ocr-recus.jpg',
    content: [
      {
        title: 'Qu\'est-ce que l\'OCR et pourquoi l\'utiliser',
        paragraphs: [
          'L\'OCR (Optical Character Recognition, ou reconnaissance optique de caractères) est une technologie qui permet d\'extraire automatiquement les informations d\'un document numérisé. Appliqué aux reçus et factures fournisseurs, l\'OCR identifie le montant, la date, le fournisseur, la TVA et la catégorie de dépense.',
          'Pour les freelances et auto-entrepreneurs, la gestion des reçus est une corvée chronophage. Triez, saisir, classer : cela peut prendre 2 a 3 heures par mois. L\'OCR réduit ce temps a quelques secondes par reçu. Il suffit de photographier le reçu avec votre smartphone.',
          'Au-dela du gain de temps, l\'OCR réduit les erreurs de saisie manuelle. Un chiffre transposé ou une date oubliée peut fausser votre comptabilité et poser problème en cas de contrôle fiscal. L\'OCR garantit une extraction fidèle et vérifiable.',
        ],
      },
      {
        title: 'Comment fonctionne l\'OCR sur Factu.me',
        paragraphs: [
          'Factu.me intègre un moteur OCR hybride (Tesseract + IA Gemini) pour analyser vos reçus et factures fournisseurs. Téléchargez une photo ou un PDF, et l\'IA extrait automatiquement : fournisseur, date, montant HT, TVA, TTC, catégorie comptable et code PCG.',
          'Le système apprend de vos habitudes : si vous classez régulièrement les reçus d\'un même fournisseur dans une catégorie, il le fera automatiquement la prochaine fois. Plus vous l\'utilisez, plus il est précis.',
          'L\'OCR Factu.me supporte les formats JPG, PNG, PDF, HEIC et WebP. Il gère les reçus multi-pages et détecte automatiquement les frontières entre plusieurs factures sur un même document. Le plan Business donne accès à l\'OCR illimité.',
        ],
      },
      {
        title: 'Les avantages pour votre comptabilité',
        paragraphs: [
          'L\'OCR transforme la gestion de vos dépenses en un processus fluide et fiable. Chaque reçu est numérisé, catégorisé et stocké de manière sécurisée. Vous disposez d\'une trace numérique inaltérable, exigée par l\'administration fiscale en cas de contrôle.',
          'L\'export FEC (Fichier des Écritures Comptables) est généré automatiquement a partir des dépenses saisies par OCR. Votre comptable reçoit un fichier structuré et conforme, sans avoir a ressaisir les données. Cela réduit les honoraires comptables.',
          'En fin d\'année, vos dépenses sont organisées par catégorie, par mois et par fournisseur. Vous connaissez exactement vos coûts réels et pouvez optimiser votre stratégie fiscale. L\'OCR est un véritable outil de pilotage.',
        ],
      },
      {
        title: 'OCR vs saisie manuelle : le comparatif',
        paragraphs: [
          'La saisie manuelle d\'un reçu prend en moyenne 2 minutes. Avec l\'OCR Factu.me, c\'est 10 secondes. Pour 50 reçus par mois, vous passez de 100 minutes a moins de 10 minutes. Sur un an, c\'est presque 20 heures économisées.',
          'Le taux d\'erreur de la saisie manuelle est estimé a 4-8% (chiffres transposés, catégories erronées). L\'OCR atteint un taux de précision supérieur a 95% sur les champs clés (montant, date, fournisseur). Vous gagnez en fiabilité comptable.',
          'Factu.me rend l\'OCR accessible a tous les budgets. Le plan Business à 39,99€/mois inclut l\'OCR illimité, soit bien moins cher que les solutions dédiées comme Dext (a partir de 24£/mois) avec en plus la facturation, le CRM et les contrats de travail.',
        ],
      },
    ],
  },
  {
    slug: 'contrat-cdi-en-ligne',
    title: 'Créer un contrat CDI en ligne : guide juridique et bonnes pratiques',
    description: 'Tout savoir sur la création d\'un contrat CDI en ligne : mentions obligatoires, clauses essentielles, signature électronique eIDAS et conformité au droit du travail français.',
    date: '2025-03-25',
    author: 'Équipe Factu.me',
    readTime: '8 min',
    category: 'Réglementation',
    image: '/blog/contrat-cdi.jpg',
    content: [
      {
        title: 'Le contrat CDI : obligations légales',
        paragraphs: [
          'Le contrat de travail a durée indéterminée (CDI) est la forme normale du contrat de travail en France. La loi n\'impose pas obligatoirement un écrit pour un CDI, mais il est fortement recommandé pour fixer les conditions d\'emploi et protéger l\'employeur comme le salarié.',
          'Depuis la loi El Khomri de 2016, la remise d\'une copie du contrat au salarié est obligatoire dans les 2 jours ouvrables suivant l\'embauche. En pratique, rédiger un contrat écrit et détaillé est devenu incontournable pour sécuriser la relation de travail.',
          'Factu.me permet de générer des contrats CDI conformes au droit du travail français en quelques clics. L\'IA vérifie les clauses obligatoires, les conventions collectives applicables et les droits du salarié.',
        ],
      },
      {
        title: 'Les mentions obligatoires du contrat CDI',
        paragraphs: [
          'Le contrat CDI doit contenir : l\'identité des parties (employeur et salarié), la date de début du contrat, la fonction et la qualification, la rémunération (salaire de base, primes, avantages), la durée du travail (heures, jours), le lieu de travail, la convention collective applicable et la période d\'essai.',
          'Sont également obligatoires : les modalités de congés payés, les conditions de rupture, le droit a la formation, les éventuelles clauses spécifiques (non-concurrence, mobilité, télétravail). Chaque clause doit être rédigée conformément au Code du travail et a la convention collective.',
          'Factu.me intègre les conventions collectives les plus courantes et pré-remplit les clauses obligatoires selon votre secteur d\'activité. L\'IA détecte les clauses manquantes ou non conformes et vous alerte avant la signature.',
        ],
      },
      {
        title: 'Signature électronique eIDAS du contrat',
        paragraphs: [
          'La signature électronique est légale en France depuis 2000 et le règlement européen eIDAS (n°910/2014) garantit sa validité dans toute l\'UE. La signature eIDAS niveau Avancé (AdES) offre la même valeur juridique qu\'une signature manuscrite.',
          'Factu.me intègre la signature électronique eIDAS gratuitement. Les contrats sont horodatés via RFC 3161 et vérifiables publiquement. L\'employé et l\'employeur signent a distance, sans impression ni envoi postal.',
          'Contrairement aux solutions de signature payantes (DocuSign, Universign), Factu.me inclut la signature eIDAS dans tous ses plans payants. C\'est un avantage considérable pour les TPE qui embauchent régulièrement.',
        ],
      },
      {
        title: 'Les clauses essentielles a ne pas oublier',
        paragraphs: [
          'La clause de non-concurrence est fréquente mais doit respecter 4 conditions : être limitée dans le temps et l\'espace, être justifiée par les intérêts de l\'entreprise, prévoir une contrepartie financière et être spécifique au salarié. Sans ces 4 conditions, elle est nulle.',
          'La clause de mobilité permet de modifier le lieu de travail du salarié. Elle doit définir une zone géographique précise et ne peut pas être trop large. La clause de confidentialité protège les informations sensibles de l\'entreprise.',
          'La clause de télétravail, devenue courante depuis 2020, doit préciser les conditions : jours de télétravail, équipement fourni, frais remboursés, droit a la déconnexion. Factu.me génère ces clauses automatiquement selon votre situation.',
        ],
      },
      {
        title: 'Contrats CDI, CDD, stage : les différences',
        paragraphs: [
          'Le CDI est le contrat par défaut, sans durée limite. Le CDD est utilisé pour des besoins temporaires (remplacement, surcroît d\'activité) et ne peut excéder 18 mois. Le contrat de stage est réservé aux étudiants et nécessite une convention tripartite.',
          'Chaque type de contrat a ses mentions obligatoires spécifiques. Le CDD doit mentionner le motif de recours et la date de fin. Le stage doit inclure les objectifs pédagogiques et la gratification minimale. Confondre ces mentions expose l\'employeur a des sanctions.',
          'Factu.me propose des modèles pour CDI, CDD, stage, alternance et freelance. Chaque modèle est pré-configuré avec les mentions légales et vérifié par l\'IA pour garantir la conformité. Vous n\'avez qu\'a remplir les informations spécifiques a votre situation.',
        ],
      },
    ],
  },
  {
    slug: 'rapprochement-bancaire-simplifie',
    title: 'Le rapprochement bancaire simplifié : guide pour TPE et auto-entrepreneurs',
    description: 'Comprendre le rapprochement bancaire, pourquoi il est essentiel et comment l\'automatiser pour gagner du temps et éviter les erreurs comptables.',
    date: '2025-04-15',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Comptabilité',
    image: '/blog/rapprochement-bancaire.jpg',
    content: [
      {
        title: 'Qu\'est-ce que le rapprochement bancaire',
        paragraphs: [
          'Le rapprochement bancaire consiste a comparer les écritures comptables de votre entreprise avec les mouvements réels sur votre compte bancaire. L\'objectif est de vérifier que chaque transaction enregistrée dans votre comptabilité correspond a une transaction bancaire réelle.',
          'C\'est un contrôle indispensable : il détecte les erreurs de saisie, les oublis, les prélèvements inconnus, les chèques non encaissés et les écarts éventuels. Sans rapprochement, votre comptabilité peut être fausse sans que vous le sachiez.',
          'En pratique, le rapprochement bancaire est souvent perçu comme une corvée par les TPE. Mais avec les bons outils, il devient un processus rapide et automatisé qui sécurise votre gestion financière.',
        ],
      },
      {
        title: 'Pourquoi le rapprochement est obligatoire',
        paragraphs: [
          'Le rapprochement bancaire n\'est pas strictement obligatoire pour les micro-entreprises, mais il est fortement recommandé. Pour les entreprises au régime réel, il fait partie des contrôles comptables de base. Il garantit la fiabilité de votre bilan et de votre compte de résultat.',
          'En cas de contrôle fiscal, un rapprochement bancaire régulier démontre la rigueur de votre gestion. A l\'inverse, l\'absence de rapprochement peut éveiller les soupçons de l\'administration fiscale et entraîner des vérifications approfondies.',
          'Pour les cabinets comptables, le rapprochement bancaire est une étape clé de la révision des comptes. Factu.me propose un module de rapprochement pour les cabinets qui gèrent plusieurs clients, centralisant les transactions de tous les comptes.',
        ],
      },
      {
        title: 'Comment automatiser le rapprochement bancaire',
        paragraphs: [
          'L\'automatisation du rapprochement passe par la connexion entre votre logiciel de facturation et votre compte bancaire. Les transactions sont importées automatiquement et comparées avec les écritures comptables. L\'IA propose des correspondances que vous validez en un clic.',
          'Factu.me permet d\'importer vos relevés bancaires et de les rapprocher automatiquement avec vos factures et dépenses. Les montants, dates et libellés sont comparés intelligemment pour proposer les bons appariements.',
          'Pour les cabinets comptables, le module de rapprochement centralise les transactions de tous les clients dans un tableau unique avec filtres par client, date, statut et recherche textuelle. Le gain de temps est considérable par rapport a un rapprochement manuel sur Excel.',
        ],
      },
      {
        title: 'Les erreurs courantes a éviter',
        paragraphs: [
          'La première erreur est de ne pas faire de rapprochement du tout. Sans cette vérification, des écarts peuvent s\'accumuler pendant des mois et devenir très difficiles a corriger. La règle : effectuez un rapprochement au minimum mensuel.',
          'La deuxième erreur est d\'ignorer les petits écarts. Un écart de quelques centimes peut sembler négligeable, mais il peut révéler une erreur de saisie, un arrondi mal géré ou une fraude. Chaque écart doit être expliqué et corrigé.',
          'Enfin, ne reportez pas le rapprochement. Plus vous attendez, plus les transactions s\'accumulent et plus il est difficile de retrouver les correspondances. Un rapprochement régulier (hebdomadaire ou mensuel) est bien plus rapide que trimestriel.',
        ],
      },
    ],
  },
  {
    slug: 'signature-electronique-eidas',
    title: 'Signature électronique eIDAS : guide complet pour les entreprises',
    description: 'Tout comprendre sur la signature électronique eIDAS : niveaux de sécurité, valeur juridique, mise en oeuvre et avantages pour les entreprises françaises.',
    date: '2025-02-28',
    author: 'Équipe Factu.me',
    readTime: '7 min',
    category: 'Réglementation',
    image: '/blog/signature-electronique.jpg',
    content: [
      {
        title: 'Qu\'est-ce que la signature électronique eIDAS',
        paragraphs: [
          'Le règlement eIDAS (Electronic IDentification, Authentication and Trust Services) est un texte européen adopté en 2014 qui encadre les services de confiance numériques, dont la signature électronique. Il garantit la reconnaissance mutuelle des signatures dans tous les pays de l\'UE.',
          'eIDAS définit trois niveaux de signature électronique : simple, avancée et qualifiée. La signature avancée (AdES) est liée au signataire de manière unique, permet d\'identifier le signataire, est créée par des moyens que le signataire peut garder sous son contrôle exclusif et est liée aux données auxquelles elle se rapporte.',
          'En France, la signature électronique avancée a la même valeur juridique qu\'une signature manuscrite depuis la loi du 13 mars 2000. Elle est recevable devant les tribunaux comme mode de preuve.',
        ],
      },
      {
        title: 'Les trois niveaux de signature',
        paragraphs: [
          'La signature électronique simple est la forme la plus basique : un clic sur "J\'accepte" ou un code PIN. Elle offre peu de garanties d\'identité et est principalement utilisée pour des accords commerciaux de faible risque.',
          'La signature électronique avancée (AdES) ajoute des garanties : identification unique du signataire, contrôle exclusif du processus de signature et intégrité du document. C\'est le niveau proposé par Factu.me, avec horodatage RFC 3161.',
          'La signature électronique qualifiée (QES) est le niveau le plus élevé. Elle nécessite un certificat qualifié délivré par un prestataire de services de confiance qualifié et une identification en personne. Elle équivaut a une signature manuscrite dans toute l\'UE.',
        ],
      },
      {
        title: 'Comment utiliser la signature électronique au quotidien',
        paragraphs: [
          'La signature électronique s\'applique a de nombreux documents : contrats de travail, devis, factures, accords de confidentialité, baux commerciaux. Tout document qui nécessite une signature peut être signé électroniquement, a quelques exceptions près (testament, mariage).',
          'Le processus est simple : vous téléchargez le document sur la plateforme, vous ajoutez les signataires, chacun reçoit un email avec un lien pour signer. Le document est horodaté, scellé et archivé. Aucune impression nécessaire.',
          'Avec Factu.me, la signature électronique est intégrée nativement. Envoyez un devis a votre client, il le signe en ligne depuis son ordinateur ou smartphone. Le contrat de travail est signé par l\'employeur et le salarié. Tout est sécurisé et vérifiable.',
        ],
      },
      {
        title: 'Les avantages de la signature électronique',
        paragraphs: [
          'Le premier avantage est le gain de temps. Un document signé électroniquement peut être finalisé en quelques minutes, contre plusieurs jours pour un document papier (impression, envoi, signature, retour). Pour les entreprises qui signent régulièrement des contrats, le gain est considérable.',
          'Le deuxième avantage est la réduction des coûts. Plus d\'impression, de papier, d\'enveloppes, de timbres, ni de frais d\'envoi en recommandé. Pour une TPE qui envoie 50 devis par mois, l\'économie peut atteindre 200 a 300 euros mensuels.',
          'Enfin, la traçabilité est totale : vous savez exactement qui a signé, quand, et depuis quelle adresse IP. En cas de litige, ces informations constituent des preuves solides. Factu.me inclut la signature eIDAS gratuitement dans ses plans Pro et supérieurs.',
        ],
      },
    ],
  },
  {
    slug: 'crm-freelance-pipeline-commercial',
    title: 'CRM freelance : comment gérer votre pipeline commercial efficacement',
    description: 'Découvrez comment un CRM adapté aux freelances peut transformer votre prospection commerciale : suivi des contacts, pipeline, relances et conversion.',
    date: '2025-04-05',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Gestion',
    image: '/blog/crm-freelance.jpg',
    content: [
      {
        title: 'Pourquoi un freelance a besoin d\'un CRM',
        paragraphs: [
          'En tant que freelance, votre activité dépend directement de votre capacité a trouver et fidéliser des clients. Un CRM (Customer Relationship Management) vous aide a organiser votre prospection, a suivre vos contacts et a convertir plus de prospects en clients.',
          'Sans CRM, vous gérez vos contacts sur des feuilles Excel, vos emails dans une boîte surchargée et vos relances sur des post-its. Résultat : des opportunités perdues, des suivis oubliés et un temps précieux gaspillé a chercher des informations.',
          'Un CRM intégré a votre outil de facturation, comme celui de Factu.me, vous donne une vue a 360° de chaque client : contacts, devis envoyés, factures émises, paiements reçus, historique complet. C\'est un atout compétitif majeur.',
        ],
      },
      {
        title: 'Le pipeline commercial : visualiser votre prospection',
        paragraphs: [
          'Le pipeline commercial est la représentation visuelle de votre processus de vente. Chaque prospect est classé dans une étape : contact initial, première réunion, devis envoyé, négociation, signature. Vous voyez d\'un coup d\'oeil où en est chaque opportunité.',
          'Un pipeline bien géré vous permet de prévoir votre chiffre d\'affaires. Si vous avez 10 prospects dans l\'étape "devis envoyé" avec un montant moyen de 3 000 euros et un taux de conversion de 30%, vous pouvez anticiper 9 000 euros de CA.',
          'Factu.me intègre un pipeline commercial simple et efficace. Glissez-déposez vos opportunités d\'une étape a l\'autre, ajoutez des notes, programmez des relances et suivez votre taux de conversion. Le CRM est inclus dans le plan Pro.',
        ],
      },
      {
        title: 'Automatiser les relances et le suivi',
        paragraphs: [
          'La majorité des ventes se concluent après 5 a 7 points de contact. Sans automatisation, il est impossible de maintenir ce rythme pour tous vos prospects. Un CRM automatise les relances : email de suivi après un devis, rappel téléphonique, proposition de rendez-vous.',
          'Les relances automatiques ne remplacent pas le contact humain, elles le complètent. Le CRM vous alerte quand un prospect n\'a pas répondu depuis X jours, quand un devis arrive a expiration, quand un client n\'a pas commandé depuis longtemps.',
          'Avec Factu.me, vous pouvez programmer des séquences de relance personnalisées. Le système vous rappelle quand il est temps de recontacter un prospect, sans que vous ayez a y penser. Votre prospection reste active même quand vous êtes en mission.',
        ],
      },
      {
        title: 'Du prospect au client : le parcours complet',
        paragraphs: [
          'Le CRM accompagne chaque étape du parcours client. D\'abord la capture du contact (formulaire web, échange de carte, recommandation). Ensuite la qualification (besoins, budget, timing). Puis la proposition (devis, présentation). Enfin la conversion (signature, facturation).',
          'Une fois le prospect devenu client, le CRM continue de travailler : suivi des missions, facturation récurrente, satisfaction, upsell. Un client fidèle coûte 5 fois moins cher a conserver qu\'un nouveau a acquérir. Le CRM est votre outil de fidélisation.',
          'Factu.me relie naturellement le CRM a la facturation. Quand un prospect accepte votre devis, il devient client dans le système. Vous pouvez immédiatement créer une facture, envoyer un lien de paiement et suivre l\'encaissement. Le parcours est fluide et sans friction.',
        ],
      },
    ],
  },
  {
    slug: 'export-fec-comptabilite',
    title: 'Export FEC : comment préparer votre fichier des écritures comptables',
    description: 'Guide pratique sur l\'export FEC (Fichier des Écritures Comptables) : obligations légales, format, contrôles fiscaux et comment l\'automatiser avec Factu.me.',
    date: '2025-03-10',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Comptabilité',
    image: '/blog/export-fec.jpg',
    content: [
      {
        title: 'Qu\'est-ce que le FEC',
        paragraphs: [
          'Le FEC (Fichier des Écritures Comptables) est un fichier normalisé que toute entreprise soumise a l\'impôt sur les sociétés ou a l\'impôt sur le revenu dans la catégorie BIC doit être en mesure de fournir a l\'administration fiscale en cas de contrôle. Il contient l\'ensemble des écritures comptables de l\'exercice.',
          'Depuis 2014, le FEC est obligatoire et doit être transmis sous 15 jours en cas de contrôle fiscal. Son absence entraîne une amende de 5 000 euros (ou 10% des droits réclamés pour les entreprises au réel). C\'est un fichier texte au format plat avec des champs séparés par des pipes (|).',
          'Le FEC doit contenir 18 champs normalisés : journal, date, numéro de compte, libellé, débit, crédit, etc. Chaque écriture comptable de l\'année doit y figurer, sans exception.',
        ],
      },
      {
        title: 'Qui est concerné par l\'export FEC',
        paragraphs: [
          'Toutes les entreprises soumises a l\'IS ou a l\'IR dans la catégorie BIC doivent pouvoir produire un FEC. Cela inclut les SARL, SAS, EURL, EI et les auto-entrepreneurs au régime réel. Les micro-entrepreneurs en régime micro sont théoriquement exemptés, mais l\'administration recommande de pouvoir le produire.',
          'Les cabinets comptables qui gèrent plusieurs clients doivent produire un FEC par client et par exercice. C\'est un travail répétitif qui peut être automatisé avec les bons outils.',
          'Factu.me génère automatiquement le FEC a partir de vos factures et dépenses. L\'export est conforme a la norme DGFiP et peut être transmis directement a votre comptable ou a l\'administration fiscale.',
        ],
      },
      {
        title: 'Comment préparer un FEC conforme',
        paragraphs: [
          'Un FEC conforme doit respecter strictement le format défini par l\'arrêté du 29 juillet 2013. Les champs sont séparés par le caractère | (pipe). Les dates sont au format AAAAMMJJ. Les montants sont exprimés en euros avec 2 décimales. Le fichier est encodé en UTF-8 ou ISO-8859-15.',
          'Les erreurs les plus courantes sont : des champs manquants, des dates au mauvais format, des montants négatifs mal formatés, des numéros de compte non conformes au Plan Comptable Général. Chacune de ces erreurs peut invalider le fichier.',
          'Factu.me vérifie automatiquement la conformité du FEC avant export : contrôle des 18 champs obligatoires, validation des formats, cohérence des totaux (somme des débits = somme des crédits). Vous exportez un fichier fiable sans risquer l\'amende.',
        ],
      },
      {
        title: 'Automatiser l\'export FEC avec Factu.me',
        paragraphs: [
          'Avec Factu.me, l\'export FEC est un clic. Vos factures émises, factures reçues, dépenses et écritures diverses sont automatiquement converties au format FEC. Vous n\'avez qu\'a sélectionner l\'exercice et télécharger le fichier.',
          'Le module OCR alimente directement le FEC : chaque reçu scanné est catégorisé avec son code PCG et son journal comptable. En fin d\'exercice, toutes les écritures sont prêtes pour l\'export. Plus besoin de ressaisir quoi que ce soit.',
          'Pour les cabinets comptables, Factu.me permet de générer le FEC de chaque client depuis un tableau de bord centralisé. Un gain de temps considérable par rapport a la compilation manuelle depuis plusieurs sources.',
        ],
      },
    ],
  },
  {
    slug: 'facture-recurrente-automatiser',
    title: 'Automatiser vos factures récurrentes : guide pratique',
    description: 'Découvrez comment automatiser la facturation récurrente pour vos abonnements, retenues et missions régulières. Gain de temps et régularité garantie.',
    date: '2025-04-18',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Pratique',
    image: '/blog/facture-recurrente.jpg',
    content: [
      {
        title: 'Qu\'est-ce qu\'une facture récurrente',
        paragraphs: [
          'Une facture récurrente est une facture émise automatiquement a intervalle régulier (mensuel, trimestriel, annuel) pour les mêmes prestations et le même montant. Elle est utilisée pour les abonnements, les missions de conseil au forfait, les prestations de maintenance, les loyers commerciaux.',
          'Si vous facturez chaque mois la même mission au même client, vous passez probablement 15 a 20 minutes par mois a recréer la même facture. Sur un an, c\'est 3 a 4 heures pour une tâche purement répétitive. L\'automatisation vous libère de cette contrainte.',
          'La facture récurrente n\'est pas un simple duplicata. Elle reçoit un nouveau numéro, une nouvelle date et un nouveau délai de paiement a chaque émission. Le logiciel gère automatiquement ces aspects.',
        ],
      },
      {
        title: 'Comment configurer la facturation récurrente',
        paragraphs: [
          'La configuration est simple : vous créez un modèle de facture récurrente avec le client, les prestations, le montant et la fréquence. Le logiciel génère automatiquement les factures aux dates prévues et les envoie par email.',
          'Vous pouvez planifier la récurrence : tous les 1er du mois, tous les trimestres, ou a des dates personnalisées. Le système anticipe les jours fériés et les week-ends pour éviter les envois hors jours ouvrés.',
          'Factu.me permet de configurer des factures récurrentes en quelques clics. Choisissez le client, le modèle de facture, la fréquence et la date de début. Le système se charge du reste. Vous recevez une notification a chaque émission automatique.',
        ],
      },
      {
        title: 'Les avantages de l\'automatisation',
        paragraphs: [
          'Le premier avantage est le gain de temps. Plus besoin de se rappeler d\'émettre la facture, plus de retard d\'envoi, plus d\'oubli. La facture part automatiquement a la date prévue, tous les mois, sans faille.',
          'Le deuxième avantage est la régularité des encaissements. Quand vos clients reçoivent la facture a la même date chaque mois, ils intègrent ce paiement dans leur trésorerie. Les délais de paiement se réduisent et votre prévisibilité financière s\'améliore.',
          'Le troisième avantage est la réduction des erreurs. Une facturation automatisée élimine les risques de faute de frappe, d\'oubli de ligne ou de mauvais montant. Le modèle est vérifié une fois, puis reproduit a l\'identique.',
        ],
      },
      {
        title: 'Cas d\'usage fréquents',
        paragraphs: [
          'Consultants et freelances : facturation mensuelle de missions au forfait (maintenance web, conseil stratégique, accompagnement). La récurrence garantit un revenu stable et prévisible.',
          'Artisans du BTP : contrats d\'entretien et maintenance (chaudière, climatisation, sécurité incendie). La facture récurrente remplace le bon de commande répétitif et sécurise le contrat.',
          'Agences et studios : abonnements de services (hébergement, support, mise a jour). La récurrence couplée au prélèvement SEPA automatise complètement l\'encaissement. Factu.me gère les deux.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-urssaf-auto-entrepreneur',
    title: 'Facturation et URSSAF : ce que tout auto-entrepreneur doit savoir',
    description: 'Comprendre les liens entre facturation et déclarations URSSAF pour les auto-entrepreneurs : CA a déclarer, seuils, cotisations et bonnes pratiques.',
    date: '2025-03-30',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Réglementation',
    image: '/blog/urssaf-auto-entrepreneur.jpg',
    content: [
      {
        title: 'Facturation et déclaration URSSAF : le lien',
        paragraphs: [
          'En tant qu\'auto-entrepreneur, vous déclarez votre chiffre d\'affaires a l\'URSSAF mensuellement ou trimestriellement. Ce CA correspond au total des factures émises et encaissées sur la période. Une facturation rigoureuse est donc la base d\'une déclaration URSSAF correcte.',
          'Attention : c\'est le chiffre d\'affaires encaissé (et non facturé) qui doit être déclaré. Si vous émettez une facture en mars mais que le paiement arrive en avril, vous déclarez ce CA en avril. Suivez vos encaissements réels, pas seulement vos factures émises.',
          'Factu.me vous aide a suivre vos encaissements en temps réel. Le tableau de bord affiche votre CA encaissé sur la période en cours, ce qui facilite considérablement votre déclaration URSSAF.',
        ],
      },
      {
        title: 'Les seuils de chiffre d\'affaires a respecter',
        paragraphs: [
          'En 2025, les seuils de CA pour les auto-entrepreneurs sont de 77 700 euros pour les prestations de services et 188 700 euros pour la vente de marchandises. Dépasser ces seuils entraîne la perte du statut auto-entrepreneur et le passage au régime réel.',
          'Il existe des seuils intermédiaires : 39 100 euros pour les services (seuil de TVA) et 94 300 euros pour les marchandises. Entre ces seuils et les plafonds, vous relevez du régime réel simplifié mais conservez le statut micro-entrepreneur.',
          'Factu.me vous alerte automatiquement quand vous approchez des seuils. Le suivi en temps réel de votre CA cumulé vous permet d\'anticiper et de prendre les bonnes décisions avant qu\'il ne soit trop tard.',
        ],
      },
      {
        title: 'Cotisations sociales et taux applicables',
        paragraphs: [
          'Les cotisations sociales de l\'auto-entrepreneur sont calculées directement sur le CA déclaré. Le taux est de 21,2% pour les prestations de services BIC et BNC, et 12,3% pour la vente de marchandises. Ces taux incluent la CSG-CRDS, l\'assurance maladie, les allocations familiales et la retraite de base.',
          'Si vous avez opté pour le versement libératoire de l\'impôt sur le revenu, un taux supplémentaire s\'applique : 2,2% pour les services et 1% pour les marchandises. Votre déclaration URSSAF inclut ce prélèvement.',
          'Conservez toutes vos factures comme justificatifs. En cas de contrôle URSSAF, vous devrez prouver que le CA déclaré correspond aux factures émises. Factu.me archive automatiquement toutes vos factures et vous permet de les retrouver instantanément.',
        ],
      },
      {
        title: 'Erreurs fréquentes et comment les éviter',
        paragraphs: [
          'La première erreur est de déclarer un CA inférieur aux factures émises. L\'URSSAF peut croiser vos déclarations avec les factures et détecter les écarts. La deuxième erreur est de ne pas déclarer les petits montants ou les prestations "informelles". Toute rémunération doit être facturée.',
          'La troisième erreur est de confondre HT et TTC dans sa déclaration. En auto-entrepreneur, vous déclarez le CA HT (même si vous ne facturez pas la TVA en franchise). Si vous facturez 100 euros HT, c\'est ce montant que vous déclarez.',
          'Factu.me calcule automatiquement votre CA HT a déclarer, distingue les encaissements des factures émises et vous fournit un récapitulatif clair pour votre déclaration URSSAF. Plus de risque d\'erreur.',
        ],
      },
    ],
  },
  {
    slug: 'paiement-en-ligne-stripe-sumup',
    title: 'Paiement en ligne par carte : Stripe vs SumUp pour les freelances',
    description: 'Comparez Stripe et SumUp pour le paiement en ligne de vos factures. Fonctionnalités, tarifs, intégration et lequel choisir selon votre activité.',
    date: '2025-02-15',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Outils',
    image: '/blog/paiement-en-ligne.jpg',
    content: [
      {
        title: 'Pourquoi proposer le paiement en ligne',
        paragraphs: [
          'Proposer le paiement par carte bancaire sur vos factures accélère les encaissements. Selon les études, une facture avec un lien de paiement est réglée en moyenne 2 fois plus vite qu\'une facture avec virement seul. La facilité de paiement est un facteur clé de la rapidité.',
          'Pour les freelances et TPE, le paiement en ligne est devenu un standard. Vos clients professionnels s\'attendent a pouvoir payer directement depuis la facture, sans avoir a se connecter a leur espace bancaire et initier un virement manuellement.',
          'Factu.me intègre les deux principales solutions de paiement : Stripe et SumUp. Vous choisissez celle qui convient le mieux a votre activité et vos clients paient en un clic depuis la facture.',
        ],
      },
      {
        title: 'Stripe : la référence du paiement en ligne',
        paragraphs: [
          'Stripe est la plateforme de paiement en ligne la plus utilisée par les startups et freelances. Elle propose le paiement par carte bancaire, Apple Pay, Google Pay, le prélèvement SEPA et les paiements récurrents. Les tarifs sont de 1,5% + 0,25 euros par transaction (carte française) et 2,9% + 0,25 euros (carte internationale).',
          'Stripe Connect permet aux marketplaces et plateformes de gérer les paiements pour le compte de leurs utilisateurs. Factu.me utilise Stripe Connect pour vous reverser directement les paiements reçus, sans intermédiaire.',
          'Les avantages de Stripe : large gamme de moyens de paiement, API complète, tableau de bord détaillé, paiements récurrents automatisés, et conformité PCI DSS. C\'est le choix idéal pour les freelances tech et les activités B2B.',
        ],
      },
      {
        title: 'SumUp : la simplicité pour les artisans et commerçants',
        paragraphs: [
          'SumUp est une solution de paiement pensée pour les artisans, commerçants et petites entreprises. Elle propose un terminal de paiement mobile (le SumUp Solo) en plus du paiement en ligne. Les tarifs sont compétitifs : 1,69% par transaction sur le terminal et des frais similaires en ligne.',
          'SumUp est particulièrement adapté aux activités qui nécessitent un terminal physique : artisans du BTP qui encaissent sur chantier, prestataires de services sur site, commerçants sur marché. Le terminal se connecte en Bluetooth au smartphone.',
          'Factu.me intègre SumUp pour proposer le paiement en ligne sur les factures et le suivi des encaissements dans le même tableau de bord. Les paiements reçus sont automatiquement associés a la facture correspondante.',
        ],
      },
      {
        title: 'Lequel choisir pour votre activité',
        paragraphs: [
          'Choisissez Stripe si vous êtes freelance tech, consultant ou si vous travaillez principalement en B2B. Stripe offre plus de moyens de paiement, une meilleure gestion des abonnements et une API plus complète. Idéal pour les factures envoyées par email.',
          'Choisissez SumUp si vous êtes artisan, commerçant ou si vous encaissez régulièrement en face-à-face. Le terminal physique est un atout pour les paiements sur site. SumUp est aussi plus simple a configurer.',
          'Bonne nouvelle : Factu.me supporte les deux. Vous pouvez même utiliser Stripe pour les paiements en ligne et SumUp pour les paiements sur site. Les deux flux sont centralisés dans votre tableau de bord Factu.me.',
        ],
      },
    ],
  },
  {
    slug: 'plan-comptable-general-freelance',
    title: 'Plan Comptable Général simplifié pour freelances et auto-entrepreneurs',
    description: 'Comprendre le Plan Comptable Général (PCG) sans être comptable : les comptes essentiels, la classification des dépenses et comment l\'automatiser.',
    date: '2025-04-12',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Comptabilité',
    image: '/blog/plan-comptable.jpg',
    content: [
      {
        title: 'Le PCG en bref pour les non-comptables',
        paragraphs: [
          'Le Plan Comptable Général (PCG) est le référentiel qui classe toutes les opérations comptables d\'une entreprise dans des comptes normalisés. Chaque dépense, recette, créance ou dette est enregistrée dans un compte spécifique identifié par un numéro a 3 ou 4 chiffres.',
          'Pour un freelance, comprendre les grandes catégories suffit. Les comptes de classe 6 concernent les charges (dépenses) : 601 achats, 606 fournitures, 612 loyers, 616 assurances, 625 déplacements, 626 courrier, 641 salaires, 645 cotisations sociales. Les comptes de classe 7 concernent les produits (recettes).',
          'Vous n\'avez pas besoin de devenir comptable, mais classer correctement vos dépenses facilite le travail de votre comptable, réduit vos honoraires et vous aide a optimiser votre fiscalité. Factu.me catégorise automatiquement vos dépenses avec les bons codes PCG.',
        ],
      },
      {
        title: 'Les catégories de dépenses essentielles',
        paragraphs: [
          'Achats et fournitures (comptes 601-606) : matériel informatique, logiciels, fournitures de bureau, matières premières. Ce sont les dépenses directement liées a votre activité professionnelle.',
          'Services extérieurs (comptes 611-628) : loyer professionnel, honoraires comptables, frais bancaires, assurances, abonnements internet et téléphone, services cloud. Ce sont vos frais de fonctionnement.',
          'Déplacements et missions (comptes 625-626) : transports, hôtels, restaurants professionnels, péages, stationnement. Ces frais sont souvent déductibles et nécessitent des justificatifs.',
          'Charges de personnel (comptes 641-645) : salaires, cotisations sociales, mutuelles. Même en auto-entrepreneur, vous pouvez avoir des charges de personnel si vous employez quelqu\'un.',
        ],
      },
      {
        title: 'Automatiser la catégorisation comptable',
        paragraphs: [
          'Classer manuellement chaque dépense dans le bon compte PCG est fastidieux et source d\'erreurs. L\'IA de Factu.me analyse le libellé et le fournisseur de chaque dépense pour lui attribuer automatiquement le bon code PCG.',
          'Par exemple, un paiement a "Amazon Web Services" sera classé en 613 (locations) ou 618 (services divers) selon le contexte. Un paiement a "SNCF" sera classé en 625 (déplacements). L\'IA apprend de vos corrections pour s\'améliorer au fil du temps.',
          'En fin d\'exercice, votre comptable reçoit un export FEC avec toutes les écritures correctement classées. Plus besoin de passer des heures a recatégoriser les dépenses : le travail est fait en continu, au fil de l\'eau.',
        ],
      },
      {
        title: 'Optimiser sa fiscalité grâce a une bonne comptabilité',
        paragraphs: [
          'Une comptabilité bien tenue avec des dépenses correctement classées vous permet d\'optimiser votre fiscalité. Certaines dépenses sont déductibles (et réduisent votre résultat imposable), d\'autres ne le sont pas. Les confondre vous coûte cher.',
          'Les dépenses déductibles courantes : frais de véhicule (kilométrique ou réel), repas professionnels, matériel informatique, logiciels, téléphone, internet, assurance, loyer professionnel, cotisations sociales, formation professionnelle, comptable.',
          'Factu.me vous alerte quand une dépense semble non déductible ou quand vous approchez des plafonds de déduction. L\'IA vous guide pour maximiser vos déductions légales tout en restant conforme.',
        ],
      },
    ],
  },
  {
    slug: 'facture-avoir-note-credit',
    title: 'Facture d\'avoir et note de crédit : quand et comment les utiliser',
    description: 'Comprendre la facture d\'avoir (note de crédit) : quand l\'émettre, comment la rédiger et quelles sont les mentions obligatoires.',
    date: '2025-03-15',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Pratique',
    image: '/blog/facture-avoir.jpg',
    content: [
      {
        title: 'Qu\'est-ce qu\'une facture d\'avoir',
        paragraphs: [
          'La facture d\'avoir (ou note de crédit) est un document comptable qui annule tout ou partie d\'une facture précédemment émise. Elle est utilisée en cas de remise accordée après facturation, de retour de marchandise, d\'erreur sur la facture initiale ou d\'annulation de prestation.',
          'Contrairement a une idée reçue, on ne supprime jamais une facture erronée. On émet une facture d\'avoir qui l\'annule, puis on crée une nouvelle facture corrigée. Cette traçabilité est exigée par le Code de commerce et le Code général des impôts.',
          'La facture d\'avoir peut avoir un montant positif (vous remboursez le client) ou négatif (le client vous doit moins). Elle doit être numérotée dans la même séquence que vos factures et conservée 10 ans.',
        ],
      },
      {
        title: 'Quand émettre une facture d\'avoir',
        paragraphs: [
          'Les cas les plus fréquents : remise accordée après coup (rabais, ristourne), retour de marchandise par le client, erreur de montant sur la facture initiale, annulation de la prestation, ou litige résolu par un geste commercial.',
          'Vous devez également émettre un avoir si vous êtes auto-entrepreneur et que vous accordez un escompte pour paiement anticipé qui n\'était pas prévu sur la facture initiale. L\'avoir régularise la différence.',
          'Factu.me permet de créer une facture d\'avoir en un clic a partir de n\'importe quelle facture existante. Le montant, le client et les mentions légales sont pré-remplis. Vous n\'avez qu\'a indiquer le motif et le montant de l\'avoir.',
        ],
      },
      {
        title: 'Mentions obligatoires de la facture d\'avoir',
        paragraphs: [
          'La facture d\'avoir doit contenir les mêmes mentions obligatoires qu\'une facture classique, plus quelques spécificités. Elle doit faire référence a la facture initiale (numéro et date), indiquer clairement "Avoir" ou "Note de crédit" dans l\'en-tête, et préciser le motif de l\'avoir.',
          'Le montant de l\'avoir doit être détaillé comme une facture : montant HT, TVA et TTC. Si la facture initiale comportait de la TVA, l\'avoir doit également afficher la TVA (négative). Pour les auto-entrepreneurs en franchise, la mention "TVA non applicable, art. 293 B" figure sur l\'avoir.',
          'La numérotation suit la séquence normale des factures. Si votre dernière facture était FAC-2025-042, l\'avoir sera FAC-2025-043. N\'utilisez pas de préfixe spécial comme AVO- qui pourrait créer une séquence parallèle.',
        ],
      },
      {
        title: 'Les erreurs a éviter avec les avoirs',
        paragraphs: [
          'Première erreur : supprimer ou modifier une facture émise. C\'est strictement interdit par la loi. L\'administration fiscale considère qu\'une facture émise est inaltérable. Seul un avoir peut corriger une erreur.',
          'Deuxième erreur : ne pas conserver l\'avoir. Comme la facture, l\'avoir doit être conservé 10 ans. Il fait partie intégrante de votre comptabilité et peut être demandé lors d\'un contrôle.',
          'Troisième erreur : émettre un avoir sans motif légitime. Un avoir abusif (pour gonfler artificiellement le CA facturé) est considéré comme une fraude. Chaque avoir doit correspondre a une opération réelle et justifiée.',
        ],
      },
    ],
  },
  {
    slug: 'cgv-conditions-generales-vente',
    title: 'CGV : pourquoi et comment rédiger vos Conditions Générales de Vente',
    description: 'Guide pratique pour rédiger des CGV conformes pour votre activité freelance ou TPE : clauses obligatoires, mentions légales et intégration a vos factures.',
    date: '2025-04-20',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Réglementation',
    image: '/blog/cgv.jpg',
    content: [
      {
        title: 'Les CGV : obligations légales et bonnes pratiques',
        paragraphs: [
          'Les Conditions Générales de Vente (CGV) sont un document qui définit les conditions dans lesquelles vous vendez vos produits ou services. Pour les professionnels, les CGV sont obligatoires et doivent être communiquées a tout client qui en fait la demande (article L441-6 du Code de commerce).',
          'Les CGV protègent le vendeur comme l\'acheteur. Elles fixent les règles du jeu commercial : prix, modalités de commande, livraison, paiement, garanties, droit de rétractation, responsabilités. En cas de litige, ce sont les CGV qui servent de référence.',
          'Pour les freelances et TPE, des CGV bien rédigées sont un gage de professionnalisme. Elles montrent que vous prenez votre activité au sérieux et que vous encadrez vos relations commerciales avec rigueur.',
        ],
      },
      {
        title: 'Les clauses essentielles de vos CGV',
        paragraphs: [
          'Votre CGV doit contenir au minimum : les prix et conditions de prix (HT/TTC, escompte), les conditions de vente (commande, acceptation, livraison), les délais de paiement et pénalités de retard, les conditions de résiliation, les garanties, la clause de propriété (rétention de titre), la clause résolutoire et les conditions de retour/échange.',
          'Pour les prestataires de services, ajoutez : le périmètre de la mission, les conditions de modification du cahier des charges, les délais de réalisation, les conditions d\'acceptation des livrables, la propriété intellectuelle et les conditions de confidentialité.',
          'Factu.me permet d\'intégrer vos CGV directement dans vos factures. Un bloc "Conditions Générales de Vente" est ajouté automatiquement en bas de chaque facture si vous avez renseigné vos CGV dans les paramètres.',
        ],
      },
      {
        title: 'Comment rédiger des CGV adaptées a votre activité',
        paragraphs: [
          'Évitez les modèles génériques téléchargés sur internet. Vos CGV doivent être adaptées a votre activité spécifique. Un consultant n\'a pas les mêmes besoins qu\'un artisan du BTP ou qu\'un développeur web. Les clauses varient selon le type de prestation.',
          'Rédigez vos CGV dans un langage clair et compréhensible. Les clauses abusives (qui créent un déséquilibre significatif entre les parties) sont nulles et peuvent être sanctionnées par la DGCCRF. Privilégiez l\'équité.',
          'Faites relire vos CGV par un professionnel du droit si votre activité présente des risques spécifiques (sous-traitance, intervention sur site, manipulation de données sensibles). Le coût d\'une relecture juridique (200 a 500 euros) est dérisoire comparé au coût d\'un litige.',
        ],
      },
      {
        title: 'Intégrer vos CGV a vos factures',
        paragraphs: [
          'L\'article L441-9 du Code de commerce impose de faire figurer les conditions d\'escompte et les pénalités de retard sur chaque facture. Vous pouvez aller plus loin en intégrant l\'intégralité de vos CGV ou un lien vers celles-ci.',
          'Factu.me propose deux options : un bloc CGV condensé (les points clés) directement sur la facture, ou un lien cliquable vers vos CGV complètes hébergées en ligne. Les deux options sont conformes a la loi.',
          'Pour configurer vos CGV dans Factu.me, rendez-vous dans Paramètres > Mentions légales > CGV. Saisissez votre texte ou collez vos CGV existantes. Elles seront automatiquement ajoutées a chaque nouvelle facture.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-developpeur-web-freelance',
    title: 'Facturation pour développeur web freelance : guide complet',
    description: 'Spécificités de la facturation pour les développeurs et devs freelance : tarification, TJM, forfaits, factures d\'acompte et bonnes pratiques.',
    date: '2025-04-08',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Conseils',
    image: '/blog/facturation-developpeur.jpg',
    content: [
      {
        title: 'Spécificités de la facturation dev freelance',
        paragraphs: [
          'Les développeurs web freelance ont des pratiques de facturation spécifiques liées a leur mode de tarification (TJM ou forfait), a la nature de leurs prestations (code, design, conseil) et aux livrables (sites web, applications, API). La facturation doit refléter ces particularités.',
          'Le Taux Journalier Moyen (TJM) est le mode de tarification le plus courant. Vous facturez un prix par jour de travail. Votre facture détaille le nombre de jours, le TJM et le total. Certains devs facturent a l\'heure, d\'autres au forfait (prix fixe pour un périmètre défini).',
          'Factu.me propose des modèles de facture adaptés aux devs : lignes détaillées par jour ou par tâche, références au devis initial, mentions sur la propriété intellectuelle et clauses de confidentialité intégrées.',
        ],
      },
      {
        title: 'TJM vs forfait : comment facturer',
        paragraphs: [
          'Le TJM est transparent et flexible. Vous facturez le temps réellement passé. Avantage : pas de mauvaise surprise si le projet déborde. Inconvénient : le client ne connaît pas le coût final a l\'avance. Le TJM moyen d\'un dev freelance en France varie de 300 a 800 euros selon l\'expertise.',
          'Le forfait fixe le prix a l\'avance pour un périmètre défini. Avantage : le client connaît le budget. Inconvénient : si le projet prend plus de temps que prévu, votre taux horaire effectif baisse. Le forfait nécessite un cahier des charges très précis.',
          'La meilleure approche est souvent un mix : un forfait pour le périmètre initial, et du TJM pour les évolutions et modifications hors périmètre. Facturez des acomptes réguliers (30% a la commande, 30% a mi-parcours, 40% a la livraison).',
        ],
      },
      {
        title: 'Factures d\'acompte et livrables',
        paragraphs: [
          'Pour les projets web importants, les factures d\'acompte sont indispensables. Elles sécurisent votre engagement et assurent des rentrées d\'argent régulières. Structurez vos acomptes en fonction des jalons du projet : signature, maquettes, développement, livraison.',
          'Chaque facture d\'acompte doit faire référence au devis initial et préciser le jalon correspondant. A la livraison finale, la facture de solde déduit les acomptes déjà versés. Factu.me gère ce calcul automatiquement.',
          'Pour les missions de maintenance ou de support récurrentes, utilisez la facturation récurrente de Factu.me. Votre facture mensuelle est générée automatiquement avec le même montant, envoyée au client et suivie.',
        ],
      },
      {
        title: 'Conseils pour optimiser votre facturation dev',
        paragraphs: [
          'Détaillez vos lignes de facture. Au lieu d\'une ligne "Développement site web - 5000€", décomposez : "Intégration maquette HTML/CSS - 2 jours", "Développement back-end Node.js - 5 jours", "Configuration déploiement - 1 jour". Plus c\'est détaillé, moins c\'est contestable.',
          'Facturez les réunions, le temps de conception et les corrections. Ces temps "invisibles" font partie de votre travail et doivent être rémunérés. Si vous êtes au TJM, chaque jour passé sur le projet est facturable, y compris les appels de cadrage.',
          'Automatisez au maximum avec Factu.me : devis pré-remplis, transformation devis-facture en un clic, relances automatiques, liens de paiement Stripe. Vous êtes dev, pas comptable. Concentrez-vous sur le code.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-consultant-independant',
    title: 'Facturation consultant indépendant : guide et bonnes pratiques',
    description: 'Maîtrisez la facturation quand on est consultant indépendant : TJM, missions, contrats, déclarations et outils pour une gestion optimale.',
    date: '2025-04-14',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Conseils',
    image: '/blog/facturation-consultant.jpg',
    content: [
      {
        title: 'La facturation du consultant indépendant',
        paragraphs: [
          'Le consultant indépendant (en portage, en EI ou en société) facture principalement des jours de conseil. La facture est le document central qui justifie la relation commerciale et déclenche le paiement. Sa qualité reflète votre professionnalisme.',
          'La facture type d\'un consultant comprend : vos informations légales, celles du client, le détail des jours de conseil (dates, nombre de jours, TJM), les frais éventuels (déplacement, repas) et les mentions légales obligatoires.',
          'Factu.me est adapté aux consultants : modèles de facture avec lignes par jour, gestion des frais remboursables, facturation récurrente pour les missions longues, et export FEC pour votre comptable.',
        ],
      },
      {
        title: 'Structurer votre facture de conseil',
        paragraphs: [
          'La facture de conseil doit être structurée par période et par mission. Indiquez clairement la période concernée (par exemple "Mission de conseil stratégique - Mars 2025"), le nombre de jours, le TJM et le total.',
          'Si vous facturez des frais (déplacement, hôtel, repas), séparez-les des honoraires de conseil. Les frais sont généralement remboursés sur justificatifs et ne sont pas soumis aux mêmes traitements fiscaux que les honoraires.',
          'Pour les missions longues, adoptez la facturation mensuelle en fin de mois. Chaque facture couvre les jours du mois écoulé. Le client s\'habitue a ce rythme et vos encaissements sont réguliers. Factu.me peut automatiser cette facturation mensuelle.',
        ],
      },
      {
        title: 'TJM, propositions commerciales et négociation',
        paragraphs: [
          'Le TJM (Taux Journalier Moyen) est la base de votre tarification. Il varie selon votre expertise : 400-600€ pour un consultant junior, 600-1000€ pour un senior, 1000-1500€+ pour un expert. Fixez votre TJM en fonction de votre valeur marchande, pas de votre coût.',
          'Quand vous négociez, ne baissez pas votre TJM. A la place, proposez un engagement de volume (ex: "TJM 800€ pour un contrat de 3 mois minimum"), un forfait global (remise sur le montant total), ou des conditions de paiement avantageuses.',
          'Factu.me vous aide a suivre vos TJM par client et par mission. Le tableau de bord affiche votre revenu journalier moyen réel, ce qui vous permet d\'ajuster votre tarification et votre stratégie commerciale.',
        ],
      },
      {
        title: 'Gérer plusieurs missions simultanément',
        paragraphs: [
          'Le consultant indépendant travaille souvent pour plusieurs clients en parallèle. La facturation multi-clients nécessite une organisation rigoureuse : suivi des jours par mission, facturation mensuelle par client, relances indépendantes.',
          'Factu.me centralise toutes vos missions dans un tableau de bord unique. Vous voyez d\'un coup d\'oeil les jours facturés par client, les factures en attente, les impayés et le CA prévisionnel. Plus besoin de tableurs complexes.',
          'Le CRM intégré vous aide a gérer votre pipeline de missions. Vous suivez les opportunités (prospection, proposition, signature), planifiez les relances et anticipez les périodes creuses. Un consultant bien organisé est un consultant qui ne connaît pas le chômage.',
        ],
      },
    ],
  },
  {
    slug: 'pwa-facturation-mobile',
    title: 'PWA de facturation : pourquoi votre logiciel doit fonctionner hors-ligne',
    description: 'Découvrez les avantages d\'une PWA (Progressive Web App) pour la facturation mobile : fonctionnement hors-ligne, installation sur l\'écran d\'accueil et performances.',
    date: '2025-03-05',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Outils',
    image: '/blog/pwa-facturation.jpg',
    content: [
      {
        title: 'Qu\'est-ce qu\'une PWA et pourquoi c\'est important',
        paragraphs: [
          'Une PWA (Progressive Web App) est une application web qui fonctionne comme une application native : elle s\'installe sur votre écran d\'accueil, fonctionne hors-ligne, envoie des notifications et accède aux fonctionnalités de votre téléphone (appareil photo, micro, GPS).',
          'Pour un outil de facturation, la PWA est un atout majeur. Vous pouvez créer des factures depuis votre téléphone, même sans connexion internet (sur un chantier, dans le train, en déplacement). Les données sont synchronisées automatiquement quand la connexion revient.',
          'Contrairement a une app native qui nécessite un développement iOS + Android + mises a jour sur les stores, la PWA est une seule application qui fonctionne partout. Factu.me est une PWA : pas besoin de télécharger quoi que ce soit sur l\'App Store.',
        ],
      },
      {
        title: 'La facturation hors-ligne : comment ça marche',
        paragraphs: [
          'Quand vous ouvrez Factu.me sur votre téléphone, les données essentielles (clients, modèles de facture, paramètres) sont mises en cache localement. Vous pouvez créer une facture même sans réseau. Elle est stockée localement et synchronisée dès que la connexion revient.',
          'La facturation vocale fonctionne aussi hors-ligne : l\'audio est enregistré localement, puis transcrit par l\'IA quand le réseau est disponible. Vous dictez votre facture sur le chantier, elle est créée automatiquement dès que vous retrouvez du réseau.',
          'Le mode hors-ligne est transparent : vous ne remarquez même pas que vous êtes déconnecté. L\'interface fonctionne normalement, et un indicateur subtil vous prévient si des données sont en attente de synchronisation.',
        ],
      },
      {
        title: 'Installer Factu.me sur votre téléphone',
        paragraphs: [
          'Installer Factu.me comme une app est simple. Sur Android : ouvrez factu.me dans Chrome, appuyez sur le menu (3 points) et sélectionnez "Installer l\'application". Sur iOS : ouvrez factu.me dans Safari, appuyez sur l\'icône de partage et sélectionnez "Sur l\'écran d\'accueil".',
          'Une fois installée, Factu.me apparaît comme une application classique avec son icône sur votre écran d\'accueil. Elle s\'ouvre en plein écran, sans barre de navigation du navigateur. L\'expérience est identique a celle d\'une app native.',
          'Les mises a jour sont automatiques et silencieuses. Contrairement aux apps du store, pas besoin de télécharger des mises a jour manuellement. Vous disposez toujours de la dernière version avec les dernières fonctionnalités.',
        ],
      },
      {
        title: 'Avantages de la PWA pour les artisans et freelances',
        paragraphs: [
          'Pour les artisans du BTP, la PWA est un game changer. Sur le chantier, pas toujours de connexion internet. Avec Factu.me en mode hors-ligne, vous créez vos factures, consultez vos devis et ajoutez des clients sans réseau. Tout se synchronise plus tard.',
          'Pour les freelances en déplacement, la PWA évite d\'allumer le PC portable pour chaque facture. Depuis votre smartphone, en 2 minutes, vous créez et envoyez une facture professionnelle. C\'est la réactivité que vos clients apprécient.',
          'La PWA Factu.me est incluse dans tous les plans, même le plan gratuit. Pas de supplément pour la version mobile, pas de limitation. Vous disposez de la même puissance sur mobile que sur desktop.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-electronique-factur-x',
    title: 'Factur-X : le format de facture électronique que vous devez connaître',
    description: 'Tout comprendre sur le format Factur-X (ZUGFeRD 2.0) : profils, structure, conformité EN 16931 et comment générer des factures Factur-X avec Factu.me.',
    date: '2025-02-25',
    author: 'Équipe Factu.me',
    readTime: '7 min',
    category: 'Réglementation',
    image: '/blog/factur-x.jpg',
    content: [
      {
        title: 'Qu\'est-ce que Factur-X',
        paragraphs: [
          'Factur-X (aussi appelé ZUGFeRD 2.0 en Allemagne) est un format de facture électronique hybride qui combine un PDF lisible par l\'homme et des données structurées en XML lisibles par machine. Il est conforme a la norme européenne EN 16931 et sera le format standard pour la facture électronique obligatoire en France.',
          'L\'avantage de Factur-X est sa double nature : le destinataire voit une facture PDF classique, identique a ce qu\'il connaît. Mais le fichier contient aussi un fichier XML intégré que les logiciels comptables peuvent lire automatiquement. C\'est le meilleur des deux mondes.',
          'Factur-X est un format franco-allemand, issu de la collaboration entre la France et l\'Allemagne. Il est soutenu par les administrations fiscales des deux pays et par la Commission européenne. Il deviendra le format de référence pour la facturation électronique B2B en Europe.',
        ],
      },
      {
        title: 'Les profils Factur-X',
        paragraphs: [
          'Factur-X existe en 5 profils de complexité croissante. Le profil Minimum contient les données de base (identités, montant total). Le profil Basic WL (Without Lines) ajoute les informations de TVA. Le profil Basic inclut le détail des lignes de facture.',
          'Le profil EN 16931 est le profil complet conforme a la norme européenne. Il contient toutes les informations obligatoires et optionnelles définies par la norme. C\'est le profil recommandé pour la majorité des échanges B2B.',
          'Le profil Extended ajoute des informations supplémentaires pour les échanges complexes (multidevise, escompte, frais accessoires). Factu.me génère des factures Factur-X au profil EN 16931, le profil le plus adapté aux entreprises françaises.',
        ],
      },
      {
        title: 'Comment générer des factures Factur-X',
        paragraphs: [
          'Pour générer une facture Factur-X, vous avez besoin d\'un logiciel de facturation compatible. Le logiciel crée un PDF standard et y intègre un fichier XML conforme au schéma Factur-X. Le résultat est un PDF/A-3 avec la couche XML intégrée.',
          'Le fichier XML doit respecter le schéma CROSS-INDUSTRY-INVOICE défini par la norme UN/CEFACT. Il contient les données structurées de la facture : parties, lignes, montants, TVA, conditions de paiement. La validation du schéma garantit la conformité.',
          'Avec Factu.me, la génération Factur-X est transparente. Créez votre facture normalement dans l\'interface, et exportez-la en Factur-X. Le PDF généré contient automatiquement les données XML structurées. Aucune compétence technique n\'est requise.',
        ],
      },
      {
        title: 'Se préparer a l\'obligation Factur-X 2026',
        paragraphs: [
          'A partir de septembre 2026, les grandes entreprises devront émettre des factures électroniques conformes. Dès septembre 2026, toutes les entreprises devront pouvoir les recevoir. Les PME seront soumises a l\'obligation d\'émission en septembre 2027.',
          'Ne attendez pas la dernière minute. Commencez a émettre des factures Factur-X dès maintenant pour vous familiariser avec le format et vérifier que vos clients peuvent les traiter. C\'est aussi un argument commercial : vous montrez votre anticipation.',
          'Factu.me propose l\'export Factur-X dans le plan Pro (14,99€/mois). Vos factures sont automatiquement conformes a la norme EN 16931 et prêtes pour la transmission via PDP. Le passage a la facture électronique se fera sans friction pour vous.',
        ],
      },
    ],
  },
  {
    slug: 'rgpd-donnees-facturation',
    title: 'RGPD et facturation : comment protéger les données de vos clients',
    description: 'Comprendre vos obligations RGPD en matière de facturation : collecte de données, conservation, droits des clients et mesures de sécurité.',
    date: '2025-03-28',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Réglementation',
    image: '/blog/rgpd-facturation.jpg',
    content: [
      {
        title: 'RGPD et facturation : ce que dit la loi',
        paragraphs: [
          'Le Règlement Général sur la Protection des Données (RGPD) s\'applique a toutes les entreprises qui traitent des données personnelles, y compris les données contenues dans les factures : nom, adresse, email, coordonnées bancaires. En tant qu\'entreprise, vous êtes responsable de ce traitement.',
          'Le principe fondamental est la minimisation des données : ne collectez que les informations nécessaires a la facturation. Le nom, l\'adresse et les informations commerciales sont nécessaires. Le numéro de téléphone personnel ou la date de naissance du client ne le sont pas.',
          'Vous devez également informer vos clients de l\'utilisation de leurs données : a quoi servent-elles, combien de temps sont-elles conservées, quels sont leurs droits (accès, rectification, suppression). Cette information figure dans votre politique de confidentialité.',
        ],
      },
      {
        title: 'Durée de conservation des factures',
        paragraphs: [
          'Le Code de commerce impose une conservation de 10 ans pour les factures et documents comptables (article L123-22). Le RGPD autorise cette conservation longue durée car elle est imposée par la loi. Vous pouvez légitimement conserver les factures pendant 10 ans.',
          'En revanche, les données non nécessaires (adresses IP, historique de navigation) doivent être supprimées plus tôt. La règle est : conservez ce que la loi exige, supprimez le reste dès que possible.',
          'Factu.me conserve vos factures de manière sécurisée pendant la durée légale de 10 ans. Au-delà, les données sont automatiquement purgées. Vous n\'avez rien a gérer, la conformité est automatique.',
        ],
      },
      {
        title: 'Les droits de vos clients',
        paragraphs: [
          'Le RGPD accorde plusieurs droits a vos clients : droit d\'accès (consulter les données que vous détenez), droit de rectification (corriger une erreur), droit a l\'effacement (supprimer les données, sauf obligation légale), droit a la portabilité (exporter les données dans un format lisible).',
          'Vous devez pouvoir répondre a une demande d\'exercice de droits dans un délai d\'un mois. Si un client vous demande ses données, vous devez les lui fournir. S\'il demande une correction, vous devez la faire.',
          'Factu.me facilite le respect de ces droits : chaque utilisateur peut exporter ses données en un clic (fonctionnalité d\'export RGPD intégrée), et les corrections sont possibles a tout moment depuis l\'interface.',
        ],
      },
      {
        title: 'Sécuriser vos données de facturation',
        paragraphs: [
          'La sécurité des données est un pilier du RGPD. Vous devez prendre des mesures techniques et organisationnelles pour protéger les données personnelles de vos clients : chiffrement, accès restreint, sauvegardes, traçabilité des accès.',
          'Factu.me héberge vos données en France sur des serveurs sécurisés conformes aux normes ISO 27001. Les données sont chiffrées en transit (HTTPS) et au repos. L\'authentification a double facteur est disponible. Les accès sont tracés.',
          'En cas de violation de données (piratage, perte), vous devez notifier la CNIL dans les 72 heures et informer les personnes concernées si le risque est élevé. Factu.me a mis en place des procédures de notification et de gestion d\'incident pour vous protéger.',
        ],
      },
    ],
  },
  {
    slug: 'micro-entreprise-vs-auto-entrepreneur',
    title: 'Micro-entreprise vs auto-entrepreneur : quelle différence pour la facturation',
    description: 'Comprendre les différences entre micro-entreprise et auto-entrepreneur pour votre facturation : régime fiscal, TVA, cotisations et mentions légales.',
    date: '2025-04-22',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Guide',
    image: '/blog/micro-entreprise.jpg',
    content: [
      {
        title: 'Auto-entrepreneur et micro-entreprise : même combat',
        paragraphs: [
          'Depuis le 1er janvier 2016, le régime auto-entrepreneur a été fusionné avec le régime micro-social pour devenir le régime de la micro-entreprise. En pratique, "auto-entrepreneur" et "micro-entrepreneur" désignent le même statut. Le terme officiel est "micro-entrepreneur" mais "auto-entrepreneur" reste couramment utilisé.',
          'Le statut de micro-entrepreneur s\'applique aux entrepreneurs individuels dont le chiffre d\'affaires annuel ne dépasse pas les plafonds légaux. Il offre une fiscalité et une cotisation sociale simplifiées, calculées directement sur le CA encaissé.',
          'Pour la facturation, les règles sont identiques quel que soit le terme utilisé. Vos factures doivent contenir les mentions légales obligatoires, la mention "Micro-entrepreneur" ou "Auto-entrepreneur", et si applicable "TVA non applicable, article 293 B du CGI".',
        ],
      },
      {
        title: 'Régime fiscal et TVA',
        paragraphs: [
          'Le régime fiscal de la micro-entreprise est le régime micro : vous bénéficiez d\'un abattement forfaitaire sur votre CA pour le calcul de l\'impôt sur le revenu. 50% pour les BIC ventes, 34% pour les BIC services, 50% pour les BNC. Le revenu imposable est le CA après abattement.',
          'Concernant la TVA, vous êtes en franchise de base tant que votre CA reste sous les seuils (37 500€ services, 85 000€ ventes). Vous ne facturez pas la TVA et ne la déduisez pas. La mention "TVA non applicable, article 293 B du CGI" est obligatoire sur chaque facture.',
          'Si vous dépassez les seuils de TVA, vous basculez au régime réel et devez facturer la TVA. Factu.me s\'adapte automatiquement : si votre profil indique le régime micro, la mention TVA est ajoutée. Si vous êtes au réel, les lignes de TVA sont calculées automatiquement.',
        ],
      },
      {
        title: 'Mentions légales spécifiques sur vos factures',
        paragraphs: [
          'En plus des mentions légales standard, une facture de micro-entrepreneur doit indiquer : "Entrepreneur individuel" (ou "EIRL" si applicable), "Micro-entrepreneur" (ou "Auto-entrepreneur"), le numéro SIRET, et la mention d\'exonération de TVA si applicable.',
          'Si vous exercez une activité artisanale, ajoutez "Dispense d\'immatriculation au RCS et au RM" si vous êtes concerné. Si vous avez opté pour l\'EIRL, indiquez "Entrepreneur individuel a responsabilité limitée" et le nom du patrimoine affecté.',
          'Factu.me génère automatiquement ces mentions en fonction de votre profil. Renseignez votre statut, votre régime fiscal et vos informations légales dans les paramètres, et chaque facture sera conforme sans effort.',
        ],
      },
      {
        title: 'Cotisations sociales et déclarations',
        paragraphs: [
          'Les cotisations sociales du micro-entrepreneur sont calculées sur le CA déclaré, a un taux forfaitaire. En 2025, le taux est de 21,2% pour les prestations de services et 12,3% pour la vente de marchandises. Vous déclarez et payez mensuellement ou trimestriellement sur le site de l\'URSSAF.',
          'Votre facturation doit être en phase avec vos déclarations. Le CA déclaré a l\'URSSAF doit correspondre aux factures émises et encaissées sur la période. Tout écart peut être détecté et contrôlé.',
          'Factu.me affiche votre CA cumulé en temps réel et vous prépare un récapitulatif pour votre déclaration URSSAF. Vous voyez exactement combien déclarer, sans risque d\'erreur. C\'est un gain de temps et de sérénité appréciable.',
        ],
      },
    ],
  },
  {
    slug: 'facture-acompte-quand-comment',
    title: 'Facture d\'acompte : quand et comment l\'émettre correctement',
    description: 'Guide complet sur la facture d\'acompte : quand l\'exiger, comment la rédiger, quel montant demander et comment la déduire de la facture finale.',
    date: '2025-04-25',
    author: 'Équipe Factu.me',
    readTime: '5 min',
    category: 'Pratique',
    image: '/blog/facture-acompte.jpg',
    content: [
      {
        title: 'Qu\'est-ce qu\'une facture d\'acompte',
        paragraphs: [
          'La facture d\'acompte (ou facture d\'avance) est une facture émise avant la livraison finale des biens ou la fin de la prestation. Elle correspond a un paiement partiel demandé a votre client pour sécuriser la commande ou couvrir vos frais avancés.',
          'L\'acompte est différent de l\'arrhes. L\'acompte engage définitivement les deux parties : le client doit payer le solde, et vous devez livrer la prestation. Les arrhes permettent au client de se rétracter (en perdant le montant versé). Ce distinction est importante juridiquement.',
          'Pour les prestations importantes (supérieures a 3 000 euros), l\'acompte est quasi indispensable. Il couvre vos coûts de démarrage et réduit le risque d\'impayé total en cas d\'annulation.',
        ],
      },
      {
        title: 'Quand exiger un acompte',
        paragraphs: [
          'Exigez un acompte dans les cas suivants : prestation supérieure a 3 000 euros, projet nécessitant l\'achat de matériaux ou licences, nouveau client sans historique, projet sur plusieurs mois. L\'acompte de 30% est un standard accepté par la plupart des clients.',
          'Pour le BTP, l\'acompte est systématique. Un artisan ne commence pas un chantier sans acompte. Le montant varie de 30% a 50% selon la taille du projet. Les situations de travaux complètent l\'acompte initial.',
          'Pour les freelances, l\'acompte est souvent négociable. Certains clients proposent des paiements a 30/70 (30% a la commande, 70% a la livraison) ou en 3 fois. Factu.me permet de configurer ces échéanciers dans votre devis et de générer les factures d\'acompte correspondantes.',
        ],
      },
      {
        title: 'Comment rédiger une facture d\'acompte',
        paragraphs: [
          'La facture d\'acompte suit le même format qu\'une facture classique avec quelques spécificités. Elle doit indiquer clairement "Facture d\'acompte" dans l\'en-tête, faire référence au devis ou contrat initial, et préciser le pourcentage ou montant de l\'acompte demandé.',
          'Les mentions légales sont identiques a celles d\'une facture normale. Si vous êtes en franchise de TVA, la mention "TVA non applicable, article 293 B" figure sur l\'acompte. Si vous êtes assujetti, la TVA est calculée sur le montant de l\'acompte.',
          'La facture finale (ou facture de solde) déduit les acomptes déjà versés. Elle indique le montant total, les acomptes déduits et le solde restant du. Factu.me gère ce calcul automatiquement.',
        ],
      },
      {
        title: 'Les erreurs a éviter avec les acomptes',
        paragraphs: [
          'Ne confondez pas acompte et arrhes. Si vous utilisez le terme "arrhes" dans votre devis, le client peut légalement se rétracter. Si vous voulez un engagement ferme, utilisez "acompte". La nuance est cruciale en cas de litige.',
          'N\'oubliez pas de déduire l\'acompte de la facture finale. Si vous facturez 5 000 euros et avez déjà reçu 1 500 euros d\'acompte, la facture de solde doit être de 3 500 euros, pas 5 000 euros. L\'erreur est fréquente et peut créer un litige.',
          'Enfin, facturez l\'acompte au moment du paiement, pas a l\'avance. La facture d\'acompte est émise quand le client verse l\'acompte. La facture de solde est émise a la livraison. Respectez ce timing pour rester conforme au Code de commerce.',
        ],
      },
    ],
  },
  {
    slug: 'facturation-artisan-guide',
    title: 'Facturation artisan : le guide complet pour les métiers artisanaux',
    description: 'Tout savoir sur la facturation quand on est artisan : mentions spécifiques, TVA, SIRET, RM, assurance décennale et outils adaptés.',
    date: '2025-04-28',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Guide',
    image: '/blog/facturation-artisan.jpg',
    content: [
      {
        title: 'Les obligations spécifiques des artisans',
        paragraphs: [
          'Les artisans (plombiers, électriciens, macons, menuisiers, peintres, etc.) ont des obligations de facturation spécifiques. Contrairement aux autres freelances, ils doivent être immatriculés au Répertoire des Métiers (RM) et non au RCS, sauf s\'ils exercent une activité mixte.',
          'La facture artisan doit mentionner le numéro RM, le numéro SIRET, et si applicable le numéro d\'assurance décennale avec les coordonnées de l\'assureur. Ces mentions sont obligatoires et contrôlées par les services de la DGCCRF.',
          'Pour les artisans du BTP, la mention d\'autoliquidation de la TVA doit figurer sur les factures adressées a des professionnels. Pour les artisans hors BTP (boulanger, coiffeur, etc.), la TVA est facturée normalement.',
        ],
      },
      {
        title: 'TVA et régimes fiscaux pour les artisans',
        paragraphs: [
          'Les artisans en micro-entreprise bénéficient de la franchise de TVA (pas de TVA facturée) tant que leur CA est sous les seuils. Mention obligatoire : "TVA non applicable, article 293 B du CGI". Au-dela des seuils, passage au régime réel avec facturation de la TVA.',
          'Pour les artisans du BTP au régime réel, le mécanisme d\'autoliquidation s\'applique aux travaux immobiliers pour les clients assujettis a la TVA. La facture mentionne "Autoliquidation de la TVA" et le montant HT uniquement.',
          'Factu.me gère automatiquement ces cas. Renseignez votre régime fiscal et votre secteur dans les paramètres, et le logiciel applique les bonnes mentions TVA sur chaque facture.',
        ],
      },
      {
        title: 'Devis et facture : le flux artisan idéal',
        paragraphs: [
          'Le flux idéal pour un artisan est : 1) devis détaillé avec photos et descriptions, 2) acompte a la commande (30-50%), 3) situations de travaux en cours de chantier, 4) facture de solde a la livraison, 5) facture de garantie si nécessaire.',
          'Le devis artisan est souvent le document commercial le plus important. Il doit être suffisamment détaillé pour éviter les litiges en cours de chantier. Incluez les matériaux, la main-d\'oeuvre, les options et les conditions de garantie.',
          'Factu.me permet de gérer ce flux complet : création du devis avec détails, transformation en situations de travaux, factures d\'acompte automatiques et facture de solde. L\'outil est conçu pour le quotidien de l\'artisan.',
        ],
      },
      {
        title: 'Les outils adaptés aux artisans',
        paragraphs: [
          'Les artisans ont des besoins spécifiques : facturation sur chantier, signature de devis sur tablette, scan de reçus de matériaux, suivi des chantiers en cours. Un logiciel de facturation généraliste ne suffit pas toujours.',
          'Factu.me répond a ces besoins avec : facturation vocale (dictez votre facture les mains libres sur le chantier), application mobile PWA (fonctionne hors-ligne), signature électronique de devis (le client signe sur votre tablette), OCR pour les reçus de matériaux.',
          'Le plan Starter est gratuit (3 factures/mois avec dictée vocale IA). Le plan Pro à 14,99€/mois inclut factures illimitées, URSSAF One-Click, Voice Expense et Copilot IA. Le plan Business à 39,99€/mois ajoute 5 cabinets, Comptable Connect et multi-utilisateur.',
        ],
      },
    ],
  },
  {
    slug: 'gestion-depenses-freelance',
    title: 'Gestion des dépenses freelance : comment tout déduire légalement',
    description: 'Guide complet sur la gestion des dépenses pour freelances : quoi déduire, comment justifier, les frais courants et les outils pour simplifier.',
    date: '2025-04-16',
    author: 'Équipe Factu.me',
    readTime: '6 min',
    category: 'Comseils',
    image: '/blog/gestion-depenses.jpg',
    content: [
      {
        title: 'Pourquoi gérer ses dépenses est crucial',
        paragraphs: [
          'En tant que freelance, chaque euro dépensé pour votre activité peut réduire votre résultat imposable. Une dépense déductible de 100 euros vous fait économiser environ 30 a 45 euros d\'impôts et cotisations. Ne pas les suivre, c\'est littéralement jeter l\'argent par les fenêtres.',
          'La gestion des dépenses n\'est pas qu\'une question d\'optimisation fiscale. C\'est aussi un outil de pilotage : connaître vos coûts réels vous permet de fixer vos prix justement, d\'identifier les postes les plus lourds et de prendre des décisions éclairées.',
          'Malheureusement, beaucoup de freelances négligent cette gestion. Les reçus s\'empilent, les notes de frais sont oubliées, et en fin d\'année, c\'est le chaos. Factu.me résout ce problème avec un suivi automatisé des dépenses.',
        ],
      },
      {
        title: 'Les dépenses déductibles courantes',
        paragraphs: [
          'Frais de fonctionnement : loyer du bureau (ou quote-part du loyer si télétravail), internet, téléphone, électricité, assurance, fournitures de bureau. Ces frais sont déductibles au prorata de l\'utilisation professionnelle.',
          'Frais de déplacement : transports en commun, véhicule (au barème kilométrique), péages, stationnement, hôtels et repas lors de déplacements professionnels. Conservez tous les justificatifs.',
          'Frais informatiques : ordinateur, logiciels, hébergement web, abonnements cloud, matériel informatique. Ces investissements sont déductibles, parfois amortis sur plusieurs années selon leur montant.',
          'Frais professionnels : honoraires comptables, cotisations sociales, formation professionnelle, publicité, frais bancaires, cotisations syndicales. Chaque euro dépensé pour votre activité professionnelle est potentiellement déductible.',
        ],
      },
      {
        title: 'Comment justifier vos dépenses',
        paragraphs: [
          'Toute dépense déductible doit être justifiée par un document : facture, reçu, ticket de caisse, quittance. Le justificatif doit mentionner la date, le montant, le fournisseur et la nature de la dépense. Conservez ces documents pendant 10 ans.',
          'Pour les dépenses mixtes (personnelles et professionnelles), vous devez pouvoir justifier la quote-part professionnelle. Par exemple, si votre abonnement internet coûte 40€/mois et que vous l\'utilisez a 80% pour le travail, vous déduisez 32€/mois.',
          'Factu.me avec l\'OCR scanne vos reçus, extrait les informations clés et les classe automatiquement dans la bonne catégorie. Plus besoin de conserver des piles de papier : tout est numérisé et organisé.',
        ],
      },
      {
        title: 'Micro-entreprise vs réel : différences de déduction',
        paragraphs: [
          'En micro-entreprise, vous ne déduisez pas vos dépenses réellement. L\'administration fiscale applique un abattement forfaitaire (34% pour les services, 50% pour les ventes) qui remplace la déduction des frais réels. Vous n\'avez pas besoin de justifier vos dépenses une par une.',
          'Au régime réel, vous déduisez vos dépenses réelles pour leur montant exact. C\'est plus avantageux si vos frais sont élevés (loyer, matériel, sous-traitance), mais cela impose une comptabilité plus rigoureuse et l\'obligation de garder tous les justificatifs.',
          'Quel que soit votre régime, Factu.me vous aide a suivre vos dépenses. En micro, le suivi vous donne une visibilité sur vos coûts réels. Au réel, l\'export FEC et les catégories PCG facilitent le travail de votre comptable.',
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function getRelatedPosts(currentSlug: string, count: number = 3): BlogPost[] {
  const currentPost = getBlogPost(currentSlug);
  if (!currentPost) return blogPosts.slice(0, count);

  const sameCategory = blogPosts.filter(
    (post) => post.slug !== currentSlug && post.category === currentPost.category
  );
  const others = blogPosts.filter(
    (post) => post.slug !== currentSlug && post.category !== currentPost.category
  );

  return [...sameCategory, ...others].slice(0, count);
}

export function getAllCategories(): string[] {
  const categories = new Set(blogPosts.map((post) => post.category));
  return Array.from(categories);
}
