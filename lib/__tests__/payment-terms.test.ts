import { describe, it, expect } from 'vitest';
import { resolveTermsText, parseStoredTerm } from '../payment-terms';

// PROMETHEUS (CIBLE 1) — Tests du résolveur de conditions de paiement.
//
// Contexte du bug : « toujours 30 jours ». Le terme choisi par l'utilisateur
// n'était JAMAIS lu car (a) la colonne invoices.payment_terms n'existait pas et
// (b) le modèle ne savait exprimer qu'un nombre de jours (« 0 » → « sous 0 jours »,
// « fin de mois » → impossible). On persiste désormais le termId sémantique et ce
// résolveur le traduit en phrase française. Ces tests figent les 8 options + les
// cas legacy (numérique / vide / null) pour empêcher toute régression.

describe('resolveTermsText — termId sémantique → phrase FR', () => {
  it('reception → « à réception » (jamais « sous 0 jours »)', () => {
    const text = resolveTermsText('reception');
    expect(text).toBeTruthy();
    expect(text).toMatch(/à réception/);
    expect(text).not.toMatch(/sous 0 jour/);
  });

  it('chaîne vide → « à réception » (persisté explicite par l\'utilisateur)', () => {
    expect(resolveTermsText('')).toMatch(/à réception/);
  });

  it('legacy numérique "0" → « à réception » (BUG HISTORIQUE « sous 0 jours »)', () => {
    expect(resolveTermsText('0')).toMatch(/à réception/);
    expect(resolveTermsText('0')).not.toMatch(/sous 0 jour/);
  });

  it('days30 → « sous 30 jours »', () => {
    expect(resolveTermsText('days30')).toMatch(/sous 30 jours/);
  });

  it('days15 → « sous 15 jours »', () => {
    expect(resolveTermsText('days15')).toMatch(/sous 15 jours/);
  });

  it('days45 / days60 → bons délais', () => {
    expect(resolveTermsText('days45')).toMatch(/sous 45 jours/);
    expect(resolveTermsText('days60')).toMatch(/sous 60 jours/);
  });

  it('legacy numérique "30" → « sous 30 jours » (rétrro-compat)', () => {
    expect(resolveTermsText('30')).toMatch(/sous 30 jours/);
  });

  it('end_of_month → « fin du mois » (jamais « sous 0 jours »)', () => {
    const text = resolveTermsText('end_of_month');
    expect(text).toMatch(/fin du mois/i);
    expect(text).not.toMatch(/sous 0 jour/);
  });

  it('end_of_month_30 → « 30 jours après la fin du mois »', () => {
    expect(resolveTermsText('end_of_month_30')).toMatch(/30 jours après la fin du mois/i);
  });

  it('end_of_next_month → « fin du mois suivant »', () => {
    expect(resolveTermsText('end_of_next_month')).toMatch(/fin du mois suivant/i);
  });

  it('custom-45 → « sous 45 jours »', () => {
    expect(resolveTermsText('custom-45')).toMatch(/sous 45 jours/);
  });

  it('null / undefined → null (l\'appelant replie sur le défaut profil)', () => {
    expect(resolveTermsText(null)).toBeNull();
    expect(resolveTermsText(undefined)).toBeNull();
  });

  it('tout terme rendu contient l\'indemnité forfaitaire 40 € (art. L.441-6)', () => {
    // Le bloc légal complet doit accompagner chaque délai facture/acompte.
    expect(resolveTermsText('days30')).toMatch(/40 €/);
    expect(resolveTermsText('days30')).toMatch(/L\.441-6/i);
  });
});

describe('parseStoredTerm — reverse-map pour l\'hydratation (édition)', () => {
  it('reception / "" / "0" → days 0, termId reception', () => {
    expect(parseStoredTerm('reception')).toEqual({ days: 0, termId: 'reception' });
    expect(parseStoredTerm('')).toEqual({ days: 0, termId: 'reception' });
    expect(parseStoredTerm('0')).toEqual({ days: 0, termId: 'reception' });
  });

  it('days15 / days30 / days45 / days60 → bons days + termId', () => {
    expect(parseStoredTerm('days15')).toEqual({ days: 15, termId: 'days15' });
    expect(parseStoredTerm('days30')).toEqual({ days: 30, termId: 'days30' });
    expect(parseStoredTerm('days45')).toEqual({ days: 45, termId: 'days45' });
    expect(parseStoredTerm('days60')).toEqual({ days: 60, termId: 'days60' });
  });

  it('legacy numérique "45" → days 45, termId canonique days45', () => {
    // Les valeurs canoniques (15/30/45/60) mappent vers le termId standard,
    // pas custom-N. Seules les valeurs non-canoniques deviennent custom-N.
    expect(parseStoredTerm('45')).toEqual({ days: 45, termId: 'days45' });
  });

  it('legacy numérique non-canonique "21" → days 21, termId custom-21', () => {
    expect(parseStoredTerm('21')).toEqual({ days: 21, termId: 'custom-21' });
  });

  it('fin de mois → days/termId préservés', () => {
    expect(parseStoredTerm('end_of_month')).toEqual({ days: 0, termId: 'end_of_month' });
    expect(parseStoredTerm('end_of_month_30')).toEqual({ days: 30, termId: 'end_of_month_30' });
    expect(parseStoredTerm('end_of_next_month')).toEqual({ days: 0, termId: 'end_of_next_month' });
  });

  it('custom-21 → days 21, termId custom-21', () => {
    expect(parseStoredTerm('custom-21')).toEqual({ days: 21, termId: 'custom-21' });
  });

  it('null / undefined → défaut sûr 30 jours (vieille facture pré-colonne)', () => {
    expect(parseStoredTerm(null)).toEqual({ days: 30, termId: 'days30' });
    expect(parseStoredTerm(undefined)).toEqual({ days: 30, termId: 'days30' });
  });
});
