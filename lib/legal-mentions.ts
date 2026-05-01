/**
 * Mentions légales par pays pour les documents commerciaux
 * Conformité réglementaire internationale
 */

export interface CountryLegalMentions {
  countryCode: string;
  countryName: string;
  currency: string;
  locale: string;
  vatLabel: string;
  companyRegLabel: string;
  penaltyMention: string;
  legalReference: string;
  disputeJurisdiction: string;
  mandatoryMentions: {
    invoice: string[];
    quote: string[];
    purchase_order: string[];
    delivery_note: string[];
    credit_note: string[];
  };
}

export const LEGAL_MENTIONS_BY_COUNTRY: Record<string, CountryLegalMentions> = {
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR',
    locale: 'fr-FR',
    vatLabel: 'N° TVA intracommunautaire',
    companyRegLabel: 'SIRET',
    penaltyMention: 'Pénalités de retard : 3× le taux légal — Indemnité forfaitaire de frais de recouvrement : 40€ (art. L.441-10 c. com.)',
    legalReference: 'Art. L.441-9 du Code de commerce',
    disputeJurisdiction: 'En cas de litige, Tribunal de Commerce du siège social du prestataire',
    mandatoryMentions: {
      invoice: [
        'Numéro de facture',
        'Date d\'émission',
        'Date d\'échéance',
        'Montant à régler',
        'Coordonnées bancaires (si paiement par virement)',
        'Pénalités de retard',
      ],
      quote: [
        'Numéro de devis',
        'Date d\'émission',
        'Date de validité',
        'Montant total',
      ],
      purchase_order: [
        'Numéro de bon de commande',
        'Date d\'émission',
        'Date de validité',
        'Montant total',
      ],
      delivery_note: [
        'Numéro de bon de livraison',
        'Date de livraison',
        'Liste des articles livrés',
        'Signature du destinataire',
      ],
      credit_note: [
        'Numéro d\'avoir',
        'Date d\'émission',
        'Référence à la facture originale',
        'Montant du crédit',
      ],
    },
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    vatLabel: 'VAT number',
    companyRegLabel: 'Company registration',
    penaltyMention: 'Late payment penalties: 3× statutory rate — Fixed indemnity: £40 (Late Payment of Commercial Debts Regulations 2013)',
    legalReference: 'Late Payment of Commercial Debts Regulations 2013',
    disputeJurisdiction: 'In case of dispute, competent court: UK courts',
    mandatoryMentions: {
      invoice: [
        'Invoice number',
        'Issue date',
        'Due date',
        'Amount due',
        'Bank details (if payment by transfer)',
        'Late payment penalties',
      ],
      quote: [
        'Quote number',
        'Issue date',
        'Valid until',
        'Total amount',
      ],
      purchase_order: [
        'Purchase order number',
        'Issue date',
        'Valid until',
        'Total amount',
      ],
      delivery_note: [
        'Delivery note number',
        'Delivery date',
        'List of delivered items',
        'Recipient signature',
      ],
      credit_note: [
        'Credit note number',
        'Issue date',
        'Reference to original invoice',
        'Credit amount',
      ],
    },
  },
  BE: {
    countryCode: 'BE',
    countryName: 'Belgique',
    currency: 'EUR',
    locale: 'fr-BE',
    vatLabel: 'N° TVA',
    companyRegLabel: 'Numéro d\'entreprise',
    penaltyMention: 'Intérêts de retard : taux légal + 10% — Indemnité forfaitaire : 40€ (Loi relative aux délais de paiement)',
    legalReference: 'Loi relative aux délais de paiement',
    disputeJurisdiction: 'En cas de litige, Tribunal de Commerce du siège social du prestataire',
    mandatoryMentions: {
      invoice: [
        'Numéro de facture',
        'Date d\'émission',
        'Date d\'échéance',
        'Montant à régler',
        'Coordonnées bancaires',
        'Intérêts de retard',
      ],
      quote: [
        'Numéro de devis',
        'Date d\'émission',
        'Date de validité',
        'Montant total',
      ],
      purchase_order: [
        'Numéro de bon de commande',
        'Date d\'émission',
        'Date de validité',
        'Montant total',
      ],
      delivery_note: [
        'Numéro de bon de livraison',
        'Date de livraison',
        'Liste des articles livrés',
        'Signature du destinataire',
      ],
      credit_note: [
        'Numéro d\'avoir',
        'Date d\'émission',
        'Référence à la facture originale',
        'Montant du crédit',
      ],
    },
  },
  CH: {
    countryCode: 'CH',
    countryName: 'Suisse',
    currency: 'CHF',
    locale: 'de-CH',
    vatLabel: 'MwSt-Nr.',
    companyRegLabel: 'Handelsregister',
    penaltyMention: 'Verzugszins: 5% über dem gesetzlichen Zins — Pauschalentschädigung: 40 CHF (OR Art. 104)',
    legalReference: 'OR Art. 104',
    disputeJurisdiction: 'Bei Streitigkeiten zuständiges Gericht: Gericht am Sitz des Dienstleisters',
    mandatoryMentions: {
      invoice: [
        'Rechnungsnummer',
        'Rechnungsdatum',
        'Fälligkeitsdatum',
        'Zu zahlender Betrag',
        'Bankverbindung',
        'Verzugszinsen',
      ],
      quote: [
        'Offertennummer',
        'Offertendatum',
        'Gültig bis',
        'Gesamtbetrag',
      ],
      purchase_order: [
        'Bestellnummer',
        'Bestelldatum',
        'Gültig bis',
        'Gesamtbetrag',
      ],
      delivery_note: [
        'Lieferscheinnummer',
        'Lieferdatum',
        'Liste der gelieferten Artikel',
        'Unterschrift des Empfängers',
      ],
      credit_note: [
        'Gutschriftennummer',
        'Gutschriften datum',
        'Referenz zur Originalrechnung',
        'Gutschriftsbetrag',
      ],
    },
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Deutschland',
    currency: 'EUR',
    locale: 'de-DE',
    vatLabel: 'USt-IdNr.',
    companyRegLabel: 'Handelsregisternummer',
    penaltyMention: 'Verzugszinsen: 5% über dem Basiszinssatz — Pauschalierter Schadensersatz: 40€ (§ 286 BGB)',
    legalReference: '§ 286 BGB, § 14 UStG',
    disputeJurisdiction: 'Bei Streitigkeiten zuständiges Gericht: Gericht am Sitz des Dienstleisters',
    mandatoryMentions: {
      invoice: [
        'Rechnungsnummer',
        'Rechnungsdatum',
        'Fälligkeitsdatum',
        'Zu zahlender Betrag',
        'Bankverbindung',
        'Verzugszinsen',
      ],
      quote: [
        'Angebotsnummer',
        'Angebotsdatum',
        'Gültig bis',
        'Gesamtbetrag',
      ],
      purchase_order: [
        'Bestellnummer',
        'Bestelldatum',
        'Gültig bis',
        'Gesamtbetrag',
      ],
      delivery_note: [
        'Lieferscheinnummer',
        'Lieferdatum',
        'Liste der gelieferten Artikel',
        'Unterschrift des Empfängers',
      ],
      credit_note: [
        'Gutschriftennummer',
        'Gutschriften datum',
        'Referenz zur Originalrechnung',
        'Gutschriftsbetrag',
      ],
    },
  },
};

/**
 * Récupère les mentions légales pour un pays
 * @param countryCode Code ISO du pays (FR, GB, BE, CH, DE)
 * @returns Les mentions légales du pays ou celles de la France par défaut
 */
export function getLegalMentionsForCountry(countryCode: string): CountryLegalMentions {
  return LEGAL_MENTIONS_BY_COUNTRY[countryCode.toUpperCase()] || LEGAL_MENTIONS_BY_COUNTRY.FR;
}

/**
 * Liste des pays supportés
 */
export const SUPPORTED_COUNTRIES = Object.keys(LEGAL_MENTIONS_BY_COUNTRY);

/**
 * Vérifie si un pays est supporté
 */
export function isCountrySupported(countryCode: string): boolean {
  return SUPPORTED_COUNTRIES.includes(countryCode.toUpperCase());
}
