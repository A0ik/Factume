interface FAQ {
  question: string;
  answer: string;
}

export const faqData: Record<string, FAQ[]> = {
  'facturation-auto-entrepreneur': [
    {
      question: 'Est-ce que Factu.me est conforme aux obligations légales des auto-entrepreneurs ?',
      answer: 'Oui, Factu.me génère automatiquement toutes les mentions obligatoires sur vos factures : numéro SIRET, mention "TVA non applicable selon article 259-1 du CGI", date d\'émission, numéro de facture, et penalties de retard. Vos factures sont 100% conformes URSSAF.',
    },
    {
      question: 'Puis-je utiliser Factu.me si je suis en franchise de TVA ?',
      answer: 'Absolument ! Factu.me est spécialement conçu pour les auto-entrepreneurs en franchise de TVA. La mention légale est ajoutée automatiquement sur chaque facture. Vous n\'avez rien à configurer.',
    },
    {
      question: 'Combien coûte Factu.me pour un auto-entrepreneur ?',
      answer: 'Le plan gratuit permet de créer 10 factures par mois, suffisant pour 80% des auto-entrepreneurs. Au-delà, les plans commencent à 14,99€/mois. Vous pouvez tester gratuitement 7 jours sans carte bancaire.',
    },
    {
      question: 'Est-ce que je peux suivre mon chiffre d\'affaires auto-entrepreneur ?',
      answer: 'Oui, le tableau de bord vous montre votre CA en temps réel, avec une alerte quand vous approchez des plafonds de la micro-entreprise. Vous pouvez exporter les données pour votre comptable ou votre déclaration URSSAF.',
    },
    {
      question: 'Comment fonctionne la facturation vocale pour auto-entrepreneur ?',
      answer: 'Dites simplement "Facture 500 euros pour Martin Dupont, création de site web" et Factu.me génère votre facture en quelques secondes. Idéal entre deux rendez-vous ou sur un chantier.',
    },
  ],
  'facturation-btp': [
    {
      question: 'Factu.me gère-t-il les factures d\'acompte pour le bâtiment ?',
      answer: 'Oui, vous pouvez créer des factures d\'acompte, des factures de situation et les factures de solde. Le calcul automatique des pourcentages et des retenues de garantie est inclus.',
    },
    {
      question: 'Puis-je ajouter mes mentions légales spécifiques au BTP ?',
      answer: 'Bien sûr ! Vous pouvez personnaliser les conditions de paiement, les clauses de réserve de propriété, les assurances décennales et toutes les mentions obligatoires dans le bâtiment.',
    },
    {
      question: 'Est-ce adapté aux artisans du BTP ?',
      answer: 'Factu.me est utilisé par des électriciens, plombiers, menuisiers, maçons... L\'interface mobile permet de facturer directement depuis le chantier. La dictée vocale fonctionne même avec des termes techniques.',
    },
  ],
  'facturation-freelances': [
    {
      question: 'Pourquoi les freelances choisissent Factu.me ?',
      answer: 'Les freelances apprécient la rapidité (30 secondes par facture), le professionnel (design épuré, envoi automatique), et le prix (gratuit pour démarrer). Plus besoin de perdre du temps sur Excel ou Word.',
    },
    {
      question: 'Puis-je facturer en plusieurs devises ?',
      answer: 'Oui, Factu.me supporte plus de 150 devises avec conversion automatique. Parfait pour les freelances qui travaillent avec des clients internationaux.',
    },
    {
      question: 'Est-ce que je peux personnaliser mes factures freelance ?',
      answer: 'Oui, ajoutez votre logo, choisissez vos couleurs, personnalisez le pied de page. Vos factures reflètent votre marque, essentielle pour l\'image professionnelle d\'un freelance.',
    },
  ],
  'logiciel-facture-gratuit': [
    {
      question: 'Est-ce vraiment gratuit ?',
      answer: 'Le plan gratuit est 100% gratuit, sans carte bancaire, et vous permet de créer 10 factures par mois. Pas de limites de temps, pas de fonctionnalités cachées. C\'est gratuit pour toujours à ce niveau.',
    },
    {
      question: 'Quelles sont les limitations du plan gratuit ?',
      answer: '10 factures par mois, un utilisateur, templates de base. Suffisant pour les auto-entrepreneurs et petites activités. Les plans payants débloquent des fonctionnalités avancées et des volumes illimités.',
    },
    {
      question: 'Y a-t-il un essai gratuit des plans payants ?',
      answer: 'Oui, 7 jours d\'essai gratuit sur tous les plans sans carte bancaire. Testez toutes les fonctionnalités avant de vous engager.',
    },
  ],
  'facture-sans-tva': [
    {
      question: 'Comment facturer sans TVA avec Factu.me ?',
      answer: 'Factu.me ajoute automatiquement la mention "TVA non applicable selon article 259-1 du CGI" sur vos factures. Idéal pour les auto-entrepreneurs et entreprises en franchise de base.',
    },
    {
      question: 'La mention légale est-elle conforme ?',
      answer: 'Oui, la formulation est conforme aux exigences fiscales françaises. Vos factures sont valides pour l\'administration et vos clients.',
    },
  ],
  'facturation-vocale': [
    {
      question: 'Comment fonctionne la facturation vocale ?',
      answer: 'Cliquez sur le micro, dictez votre facture ("500 euros pour Martin, site web") et l\'IA génère votre facture. Plus de 90% de précision sur les termes courants.',
    },
    {
      question: 'En combien de temps puis-je créer une facture vocale ?',
      answer: 'Environ 10-15 secondes. Le temps de dicter les informations essentielles et l\'IA fait le reste. 4x plus rapide que la saisie manuelle.',
    },
  ],
  'facturation-ocr': [
    {
      question: 'Comment fonctionne l\'OCR pour les justificatifs ?',
      answer: 'Importez une photo ou PDF de justificatif, l\'IA extrait automatiquement le montant, la date, le merchant. Vous pouvez taguer des dépenses et les exporter pour votre comptable.',
    },
    {
      question: 'Quelle est la précision de l\'OCR ?',
      answer: 'Plus de 95% sur les factures fournisseurs françaises standard. L\'IA s\'améliore continuellement et vous pouvez toujours corriger manuellement si nécessaire.',
    },
  ],
};

export function getFAQsForPage(pageSlug: string): FAQ[] {
  return faqData[pageSlug] || [];
}

export function getAllPageSlugsWithFAQ(): string[] {
  return Object.keys(faqData);
}
