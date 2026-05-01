/**
 * Validation de la numérotation des factures
 * Conformément à l'article L.441-9 du Code de commerce
 * La numérotation des factures doit être continue et sans rupture
 */

import { Invoice } from '@/types';

/**
 * Extrait le numéro séquentiel d'une facture
 * Supporte les formats : FAC-2024-0001, 2024-0001, 0001, etc.
 */
export function extractSequentialNumber(invoiceNumber: string): number | null {
  // Cherche un nombre à la fin de la chaîne
  const match = invoiceNumber.match(/(\d+)(?!.*\d)/);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Vérifie si la numérotation est continue
 * @param previousNumber Numéro de la facture précédente
 * @param newNumber Numéro de la nouvelle facture
 * @returns true si la numérotation est continue
 */
export function isSequentialNumbering(previousNumber: string, newNumber: string): boolean {
  const prevSeq = extractSequentialNumber(previousNumber);
  const newSeq = extractSequentialNumber(newNumber);

  if (prevSeq === null || newSeq === null) return false;

  // La numérotation doit s'incrémenter de 1
  return newSeq === prevSeq + 1;
}

/**
 * Valide que la nouvelle facture respecte la continuité de la numérotation
 * @param lastInvoice La dernière facture émise
 * @param newInvoice La nouvelle facture à créer
 * @returns Un objet avec isValid et un message d'erreur si applicable
 */
export function validateInvoiceNumbering(lastInvoice: Invoice | null, newInvoice: Invoice): { isValid: boolean; error?: string } {
  // Pas de facture précédente = pas de validation nécessaire
  if (!lastInvoice) {
    return { isValid: true };
  }

  // Vérifier que c'est le même utilisateur
  if (lastInvoice.user_id !== newInvoice.user_id) {
    return { isValid: true }; // Utilisateurs différents, pas de comparaison
  }

  // Vérifier que c'est la même année (la numérotation peut recommencer chaque année)
  const lastYear = new Date(lastInvoice.issue_date).getFullYear();
  const newYear = new Date(newInvoice.issue_date).getFullYear();

  if (lastYear !== newYear) {
    return { isValid: true }; // Années différentes, la numérotation peut recommencer
  }

  // Vérifier la continuité de la numérotation
  if (!isSequentialNumbering(lastInvoice.number, newInvoice.number)) {
    const lastSeq = extractSequentialNumber(lastInvoice.number);
    const newSeq = extractSequentialNumber(newInvoice.number);
    const expectedSeq = lastSeq !== null ? lastSeq + 1 : '?';

    return {
      isValid: false,
      error: `Numérotation non continue. La dernière facture était ${lastInvoice.number}. La facture suivante devrait se terminer par ${expectedSeq}, mais vous avez créé ${newInvoice.number}. Conformément à l'article L.441-9 du Code de commerce, la numérotation des factures doit être continue et chronologique.`
    };
  }

  return { isValid: true };
}

/**
 * Génère le prochain numéro de facture
 * @param lastInvoice La dernière facture émise
 * @param prefix Le préfixe à utiliser (ex: FAC, DEV, AVO)
 * @param year L'année (utilise l'année courante si non spécifiée)
 * @returns Le prochain numéro de facture
 */
export function generateNextInvoiceNumber(
  lastInvoice: Invoice | null,
  prefix: string = 'FAC',
  year?: number
): string {
  const currentYear = year || new Date().getFullYear();
  const lastYear = lastInvoice ? new Date(lastInvoice.issue_date).getFullYear() : null;

  // Si changement d'année ou pas de facture précédente, recommencer à 1
  if (lastYear !== currentYear || !lastInvoice) {
    return `${prefix}-${currentYear}-0001`;
  }

  // Extraire le numéro séquentiel et incrémenter
  const lastSeq = extractSequentialNumber(lastInvoice.number);
  const nextSeq = lastSeq !== null ? lastSeq + 1 : 1;

  return `${prefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Formate un numéro de séquence avec des zéros initiaux
 * @param sequence Le numéro de séquence
 * @param padding Le nombre de chiffres (défaut: 4)
 * @returns Le numéro formaté (ex: 0001)
 */
export function padSequence(sequence: number, padding: number = 4): string {
  return String(sequence).padStart(padding, '0');
}
