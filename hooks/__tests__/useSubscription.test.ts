/**
 * Tests du hook useSubscription
 *
 * Teste la logique de gestion des abonnements et des limites
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubscription } from '../useSubscription';

// Mock du store d'authentification.
// OVERLORD : le hook lit `useAuthStore((s) => s.profile)` (sélecteur). Le mock
// doit donc HONORER le sélecteur et non renvoyer l'état brut. On passe par un
// objet `mock`*-préfixé (autorisé par le hoisting vitest) muté à chaque test.
const mockAuthState: { profile: Record<string, unknown> | null } = { profile: null };

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
  ),
}));

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.profile = null;
  });

  describe('Détermination du tier d\'abonnement', () => {
    it('devrait identifier un utilisateur free', () => {
      mockAuthState.profile = {
        subscription_tier: 'free',
        is_trial_active: false,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isFree).toBe(true);
      expect(result.current.isTrial).toBe(false);
      expect(result.current.isPro).toBe(false);
      expect(result.current.isBusiness).toBe(false);
    });

    it('devrait traiter un utilisateur solo legacy comme pro', () => {
      mockAuthState.profile = {
        subscription_tier: 'solo',
        is_trial_active: false,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isFree).toBe(false);
      expect(result.current.effectiveTier).toBe('pro');
      expect(result.current.effectiveIsPro).toBe(true);
    });

    it('devrait identifier un utilisateur pro', () => {
      mockAuthState.profile = {
        subscription_tier: 'pro',
        is_trial_active: false,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isFree).toBe(false);
      expect(result.current.isPro).toBe(true);
      expect(result.current.isBusiness).toBe(false);
      expect(result.current.effectiveIsPro).toBe(true);
    });

    it('devrait identifier un utilisateur business', () => {
      mockAuthState.profile = {
        subscription_tier: 'business',
        is_trial_active: false,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isFree).toBe(false);
      expect(result.current.isProOrAbove).toBe(true);
      expect(result.current.isBusiness).toBe(true);
      expect(result.current.effectiveIsBusiness).toBe(true);
    });

    it('devrait identifier un utilisateur en essai comme pro', () => {
      mockAuthState.profile = {
        subscription_tier: 'free',
        is_trial_active: true,
        trial_end_date: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isTrial).toBe(true);
      expect(result.current.isTrialActive).toBe(true);
      expect(result.current.effectiveTier).toBe('pro');
      expect(result.current.effectiveIsPro).toBe(true);
    });
  });

  describe('Calcul du temps d\'essai restant', () => {
    it('devrait calculer le temps restant correctement', () => {
      // 2j 3h 45min + 30s de marge pour éviter le flaku de timing au passage de minute
      const futureDate = new Date(Date.now() + 2 * 86400000 + 3 * 3600000 + 45 * 60000 + 30000);
      mockAuthState.profile = {
        subscription_tier: 'free',
        is_trial_active: true,
        trial_end_date: futureDate.toISOString(),
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.trialRemaining).not.toBeNull();
      expect(result.current.trialRemaining?.days).toBe(2);
      expect(result.current.trialRemaining?.hours).toBe(3);
      expect(result.current.trialRemaining?.minutes).toBe(45);
    });

    it('devrait retourner null si l\'essai est terminé', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      mockAuthState.profile = {
        subscription_tier: 'free',
        is_trial_active: true,
        trial_end_date: pastDate.toISOString(),
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.trialRemaining).toBeNull();
    });

    it('devrait retourner null si aucun essai n\'est actif', () => {
      mockAuthState.profile = {
        subscription_tier: 'free',
        is_trial_active: false,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.trialRemaining).toBeNull();
    });
  });

  describe('Capacités des fonctionnalités', () => {
    it('devrait autoriser la voix pour pro et business', () => {
      mockAuthState.profile = { subscription_tier: 'pro' };
      const { result: proResult } = renderHook(() => useSubscription());
      expect(proResult.current.canUseVoice).toBe(true);

      mockAuthState.profile = { subscription_tier: 'business' };
      const { result: businessResult } = renderHook(() => useSubscription());
      expect(businessResult.current.canUseVoice).toBe(true);
    });

    it('devrait autoriser la voix pour free (LOI 3 : illimitée)', () => {
      mockAuthState.profile = { subscription_tier: 'free', is_trial_active: false };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canUseVoice).toBe(true);
    });

    it('devrait autoriser les templates personnalisés pour pro et business', () => {
      mockAuthState.profile = { subscription_tier: 'pro' };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canUseCustomTemplate).toBe(true);
    });

    it('devrait refuser les templates personnalisés pour free', () => {
      mockAuthState.profile = { subscription_tier: 'free', is_trial_active: false };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canUseCustomTemplate).toBe(false);
    });
  });

  describe('Limites de factures', () => {
    it('devrait limiter à 3 factures pour free', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      mockAuthState.profile = {
        subscription_tier: 'free',
        invoice_month: currentMonth,
        monthly_invoice_count: 1,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.maxInvoices).toBe(3);
      expect(result.current.invoiceCount).toBe(1);
      expect(result.current.invoicesRemaining).toBe(2);
      expect(result.current.isAtLimit).toBe(false);
    });

    it('devrait indiquer que la limite est atteinte', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      mockAuthState.profile = {
        subscription_tier: 'free',
        invoice_month: currentMonth,
        monthly_invoice_count: 3,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isAtLimit).toBe(true);
      expect(result.current.invoicesRemaining).toBe(0);
    });

    it('devrait avoir des factures illimitées pour pro', () => {
      mockAuthState.profile = { subscription_tier: 'pro' };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.maxInvoices).toBe(Infinity);
      expect(result.current.invoicesRemaining).toBeNull();
    });

    it('devrait réinitialiser le compte si le mois a changé', () => {
      const lastMonth = '2024-01';
      mockAuthState.profile = {
        subscription_tier: 'free',
        invoice_month: lastMonth,
        monthly_invoice_count: 3,
      };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.invoiceCount).toBe(0);
      expect(result.current.isAtLimit).toBe(false);
    });
  });

  describe('Limites de workspaces', () => {
    it('devrait autoriser 1 workspace pour free', () => {
      mockAuthState.profile = { subscription_tier: 'free' };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.maxWorkspaces).toBe(1);
      expect(result.current.canCreateWorkspace(0)).toBe(true);
      expect(result.current.canCreateWorkspace(1)).toBe(false);
    });

    it('devrait autoriser 1 workspace pour pro', () => {
      mockAuthState.profile = { subscription_tier: 'pro' };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.maxWorkspaces).toBe(1);
      expect(result.current.canCreateWorkspace(0)).toBe(true);
      expect(result.current.canCreateWorkspace(1)).toBe(false);
    });

    it('devrait autoriser 1 workspace pour business', () => {
      mockAuthState.profile = { subscription_tier: 'business' };

      const { result } = renderHook(() => useSubscription());

      expect(result.current.maxWorkspaces).toBe(1);
      expect(result.current.canCreateWorkspace(0)).toBe(true);
      expect(result.current.canCreateWorkspace(1)).toBe(false);
    });
  });
});
