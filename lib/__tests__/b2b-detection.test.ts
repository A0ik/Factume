import { describe, it, expect } from 'vitest';
import { isInvoiceB2B } from '../tva-validator';

/**
 * ATELIER (e-invoicing) — Source de vérité unique pour « cette facture doit-elle
 * être transmise via SuperPDP /invoices ? ». RÈGLE : B2B uniquement (client
 * assujetti = SIRET ou identifiants d'entreprise). Le B2C (particulier) n'est jamais
 * transmis (e-reporting à part). Ces tests verrouillent la gate contre les
 * régressions (le bug d'origine : client_type 'business' du flux voix ne matchait
 * pas la gate '=== b2b', et le B2C vocal 'individual' n'était pas sauté).
 */
describe('isInvoiceB2B — détection B2B (e-invoicing)', () => {
  it('détecte B2B via SIRET client (14 chiffres)', () => {
    expect(isInvoiceB2B({ client: { siret: '12345678900012', name: 'Acme' } })).toBe(true);
  });

  it('détecte B2B via client_siret dénormalisé', () => {
    expect(isInvoiceB2B({ client_siret: '98765432100000', client: { name: 'Client SAS' } })).toBe(true);
  });

  it('détecte B2B via indicateur de raison sociale (SARL/SAS/EI…)', () => {
    expect(isInvoiceB2B({ client: { name: 'Dupont SARL', address: 'Lyon' } })).toBe(true);
  });

  it('détecte B2C (particulier : ni SIRET ni indicateur d\'entreprise)', () => {
    expect(isInvoiceB2B({ client: { name: 'Jean Dupont' } })).toBe(false);
    expect(isInvoiceB2B({ client_name_override: 'Marie Martin' })).toBe(false);
  });

  it('respecte le fast-path client_type explicite (flux voix)', () => {
    // Le flux voix pose 'business' (B2B) ou 'individual' (B2C) — pas 'b2b'/'b2c'.
    expect(isInvoiceB2B({ client_type: 'business' })).toBe(true);
    expect(isInvoiceB2B({ client_type: 'individual' })).toBe(false);
    // Valeurs canoniques aussi.
    expect(isInvoiceB2B({ client_type: 'b2b' })).toBe(true);
    expect(isInvoiceB2B({ client_type: 'b2c' })).toBe(false);
  });

  it('est robuste aux données manquantes (conservateur = pas B2B)', () => {
    expect(isInvoiceB2B(null)).toBe(false);
    expect(isInvoiceB2B(undefined)).toBe(false);
    expect(isInvoiceB2B({})).toBe(false);
    expect(isInvoiceB2B({ client: null })).toBe(false);
  });
});
