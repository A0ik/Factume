import { describe, it, expect } from 'vitest';
import {
  resolvePaymentLink,
  hasActivePaymentLink,
  buildFreshLinkUpdate,
  buildVoidLinkUpdate,
} from '../payment-link';

// ─────────────────────────────────────────────────────────────────────────────
// INSPECTOR (BUG 2 + BUG 3) — Le résolveur unique est la source de vérité.
// Ces tests figent le contrat : un seul endroit décide {provider, url, montant,
// stale}. Avant, 4 résolveurs divergents pouvaient afficher un QR SumUp avec un
// libellé Stripe, ou rendre un QR obsolète après édition de prix.
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePaymentLink — source de vérité unique', () => {
  it('BUG 2: lit Stripe quand payment_provider=stripe (ignore la legacy SumUp)', () => {
    const inv = {
      payment_provider: 'stripe',
      stripe_payment_url: 'https://stripe.test/session_123',
      payment_link: 'https://stripe.test/session_123',
      sumup_checkout_id: 'leftover-sumup', // résidu legacy qui induisait l'ancien code en erreur
      payment_link_amount: 100,
      payment_link_stale: false,
    };
    const r = resolvePaymentLink(inv);
    expect(r.provider).toBe('stripe');
    expect(r.url).toBe('https://stripe.test/session_123');
    expect(r.amount).toBe(100);
    expect(r.isStale).toBe(false);
  });

  it('BUG 2: lit SumUp quand payment_provider=sumup (ignore les colonnes Stripe legacy)', () => {
    const inv = {
      payment_provider: 'sumup',
      sumup_checkout_id: 'chk_abc',
      payment_link: 'https://checkout.sumup.com/chk_abc',
      stripe_payment_url: 'https://stripe.test/old', // résidu legacy non nettoyé
      stripe_payment_link_url: 'https://stripe.test/legacy_old', // résidu legacy non nettoyé
      payment_link_amount: 250,
      payment_link_stale: false,
    };
    const r = resolvePaymentLink(inv);
    expect(r.provider).toBe('sumup');
    expect(r.url).toBe('https://checkout.sumup.com/chk_abc');
    expect(r.isStale).toBe(false);
  });

  it('BUG 3: lien stale → URL vide (aucun QR obsolète jamais rendu)', () => {
    const inv = {
      payment_provider: 'stripe',
      stripe_payment_url: 'https://stripe.test/session_123', // colonne encore peuplée
      payment_link_amount: 100,
      payment_link_stale: true,
    };
    const r = resolvePaymentLink(inv);
    expect(r.isStale).toBe(true);
    expect(r.url).toBe(''); // règle monétaire absolue : pas de QR obsolète
    expect(r.provider).toBe('stripe'); // mais on garde le provider pour la régénération
  });

  it("repli legacy : ligne sans payment_provider garde l'ancienne précédence", () => {
    // Factures existantes créées avant la migration — ne doivent pas casser.
    const inv = {
      payment_provider: null,
      payment_link: 'https://checkout.sumup.com/xyz',
      sumup_checkout_id: 'xyz',
      payment_link_stale: false,
    };
    const r = resolvePaymentLink(inv);
    expect(r.url).toBe('https://checkout.sumup.com/xyz');
    expect(r.provider).toBeNull();
  });

  it('aucun lien → URL vide', () => {
    expect(resolvePaymentLink({ payment_provider: null }).url).toBe('');
  });
});

describe('hasActivePaymentLink', () => {
  it('true quand URL résolue, false quand stale', () => {
    expect(hasActivePaymentLink({ payment_provider: 'stripe', stripe_payment_url: 'u' })).toBe(true);
    expect(hasActivePaymentLink({ payment_provider: 'stripe', stripe_payment_url: 'u', payment_link_stale: true })).toBe(false);
    expect(hasActivePaymentLink({ payment_provider: null })).toBe(false);
  });
});

describe('buildFreshLinkUpdate — BUG 2 (nettoyage complet du prestataire opposé)', () => {
  it('SumUp nullifie TOUTES les colonnes Stripe y compris legacy', () => {
    const u = buildFreshLinkUpdate('sumup', { url: 'https://checkout.sumup.com/c1', amount: 199, sumupId: 'c1' });
    expect(u).toMatchObject({
      payment_provider: 'sumup',
      payment_link_amount: 199,
      payment_link_stale: false,
      payment_link: 'https://checkout.sumup.com/c1',
      sumup_checkout_id: 'c1',
      stripe_payment_url: null,
      stripe_payment_link_id: null,
      stripe_payment_link_url: null, // ← la legacy qui n'était JAMAIS nettoyée avant
    });
  });

  it('Stripe nullifie sumup_checkout_id + legacy', () => {
    const u = buildFreshLinkUpdate('stripe', { url: 'https://stripe.test/s', amount: 50 });
    expect(u).toMatchObject({
      payment_provider: 'stripe',
      payment_link_amount: 50,
      payment_link_stale: false,
      stripe_payment_url: 'https://stripe.test/s',
      payment_link: 'https://stripe.test/s',
      sumup_checkout_id: null,
      stripe_payment_link_id: null,
      stripe_payment_link_url: null,
    });
  });
});

describe('buildVoidLinkUpdate — BUG 3 (invalidation monétaire)', () => {
  it('nullifie tout, lève le drapeau stale, NE touche pas payment_provider', () => {
    const u = buildVoidLinkUpdate();
    expect(u).toMatchObject({
      payment_link: null,
      stripe_payment_url: null,
      stripe_payment_link_id: null,
      stripe_payment_link_url: null,
      sumup_checkout_id: null,
      payment_link_amount: null,
      payment_link_stale: true,
    });
    expect(u).not.toHaveProperty('payment_provider'); // conservé pour la régénération
  });
});
