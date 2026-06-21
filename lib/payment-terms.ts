// ─────────────────────────────────────────────────────────────────────────────
// PROMETHEUS (CIBLE 1) — Résolveur unique des conditions de paiement.
//
// Bug racine « toujours 30 jours » : la colonne invoices.payment_terms
// n'existait pas en base, donc le terme choisi par l'utilisateur n'était jamais
// persisté/lu (repli sur profiles.payment_terms = '30'). On persiste désormais
// le termId SÉMANTIQUE (reception / days15 / days30 / days45 / days60 /
// end_of_month / end_of_month_30 / end_of_next_month / custom-N), ce qui permet
// d'exprimer les 8 options du sélecteur — y compris les fins de mois, qu'un
// simple nombre de jours ne pouvait pas représenter.
//
// Ce module est la source de vérité partagée entre :
//   • le PDF (lib/pdf-server.ts)        — resolveTermsText → phrase FR
//   • l'hydratation édition (store)     — parseStoredTerm  → { days, termId }
// Les anciennes valeurs numériques ("0"…"60") restent acceptées (rétro-compat).
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_BOILERPLATE =
  " En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 € sera appliquée, conformément à l'article L.441-6 du Code de commerce. Les pénalités de retard sont calculées sur la base de trois fois le taux d'intérêt légal en vigueur. Tout litige relatif à la présente facture sera soumis à la compétence exclusive du Tribunal de Commerce du siège social du prestataire. L'acceptation de la présente facture vaut accord sur les conditions générales de vente.";

function leadForDays(n: number): string {
  if (n <= 0) return "Paiement à réception de la présente facture.";
  return `Paiement sous ${n} jours à réception de la présente facture.`;
}

/**
 * Traduit une valeur persistée (termId sémantique, ou legacy numérique, ou '')
 * en phrase française complète (+ bloc légal indemnité/pénalités/CGV).
 *
 * Retourne null si la valeur est null/undefined ou inconnue : l'appelant
 * décide alors du repli (par ex. profiles.payment_terms). Une chaîne vide
 * signifie « à réception » choisi explicitement (pas un repli).
 */
export function resolveTermsText(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const s = String(stored).trim();

  let lead: string | null = null;
  switch (s) {
    case '':
    case 'reception':
    case '0':
      lead = "Paiement à réception de la présente facture.";
      break;
    case 'days15': case '15': lead = leadForDays(15); break;
    case 'days30': case '30': lead = leadForDays(30); break;
    case 'days45': case '45': lead = leadForDays(45); break;
    case 'days60': case '60': lead = leadForDays(60); break;
    case 'end_of_month':
      lead = "Paiement à la fin du mois en cours.";
      break;
    case 'end_of_month_30':
      lead = "Paiement 30 jours après la fin du mois en cours.";
      break;
    case 'end_of_next_month':
      lead = "Paiement à la fin du mois suivant.";
      break;
    default: {
      const custom = /^custom-(\d+)$/.exec(s);
      if (custom) {
        lead = leadForDays(parseInt(custom[1], 10));
      } else if (/^\d+$/.test(s)) {
        lead = leadForDays(parseInt(s, 10));
      }
      // sinon : lead reste null → inconnu → l'appelant replie.
    }
  }

  if (lead == null) return null;
  return lead + LEGAL_BOILERPLATE;
}

/**
 * Reverse-map d'une valeur persistée vers { days, termId } pour ré-hydrater
 * le sélecteur en édition. Les anciennes factures (pré-colonne, valeur null)
 * retombent sur le défaut sûr 30 jours.
 */
export function parseStoredTerm(
  stored: string | null | undefined,
): { days: number; termId: string } {
  if (stored == null) return { days: 30, termId: 'days30' };
  const s = String(stored).trim();

  switch (s) {
    case '':
    case 'reception':
    case '0':
      return { days: 0, termId: 'reception' };
    case 'days15': case '15': return { days: 15, termId: 'days15' };
    case 'days30': case '30': return { days: 30, termId: 'days30' };
    case 'days45': case '45': return { days: 45, termId: 'days45' };
    case 'days60': case '60': return { days: 60, termId: 'days60' };
    case 'end_of_month': return { days: 0, termId: 'end_of_month' };
    case 'end_of_month_30': return { days: 30, termId: 'end_of_month_30' };
    case 'end_of_next_month': return { days: 0, termId: 'end_of_next_month' };
    default: {
      const custom = /^custom-(\d+)$/.exec(s);
      if (custom) {
        const n = parseInt(custom[1], 10);
        return { days: n, termId: `custom-${n}` };
      }
      if (/^\d+$/.test(s)) {
        const n = parseInt(s, 10);
        if (n <= 0) return { days: 0, termId: 'reception' };
        return { days: n, termId: `custom-${n}` };
      }
      return { days: 30, termId: 'days30' };
    }
  }
}
