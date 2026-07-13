import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * CIBLE 2 — Lexique métier pour la correction contextuelle STT.
 *
 * Le problème : Groq Whisper (STT) confond les homophones français de métier
 * ("fiche de paie" → "fiche de paix", "contrat" → "contrar", "DSN" → "d n").
 * Ce lexique est utilisé à deux niveaux :
 *   - Couche 0 (pré-erreur) : injecté comme `prompt` dans l'appel Whisper pour
 *     biaiser la reconnaissance vers les termes métier AVANT que l'erreur se produise.
 *   - Couche 1 (post-STT déterministe) : corrige les homophones restants via
 *     `applyDeterministicCorrection` dans ./stt-correction.
 */

// Termes métier que Whisper doit privilégier (couche 0 + référence de correction).
export const DOMAIN_HOTWORDS: string[] = [
  'fiche de paie', 'bulletin de paie', 'paie', 'salaires', 'salarié', 'salariés',
  'facture', 'devis', 'avoir', 'note de crédit', 'bon de commande', 'bon de livraison',
  'facture d\'acompte', 'acompte', 'solde', 'relance', 'échéance', 'note de frais',
  'contrat', 'contrat de travail', 'CDD', 'CDI', 'avenant', 'période d\'essai',
  'DSN', 'DPAE', 'URSSAF', 'TVA', 'HT', 'TTC', 'TTC',
  'sécurité sociale', 'numéro de sécurité sociale', 'SIRET', 'SIREN', 'IBAN', 'RIB',
  'mission', 'lettre de mission', 'honoraire', 'honoraires',
  'convention collective', 'classification', 'taux horaire', 'heures hebdomadaires',
];

/**
 * Carte d'homophones / confusables (couche 1 déterministe).
 * Clé = forme erronée normalisée (NFD, minuscules, sans accents).
 * Valeur = forme correcte à substituer.
 * Appliquée sur des frontières de mots pour ne pas clobber des sous-chaînes.
 */
export const HOMOPHONE_MAP: Record<string, string> = {
  'paix': 'paie',
  'fiche de paix': 'fiche de paie',
  'fiches de paix': 'fiches de paie',
  'bulletin de paix': 'bulletin de paie',
  'bulletins de paix': 'bulletins de paie',
  'contrar': 'contrat',
  'contrars': 'contrats',
  'd n': 'DSN',
  'd p a e': 'DPAE',
  'urssaf': 'URSSAF',
  'siret': 'SIRET',
  'siren': 'SIREN',
};

export interface UserCorrection {
  field: string;
  original_value: string;
  corrected_value: string;
}

export interface HotwordsResult {
  /** Termes à injecter dans le `prompt` Whisper (couche 0). */
  hotwords: string[];
  /** Corrections passées de l'utilisateur (mémoire vocale) — réappliquées globalement (couche 1). */
  corrections: UserCorrection[];
}

/**
 * Récupère les hotwords d'un utilisateur :
 *   - lexique métier (toujours),
 *   - corrections passées (table voice_corrections) → hotwords + corrections déterministes,
 *   - noms des salariés (table employees via firm_members) → hotwords.
 *
 * Tout est best-effort : si une table/colonne manque, on skippe silencieusement.
 */
export async function getUserHotwords(
  supabase: SupabaseClient,
  userId: string,
): Promise<HotwordsResult> {
  const hotwords = new Set<string>(DOMAIN_HOTWORDS);
  const corrections: UserCorrection[] = [];

  // 1) Corrections passées de l'utilisateur (mémoire vocale)
  try {
    const { data: corrs } = await supabase
      .from('voice_corrections')
      .select('field, original_value, corrected_value')
      .eq('user_id', userId);
    for (const c of (corrs || []) as UserCorrection[]) {
      if (c.original_value && c.corrected_value) {
        hotwords.add(String(c.corrected_value));
        corrections.push({
          field: c.field,
          original_value: String(c.original_value),
          corrected_value: String(c.corrected_value),
        });
      }
    }
  } catch {
    // Table absente ou RLS — non critique.
  }

  // 2) Noms des salariés (via firm_members → employees)
  try {
    const { data: memberships } = await supabase
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', userId);
    const firmIds = (memberships || []).map((m: any) => m.firm_id).filter(Boolean);
    if (firmIds.length) {
      const { data: emps } = await supabase
        .from('employees')
        .select('nom, prenom, poste')
        .in('firm_id', firmIds)
        .limit(60);
      for (const e of (emps || []) as Array<{ nom: string | null; prenom: string | null; poste: string | null }>) {
        const first = e.prenom?.trim();
        const last = e.nom?.trim();
        if (first) hotwords.add(first);
        if (last) hotwords.add(last);
        if (first && last) hotwords.add(`${first} ${last}`);
      }
    }
  } catch {
    // Non critique — les noms de salariés sont un bonus.
  }

  return { hotwords: Array.from(hotwords), corrections };
}

/** Construit la chaîne `prompt` pour l'appel Whisper (capped pour rester efficace). */
export function buildWhisperPrompt(hotwords: string[]): string | undefined {
  if (!hotwords.length) return undefined;
  return hotwords.slice(0, 80).join(' ').slice(0, 600);
}
