/**
 * QuickCreate — Event bus pour le Bottom Sheet de création rapide
 *
 * Le FAB dans BottomTabBar émet un événement.
 * La page Invoices l'écoute et ouvre le QuickCreateSheet.
 * Ceci évite de propager un état à travers le layout.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function emitQuickCreate() {
  listeners.forEach((fn) => fn());
}

export function onQuickCreate(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
