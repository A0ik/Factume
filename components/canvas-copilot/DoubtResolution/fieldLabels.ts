export const FIELD_LABELS: Record<string, string> = {
  'client_name': 'Nom du client',
  'client_email': 'Email du client',
  'client_phone': 'Téléphone du client',
  'client_address': 'Adresse du client',
  'client_city': 'Ville du client',
  'client_postal_code': 'Code postal',
  'client_siret': 'SIRET client',
  'client_vat_number': 'N° TVA client',
  'due_days': 'Délai de paiement',
  'notes': 'Notes',
  'discount_percent': 'Remise (%)',
  'items[0].description': 'Description (ligne 1)',
  'items[0].unit_price': 'Prix unitaire (ligne 1)',
  'items[0].quantity': 'Quantité (ligne 1)',
  'items[0].vat_rate': 'Taux TVA (ligne 1)',
};

export function getFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Handle dynamic items[N].field patterns
  const match = field.match(/^items\[(\d+)\]\.(.+)$/);
  if (match) {
    const idx = parseInt(match[1]) + 1;
    const prop = match[2];
    const propLabel = FIELD_LABELS[`items[0].${prop}`] || prop;
    return `${propLabel.replace('(ligne 1)', `(ligne ${idx})`)}`;
  }
  return field;
}
