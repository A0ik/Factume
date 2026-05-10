/**
 * Tests de la page Clients
 *
 * Teste le rendu et les fonctionnalités de la page de gestion des clients
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientsPage from '../page';

// Mock des dépendances
vi.mock('@/stores/dataStore', () => ({
  useDataStore: vi.fn(() => ({
    clients: [
      {
        id: 'client-1',
        name: 'Client Test SARL',
        email: 'client@test.com',
        siret: '12345678900012',
        vat_number: 'FR12345678901',
        address: '123 Rue du Test',
        postal_code: '75001',
        city: 'Paris',
        country: 'FR',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    ],
    loading: false,
    fetchClients: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/clients'),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Page Clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendu initial', () => {
    it('devrait rendre le titre de la page', () => {
      render(<ClientsPage />);
      expect(screen.getByText('Clients')).toBeInTheDocument();
    });

    it('devrait rendre le bouton de création', () => {
      render(<ClientsPage />);
      expect(screen.getByRole('button', { name: /ajouter un client/i })).toBeInTheDocument();
    });

    it('devrait rendre la barre de recherche', () => {
      render(<ClientsPage />);
      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('devrait afficher la liste des clients', () => {
      render(<ClientsPage />);
      expect(screen.getByText('Client Test SARL')).toBeInTheDocument();
    });
  });

  describe('Recherche', () => {
    it('devrait filtrer les clients par nom', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      await user.type(searchInput, 'SARL');

      await waitFor(() => {
        expect(screen.getByText('Client Test SARL')).toBeInTheDocument();
      });
    });

    it('devrait afficher un message si aucun résultat', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      await user.type(searchInput, 'Inexistant');

      await waitFor(() => {
        expect(screen.getByText(/aucun client trouvé/i)).toBeInTheDocument();
      });
    });
  });

  describe('Création de client', () => {
    it('devrait ouvrir le modal de création', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      const createButton = screen.getByRole('button', { name: /ajouter un client/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/nouveau client/i)).toBeInTheDocument();
      });
    });

    it('devrait fermer le modal lors de l\'annulation', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      // Ouvrir le modal
      const createButton = screen.getByRole('button', { name: /ajouter un client/i });
      await user.click(createButton);

      // Fermer le modal
      const cancelButton = screen.getByRole('button', { name: /annuler/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/nouveau client/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Actions sur les clients', () => {
    it('devrait afficher les actions au survol', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      const clientCard = screen.getByText('Client Test SARL').closest('div');
      if (clientCard) {
        await user.hover(clientCard);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
        });
      }
    });

    it('devrait afficher les détails du client au clic', async () => {
      const user = userEvent.setup();
      render(<ClientsPage />);

      const clientCard = screen.getByText('Client Test SARL');
      await user.click(clientCard);

      await waitFor(() => {
        expect(screen.getByText(/client test sarl/i)).toBeInTheDocument();
        expect(screen.getByText('123 Rue du Test')).toBeInTheDocument();
        expect(screen.getByText('75001 Paris')).toBeInTheDocument();
      });
    });
  });

  describe('Statistiques', () => {
    it('devrait afficher le nombre total de clients', () => {
      render(<ClientsPage />);
      expect(screen.getByText(/1 client/i)).toBeInTheDocument();
    });

    it('devrait afficher les statistiques globales', () => {
      render(<ClientsPage />);
      expect(screen.getByText(/clients/i)).toBeInTheDocument();
    });
  });

  describe('Responsive', () => {
    it('devrait être responsive', () => {
      render(<ClientsPage />);
      const container = screen.getByRole('main').parentElement;
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Accessibilité', () => {
    it('devrait avoir des rôles ARIA appropriés', () => {
      render(<ClientsPage />);
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('devrait avoir des labels accessibles', () => {
      render(<ClientsPage />);
      expect(screen.getByRole('button', { name: /ajouter un client/i })).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });
  });
});
