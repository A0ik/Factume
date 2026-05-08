/**
 * Tests de validation Factur-X
 *
 * Teste la validation et la conformité des fichiers Factur-X
 */

import { describe, it, expect } from 'vitest';
import {
  validateFacturXXml,
  isFacturXEligible,
  getFacturXInfo,
  generateFacturXXml,
} from '../facturx';
import type { Invoice, Profile } from '@/types';

// ── Fixtures de test ───────────────────────────────────────────────────────────

const validProfile: Profile = {
  id: 'test-profile',
  company_name: 'Ma Société Test',
  email: 'test@example.com',
  siret: '12345678900012',
  vat_number: 'FR12345678901',
  address: '123 Rue du Test',
  postal_code: '75001',
  city: 'Paris',
  country: 'FR',
  currency: 'EUR',
  language: 'fr',
  template_id: 1,
  accent_color: '#1D9E75',
  subscription_tier: 'pro',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validInvoice: Invoice = {
  id: 'test-invoice',
  user_id: 'test-user',
  number: 'FACT-2024-001',
  document_type: 'invoice',
  status: 'sent',
  issue_date: '2024-01-15',
  due_date: '2024-02-15',
  subtotal: 1000,
  vat_amount: 200,
  total: 1200,
  items: [
    {
      id: 'item-1',
      description: 'Prestation de service',
      quantity: 1,
      unit_price: 1000,
      vat_rate: 20,
      total: 1000,
    },
  ],
  client: {
    id: 'client-1',
    user_id: 'test-user',
    name: 'Client Test SARL',
    email: 'client@example.com',
    siret: '98765432100012',
    vat_number: 'FR98765432101',
    address: '456 Avenue Client',
    postal_code: '69001',
    city: 'Lyon',
    country: 'FR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Tests de validation XML ─────────────────────────────────────────────────────

describe('Validation Factur-X', () => {
  it('devrait valider un XML Factur-X correct', () => {
    const xml = generateFacturXXml(validInvoice, validProfile);
    const result = validateFacturXXml(xml);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('devrait détecter un XML sans déclaration', () => {
    const invalidXml = '<rsm:CrossIndustryInvoice></rsm:CrossIndustryInvoice>';
    const result = validateFacturXXml(invalidXml);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Déclaration XML manquante');
  });

  it('devrait détecter un XML sans élément racine', () => {
    const invalidXml = '<?xml version="1.0"?><some></some>';
    const result = validateFacturXXml(invalidXml);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Élément racine CrossIndustryInvoice manquant');
  });

  it('devrait détecter un ID de facture manquant', () => {
    const xmlWithMissingId = generateFacturXXml(validInvoice, validProfile)
      .replace(/<ram:ID>FACT-2024-001<\/ram:ID>/, '<ram:ID></ram:ID>');
    const result = validateFacturXXml(xmlWithMissingId);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID de facture'))).toBe(true);
  });

  it('devrait détecter une année invalide', () => {
    const xmlWithBadYear = generateFacturXXml(validInvoice, validProfile)
      .replace('20240115', '19990115');
    const result = validateFacturXXml(xmlWithBadYear);

    expect(result.warnings).toContain('Année suspecte: 1999');
  });

  it('devrait détecter un mois invalide', () => {
    const xmlWithBadMonth = generateFacturXXml(validInvoice, validProfile)
      .replace('20240115', '20241315');
    const result = validateFacturXXml(xmlWithBadMonth);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Mois invalide'))).toBe(true);
  });

  it('devrait détecter un montant total négatif', () => {
    const xmlWithNegativeTotal = generateFacturXXml(validInvoice, validProfile)
      .replace('<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>', '<ram:GrandTotalAmount>-100.00</ram:GrandTotalAmount>');
    const result = validateFacturXXml(xmlWithNegativeTotal);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Montant total invalide'))).toBe(true);
  });
});

// ── Tests d'éligibilité ─────────────────────────────────────────────────────────

describe('Éligibilité Factur-X', () => {
  it('devrait considérer une facture complète comme éligible', () => {
    const result = isFacturXEligible(validInvoice, validProfile);

    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('devrait rejeter une facture sans numéro', () => {
    const invoiceWithoutNumber = { ...validInvoice, number: '' };
    const result = isFacturXEligible(invoiceWithoutNumber, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Numéro de facture manquant');
  });

  it('devrait rejeter une facture sans date d\'émission', () => {
    const invoiceWithoutDate = { ...validInvoice, issue_date: '' };
    const result = isFacturXEligible(invoiceWithoutDate, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Date d\'émission manquante');
  });

  it('devrait rejeter une facture sans lignes', () => {
    const invoiceWithoutItems = { ...validInvoice, items: [] };
    const result = isFacturXEligible(invoiceWithoutItems, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Aucune ligne de facturation');
  });

  it('devrait rejeter une facture sans nom d\'entreprise', () => {
    const profileWithoutName = { ...validProfile, company_name: '' };
    const result = isFacturXEligible(validInvoice, profileWithoutName);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Nom de l\'entreprise manquant');
  });

  it('devrait émettre des avertissements si SIRET ou TVA manquants', () => {
    const profileWithoutInfo = { ...validProfile, siret: '', vat_number: '' };
    const result = isFacturXEligible(validInvoice, profileWithoutInfo);

    expect(result.eligible).toBe(true);
    expect(result.warnings).toContain('SIRET du vendeur manquant');
    expect(result.warnings).toContain('Numéro de TVA du vendeur manquant');
  });

  it('devrait émettre un avertissement pour un taux de TVA non standard', () => {
    const invoiceWithCustomVat: Invoice = {
      ...validInvoice,
      items: [{ ...validInvoice.items[0], vat_rate: 8.5 }],
    };
    const result = isFacturXEligible(invoiceWithCustomVat, validProfile);

    expect(result.eligible).toBe(true);
    expect(result.warnings).toContain('Taux de TVA non standard: 8.5%');
  });
});

// ── Tests des infos Factur-X ─────────────────────────────────────────────────────

describe('Informations Factur-X', () => {
  it('devrait retourner les informations Factur-X', () => {
    const info = getFacturXInfo();

    expect(info).toMatchObject({
      name: 'Factur-X',
      version: '1.0',
      profile: 'EN 16931',
    });

    expect(info.description).toBeTruthy();
    expect(info.standard).toBeTruthy();
    expect(info.validatorUrl).toContain('http');
    expect(info.documentationUrl).toContain('http');
  });

  it('devrait avoir les URLs corrects', () => {
    const info = getFacturXInfo();

    expect(info.validatorUrl).toContain('fnfe-mpe.org');
    expect(info.documentationUrl).toBe('https://fnfe-mpe.org/factur-x/');
    expect(info.dgfipGuideUrl).toContain('economie.gouv.fr');
  });
});

// ── Tests d'intégration ─────────────────────────────────────────────────────────

describe('Intégration Factur-X', () => {
  it('devrait générer et valider une facture complète', () => {
    // Génération
    const xml = generateFacturXXml(validInvoice, validProfile);
    expect(xml).toBeTruthy();

    // Validation
    const validation = validateFacturXXml(xml);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Éligibilité
    const eligibility = isFacturXEligible(validInvoice, validProfile);
    expect(eligibility.eligible).toBe(true);
  });

  it('devrait échapper correctement les caractères XML spéciaux', () => {
    const invoiceWithSpecialChars: Invoice = {
      ...validInvoice,
      number: 'FACT-2024-<001>',
      client: {
        ...validInvoice.client!,
        name: 'Café & Restaurant "L\'Étoile"',
      },
    };

    const xml = generateFacturXXml(invoiceWithSpecialChars, validProfile);

    // Vérifier que les caractères spéciaux sont échappés
    expect(xml).not.toContain('<');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });

  it('devrait gérer correctement les taux de TVA à 0%', () => {
    const invoiceWithZeroVat: Invoice = {
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          vat_rate: 0,
          total: 1000,
        },
      ],
      subtotal: 1000,
      vat_amount: 0,
      total: 1000,
    };

    const xml = generateFacturXXml(invoiceWithZeroVat, validProfile);

    expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>');
    expect(xml).toContain('<ram:RateApplicablePercent>0</ram:RateApplicablePercent>');
  });
});
