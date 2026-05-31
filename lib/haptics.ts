/**
 * Haptics — Retour tactile pour les interactions clés
 *
 * Utilise la Vibration API native. Sur iOS Safari, cette API
 * n'existe pas, donc on vérifie silencieusement.
 *
 * Styles :
 * - light    (10ms)  : tap sur un bouton, ouverture de menu
 * - medium   (25ms)  : confirmation d'action, ouverture de bottom sheet
 * - heavy    (50ms)  : actions importantes (suppression, paiement)
 * - success  [10,50,10] : feedback de succès (création, envoi)
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success';

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
};

/**
 * Déclenche une vibration haptique si l'API est disponible.
 * Sécurisé : ne crash jamais sur les navigateurs non-supportés.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(patterns[style]);
  } catch {
    // Silently ignore — some browsers throw in certain contexts
  }
}
