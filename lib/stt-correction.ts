import { HOMOPHONE_MAP } from './voice-vocabulary';

/**
 * CIBLE 2 — Correction contextuelle post-STT.
 *
 * Pipeline hybride (validé par recherche 2026 sur la correction ASR) :
 *   - Couche 1 (déterministe) : substitue les homophones métier (paie/paix, contrar/contrat…)
 *     + réapplique les corrections passées de l'utilisateur (mémoire vocale) GLOBALEMENT
 *     (et non plus par champ). Rapide, cheap, zéro appel LLM.
 *   - Couche 2 (LLM rescoring) : invoquée UNIQUEMENT si la couche 1 détecte un token
 *     encore suspect (needsLlmRescore). Évite le coût + la latence sur chaque dictée.
 *
 * Point d'injection dans les routes : juste après processVoiceTranscript(),
 * AVANT la construction du systemPrompt et l'envoi du transcript au LLM.
 */

export interface SttChange {
  from: string;
  to: string;
  via: 'deterministic' | 'llm';
}

export interface SttCorrectionResult {
  /** Transcript corrigé (à envoyer au LLM + renvoyer au client). */
  transcript: string;
  /** Liste des corrections appliquées (transparence). */
  changes: SttChange[];
  /** Vrai si un token suspect reste → déclenche le rescoring LLM. */
  needsLlmRescore: boolean;
}

/** Normalisation NFD (sans accents) + minuscules, pour le matching. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Échappe les caractères spéciaux regex. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Couche 1 — correction déterministe.
 * Substitue les homophones (carte métier + corrections utilisateur) sur des
 * frontières de mots, insensible à la casse et aux accents.
 */
export function applyDeterministicCorrection(
  transcript: string,
  userCorrections: Array<{ original_value: string; corrected_value: string }> = [],
): SttCorrectionResult {
  const changes: SttChange[] = [];
  let result = transcript;

  // Fusionne carte métier + corrections utilisateur (clés normalisées).
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(HOMOPHONE_MAP)) map.set(normalize(k), v);
  for (const uc of userCorrections) {
    if (uc.original_value && uc.corrected_value && normalize(uc.original_value) !== normalize(uc.corrected_value)) {
      map.set(normalize(uc.original_value), uc.corrected_value);
    }
  }

  // Tri par longueur décroissante : les expressions multi-mots matchent avant les mots seuls.
  const keys = Array.from(map.keys()).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const replacement = map.get(key)!;
    const escaped = escapeRegex(key);
    // Frontière : début/fin ou caractère non-lettre (Unicode). Évite de clobber des sous-chaînes.
    const re = new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu');
    if (re.test(result)) {
      // Replace en préservant la position ; on remplace toutes les occurrences.
      result = result.replace(re, replacement);
      changes.push({ from: key, to: replacement, via: 'deterministic' });
    }
  }

  // Heuristique de suspicion : si un confusable connu subsiste, on demande le rescoring LLM.
  const normalized = normalize(result);
  const needsLlmRescore = /\bpaix\b/.test(normalized) || /\bcontrar\b/.test(normalized);

  return { transcript: result, changes, needsLlmRescore };
}

/**
 * Couche 2 — rescoring LLM (Groq llama-3.3-70b).
 * Corrige les homophones restants en s'appuyant sur le contexte métier.
 * N'est appelée que si la couche 1 signale needsLlmRescore=true.
 */
export async function llmRescore(transcript: string, groq: any): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          "Tu corriges les erreurs de reconnaissance vocale (STT) sur un texte français métier " +
          "(facturation, paie, contrats, social). Corrige les homophones et mots mal entendus " +
          "(ex: « fiche de paix » → « fiche de paie », « contrar » → « contrat », « d n » → « DSN »). " +
          "Ne change pas le sens, ne rajoute ni ne supprime d'information. " +
          "Retourne UNIQUEMENT le texte corrigé, sans guillemets ni explication.",
      },
      { role: 'user', content: transcript },
    ],
  });
  return (completion?.choices?.[0]?.message?.content || '').trim();
}

/**
 * Pipeline complet : déterm. + (optionnellement) rescoring LLM.
 * `groq` optionnel — si absent, seule la couche déterministe s'applique.
 */
export async function applySttCorrection(
  transcript: string,
  opts: { userCorrections?: Array<{ original_value: string; corrected_value: string }>; groq?: any } = {},
): Promise<SttCorrectionResult> {
  const det = applyDeterministicCorrection(transcript, opts.userCorrections || []);

  if (det.needsLlmRescore && opts.groq && process.env.GROQ_API_KEY) {
    try {
      const rescored = await llmRescore(det.transcript, opts.groq);
      if (rescored && rescored !== det.transcript) {
        return {
          transcript: rescored,
          changes: [...det.changes, { from: det.transcript, to: rescored, via: 'llm' }],
          needsLlmRescore: false,
        };
      }
    } catch {
      // Retour au résultat déterministe.
    }
  }
  return det;
}
