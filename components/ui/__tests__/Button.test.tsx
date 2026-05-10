/**
 * Tests du composant Button
 *
 * Teste le rendu et les interactions du bouton
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Composant Button', () => {
  describe('Rendu de base', () => {
    it('devrait rendre un bouton avec du texte', () => {
      render(<Button>Cliquez-moi</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Cliquez-moi');
    });

    it('devrait appliquer les classes de base', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });

    it('devrait être activé par défaut', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Variants', () => {
    it('devrait appliquer le variant primary par défaut', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');
      expect(screen.getByRole('button')).toHaveClass('text-white');
    });

    it('devrait appliquer le variant secondary', () => {
      render(<Button variant="secondary">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-100');
    });

    it('devrait appliquer le variant outline', () => {
      render(<Button variant="outline">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-2');
      expect(screen.getByRole('button')).toHaveClass('border-primary');
    });

    it('devrait appliquer le variant ghost', () => {
      render(<Button variant="ghost">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-600');
    });

    it('devrait appliquer le variant danger', () => {
      render(<Button variant="danger">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-red-500');
      expect(screen.getByRole('button')).toHaveClass('text-white');
    });
  });

  describe('Tailles', () => {
    it('devrait appliquer la taille md par défaut', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-sm');
    });

    it('devrait appliquer la taille sm', () => {
      render(<Button size="sm">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-sm');
      expect(screen.getByRole('button')).toHaveClass('px-3');
      expect(screen.getByRole('button')).toHaveClass('py-1.5');
    });

    it('devrait appliquer la taille lg', () => {
      render(<Button size="lg">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-base');
      expect(screen.getByRole('button')).toHaveClass('px-6');
      expect(screen.getByRole('button')).toHaveClass('py-3');
    });
  });

  describe('États', () => {
    it('devrait être désactivé quand disabled est true', () => {
      render(<Button disabled>Test</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('devrait être désactivé quand loading est true', () => {
      render(<Button loading>Test</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('devrait afficher un spinner quand loading est true', () => {
      render(<Button loading>Chargement</Button>);
      const button = screen.getByRole('button');
      expect(button).toContainHTML('svg');
      expect(button.querySelector('svg')).toHaveClass('animate-spin');
    });

    it('devrait ne pas afficher l\'icône quand loading est true', () => {
      render(
        <Button loading icon={<span data-testid="icon">Icon</span>}>
          Test
        </Button>
      );
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });
  });

  describe('Icônes', () => {
    it('devrait afficher une icône', () => {
      render(
        <Button icon={<span data-testid="icon">Icon</span>}>Test</Button>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('devrait placer l\'icône avant le texte', () => {
      render(
        <Button icon={<span data-testid="icon">Icon</span>}>Test</Button>
      );
      const button = screen.getByRole('button');
      expect(button.firstChild).toEqual(screen.getByTestId('icon'));
    });
  });

  describe('Classes personnalisées', () => {
    it('devrait appliquer des classes personnalisées', () => {
      render(<Button className="custom-class">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('devrait fusionner les classes correctement', () => {
      render(
        <Button variant="secondary" className="custom-class">
          Test
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Accessibilité', () => {
    it('devrait avoir les attributs ADR appropriés', () => {
      render(<Button aria-label="Bouton de test">Test</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Bouton de test');
    });

    it('devrait avoir la classe focus:ring pour l\'accessibilité', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('focus:outline-none');
      expect(screen.getByRole('button')).toHaveClass('focus:ring-2');
    });
  });

  describe('Interactions', () => {
    it('devrait appeler onClick quand cliqué', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Cliquez-moi</Button>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('devrait ne pas appeler onClick quand désactivé', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Cliquez-moi
        </Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('devrait ne pas appeler onClick quand loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} loading>
          Cliquez-moi
        </Button>
      );

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Props HTML standard', () => {
    it('devrait passer les props HTML standard', () => {
      render(
        <Button type="submit" name="test" value="value">
          Test
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'test');
      expect(button).toHaveAttribute('value', 'value');
    });

    it('devrait avoir le type button par défaut', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });
});
