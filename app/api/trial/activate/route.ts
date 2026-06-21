import { NextRequest, NextResponse } from 'next/server';

/**
 * GUARDIAN (CIBLE 4) — Route NEUTRALISÉE.
 *
 * Ancien essai "cardless" (sans carte). Il permettait de créer des essais gratuits à
 * l'infini (nouvel email = nouvel essai, aucune carte liée) → gouffre anti-fraude.
 *
 * Désormais, l'essai exige une carte bancaire via /api/stripe/trial-subscription :
 *   • SetupIntent 0€ (rien n'est débité pendant l'essai),
 *   • activation uniquement au webhook setup_intent.succeeded,
 *   • déduplication d'empreinte carte (trial_card_fingerprint) → même carte = un seul essai.
 *
 * Cette route refuse toute activation (410 Gone) pour fermer définitivement la faille.
 * Elle reste présente pour renvoyer un message clair à tout client obsolète.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "L'essai gratuit requiert désormais une carte bancaire (0 € débité). " +
        "Utilisez le bouton d'essai du paywall — la carte est vérifiée via Stripe et protégée contre la réutilisation.",
      code: 'TRIAL_CARD_REQUIRED',
    },
    { status: 410 },
  );
}
