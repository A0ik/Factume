interface OGImageOptions {
  title: string;
  description: string;
  theme?: 'blue' | 'green' | 'purple';
}

export function getOgImageUrl(options: OGImageOptions): string {
  const baseUrl = 'https://factu.me/api/og';
  const params = new URLSearchParams({
    title: options.title,
    description: options.description,
    theme: options.theme || 'blue',
  });
  return `${baseUrl}?${params.toString()}`;
}

export const ogThemes = {
  blue: 'blue',
  green: 'green',
  purple: 'purple',
} as const;

export const pageThemes: Record<string, 'blue' | 'green' | 'purple'> = {
  'facturation-auto-entrepreneur': 'green',
  'facturation-freelances': 'blue',
  'facturation-pme': 'purple',
  'facturation-artisans': 'green',
  'facturation-consultant': 'blue',
  'facturation-btp': 'green',
  'facturation-construction': 'green',
  'facturation-menuiserie': 'green',
  'facturation-plomberie': 'green',
  'facturation-electricien': 'green',
  'facturation-developpeur': 'blue',
  'facturation-designer': 'blue',
  'facturation-vocale': 'purple',
  'facturation-electronique': 'blue',
  'facturation-factur-x': 'blue',
  'facturation-ocr': 'purple',
  'facture-sans-tva': 'green',
  'facture-acompte': 'blue',
  'facture-en-anglais': 'purple',
  'modele-facture': 'blue',
  'editeur-facture': 'blue',
  'generateur-facture': 'blue',
  'creer-facture': 'green',
  'devis-facture': 'blue',
  'logiciel-devis': 'blue',
  'creer-devis': 'green',
  'suivi-paiement': 'purple',
  'relance-facture': 'purple',
  'logiciel-facture-gratuit': 'green',
  'logiciel-facture-simple': 'blue',
  'logiciel-facture-francais': 'blue',
  'meilleur-logiciel-facture': 'purple',
  'top-logiciels-facturation': 'purple',
  'alternative-henrj': 'blue',
  'alternative-tiime': 'blue',
  'logiciel-facture-freelance': 'blue',
  'logiciel-facture-auto-entrepreneur': 'green',
  'logiciel-facturation-artisan': 'green',
  'logiciel-facturation-pme': 'purple',
} as const;
