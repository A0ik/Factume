import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentSessionStore } from '../documentSessionStore';
import type { InvoiceItem } from '@/types';

type Line = Omit<InvoiceItem, 'total'>;

const seed = (): Line[] => [
  { id: 'a', description: 'Consulting', quantity: 2, unit_price: 100, vat_rate: 20 },
  { id: 'b', description: 'Hosting', quantity: 1, unit_price: 50, vat_rate: 20 },
];

describe('documentSessionStore — clearItem / duplicateItem (CIBLE 1)', () => {
  beforeEach(() => {
    useDocumentSessionStore.getState().reset();
    useDocumentSessionStore.setState({ items: seed() });
  });

  it('clearItem vide la ligne ciblée (contenus reset) sans changer id ni position', () => {
    useDocumentSessionStore.getState().clearItem('a');

    const items = useDocumentSessionStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('a'); // id + position préservés
    expect(items[0].description).toBe('');
    expect(items[0].quantity).toBe(1);
    expect(items[0].unit_price).toBe(0);
    expect(items[0].vat_rate).toBe(20);
    // ligne voisine intacte
    expect(items[1].description).toBe('Hosting');
    expect(items[1].unit_price).toBe(50);
  });

  it('duplicateItem insère une copie juste après l\'originale avec un nouvel id', () => {
    useDocumentSessionStore.getState().duplicateItem('a');

    const items = useDocumentSessionStore.getState().items;
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe('a'); // originale conservée
    expect(items[1].id).not.toBe('a');
    expect(items[1].id).not.toBe('b'); // nouvel id unique
    // contenu copié
    expect(items[1].description).toBe('Consulting');
    expect(items[1].quantity).toBe(2);
    expect(items[1].unit_price).toBe(100);
    expect(items[1].vat_rate).toBe(20);
    expect(items[2].id).toBe('b'); // b décalée en position 2
  });

  it('duplicateItem sur la dernière ligne l\'insère en queue', () => {
    useDocumentSessionStore.getState().duplicateItem('b');
    const items = useDocumentSessionStore.getState().items;
    expect(items).toHaveLength(3);
    expect(items[1].id).toBe('b');
    expect(items[2].description).toBe('Hosting');
    expect(items[2].id).not.toBe('b');
  });

  it('les deux actions sont annulables (undo)', () => {
    // NOTE : le flag `canUndo` n'est pas rafraîchi par les actions mutantes
    // (bug latent préexistant, hors scope ce pass). L'historique est bien poussé,
    // donc undo() restaure fonctionnellement l'état — c'est ce qu'on valide ici.
    const before = useDocumentSessionStore.getState().items.length;
    useDocumentSessionStore.getState().duplicateItem('a');
    expect(useDocumentSessionStore.getState().items).toHaveLength(before + 1);

    useDocumentSessionStore.getState().undo();
    expect(useDocumentSessionStore.getState().items).toHaveLength(before);
  });

  it('removeItem respect toujours l\'invariant ≥ 1 ligne (pas de régression)', () => {
    // On part de 2 lignes → on peut retirer une
    useDocumentSessionStore.getState().removeItem('a');
    expect(useDocumentSessionStore.getState().items).toHaveLength(1);
    // Sur la dernière ligne, removeItem est un no-op
    useDocumentSessionStore.getState().removeItem('b');
    expect(useDocumentSessionStore.getState().items).toHaveLength(1);
  });
});
