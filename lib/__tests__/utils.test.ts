/**
 * Tests des fonctions utilitaires
 *
 * Teste les fonctions de formatage et de validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatFrenchDate,
  formatTime,
  cn,
  getInitials,
  validateSiret,
  validateVatNumber,
  CURRENCIES,
  SECTORS,
  LEGAL_STATUSES,
  ACCENT_COLORS,
  DOC_LABELS,
} from '../utils';

describe('Fonctions de formatage de devise', () => {
  it('devrait formater en euros par défaut', () => {
    expect(formatCurrency(1000)).toBe('1 000,00 €');
    expect(formatCurrency(0)).toBe('0,00 €');
    expect(formatCurrency(1234.56)).toBe('1 234,56 €');
  });

  it('devrait formater dans différentes devises', () => {
    expect(formatCurrency(1000, 'USD', 'en-US')).toBe('$1,000.00');
    expect(formatCurrency(1000, 'GBP', 'en-GB')).toBe('£1,000.00');
    expect(formatCurrency(1000, 'JPY', 'ja-JP')).toBe('¥1,000');
  });

  it('devrait gérer les nombres négatifs', () => {
    expect(formatCurrency(-100)).toContain('-');
    expect(formatCurrency(-50.5)).toContain('-');
  });

  it('devrait gérer les grands nombres', () => {
    expect(formatCurrency(1000000)).toContain('000');
    expect(formatCurrency(999999.99)).toContain('999');
  });
});

describe('Fonctions de formatage de date', () => {
  it('devrait formater une date en français', () => {
    expect(formatDate('2024-01-15')).toBe('15 janvier 2024');
    expect(formatDate('2024-12-25')).toBe('25 décembre 2024');
  });

  it('devrait formater une date en version courte', () => {
    expect(formatDateShort('2024-01-15')).toBe('15/01/2024');
    expect(formatDateShort('2024-12-25')).toBe('25/12/2024');
  });

  it('devrait formater une date française', () => {
    expect(formatFrenchDate(2024, 0, 15)).toBe('15 janvier 2024');
    expect(formatFrenchDate(2024, 11, 25)).toBe('25 décembre 2024');
    expect(formatFrenchDate(2024, 5, 10)).toBe('10 juin 2024');
  });

  it('devrait gérer les dates invalides', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
});

describe('Fonction de formatage d\'heure', () => {
  it('devrait formater une heure', () => {
    expect(formatTime('14:30')).toBe('14h30');
    expect(formatTime('09:05')).toBe('9h5');
    expect(formatTime('23:59')).toBe('23h59');
  });

  it('devrait gérer les heures invalides', () => {
    expect(formatTime('invalid')).toBe('NaNhNaN');
  });
});

describe('Fonction de concaténation de classes', () => {
  it('devrait concaténer des classes', () => {
    expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
  });

  it('devrait filtrer les valeurs falsy', () => {
    expect(cn('class1', null, 'class2', undefined, false, 'class3')).toBe('class1 class2 class3');
  });

  it('devrait gérer les chaînes vides', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });

  it('devrait retourner une chaîne vide si aucune classe valide', () => {
    expect(cn(null, undefined, false, '')).toBe('');
  });
});

describe('Fonction d\'initiales', () => {
  it('devrait extraire les initiales', () => {
    expect(getInitials('Jean Dupont')).toBe('JD');
    expect(getInitials('Marie Curie')).toBe('MC');
  });

  it('devrait limiter à 2 caractères', () => {
    expect(getInitials('Jean Pierre Marie Dupont')).toBe('JP');
    expect(getInitials('A B C D')).toBe('AB');
  });

  it('devrait mettre en majuscules', () => {
    expect(getInitials('jean dupont')).toBe('JD');
    expect(getInitials('marie curie')).toBe('MC');
  });

  it('devrait gérer les noms avec un seul mot', () => {
    expect(getInitials('Jean')).toBe('J');
  });

  it('devrait gérer les noms avec des espaces multiples', () => {
    expect(getInitials('Jean  Dupont')).toBe('JD');
  });
});

describe('Validation SIRET', () => {
  it('devrait valider un SIRET correct', () => {
    expect(validateSiret('12345678900012')).toBe(true);
    expect(validateSiret('123 456 789 00012')).toBe(true);
    expect(validateSiret('123 456 789 00 012')).toBe(true);
  });

  it('devrait rejeter un SIRET incorrect', () => {
    expect(validateSiret('123456789')).toBe(false);
    expect(validateSiret('123456789000123')).toBe(false);
    expect(validateSiret('abcdefghij0001')).toBe(false);
  });

  it('devrait accepter un SIRET vide', () => {
    expect(validateSiret('')).toBe(true);
    expect(validateSiret(undefined as any)).toBe(true);
  });
});

describe('Validation numéro de TVA', () => {
  it('devrait valider un numéro de TVA correct', () => {
    expect(validateVatNumber('FR12345678901')).toBe(true);
    expect(validateVatNumber('DE 123 456 789')).toBe(true);
    expect(validateVatNumber('GB123456789')).toBe(true);
  });

  it('devrait rejeter un numéro de TVA incorrect', () => {
    expect(validateVatNumber('123456789')).toBe(false);
    expect(validateVatNumber('FR')).toBe(false);
    expect(validateVatNumber('FR123')).toBe(false);
    expect(validateVatNumber('fr12345678901')).toBe(false);
  });

  it('devrait accepter un numéro de TVA vide', () => {
    expect(validateVatNumber('')).toBe(true);
    expect(validateVatNumber(undefined as any)).toBe(true);
  });
});

describe('Constantes', () => {
  it('devrait avoir les bonnes devises', () => {
    expect(CURRENCIES.length).toBeGreaterThan(0);
    expect(CURRENCIES[0]).toEqual({ code: 'EUR', label: 'Euro (€)', symbol: '€' });
    expect(CURRENCIES.some(c => c.code === 'USD')).toBe(true);
  });

  it('devrait avoir les bons secteurs', () => {
    expect(SECTORS.length).toBeGreaterThan(0);
    expect(SECTORS).toContain('Bâtiment & Travaux');
    expect(SECTORS).toContain('Informatique & Tech');
    expect(SECTORS).toContain('Autre');
  });

  it('devrait avoir les bons statuts légaux', () => {
    expect(LEGAL_STATUSES.length).toBeGreaterThan(0);
    expect(LEGAL_STATUSES[0]).toEqual({ value: 'auto-entrepreneur', label: 'Auto-entrepreneur' });
  });

  it('devrait avoir les bonnes couleurs d\'accent', () => {
    expect(ACCENT_COLORS.length).toBeGreaterThan(0);
    expect(ACCENT_COLORS[0]).toBe('#1D9E75');
  });

  it('devrait avoir les bons labels de documents', () => {
    expect(DOC_LABELS.invoice).toBe('Facture');
    expect(DOC_LABELS.quote).toBe('Devis');
    expect(DOC_LABELS.credit_note).toBe('Avoir');
  });
});
