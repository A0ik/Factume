/**
 * ASTRÉE (CIBLE 3a) — Enrichissement SIREN/SIRET côté client.
 *
 * Source : API officielle recherche-entreprises.api.gouv.fr (publique, CORS '*',
 * déjà allowlistée dans le CSP middleware). Aucune clé, aucun appel serveur.
 *
 * Réutilisable par toutes les surfaces de création de client (cabinet, contacts,
 * InvoiceForm, DocumentForm) via le hook onBlur du champ SIRET ou le composant
 * <CompanySearch>. Corrige le bug « l'adresse ne se remplit plus » : le champ
 * SIRET dédié n'était câblé à rien ; cet helper alimente directement la fiche.
 */

export interface EnrichedCompany {
  name: string;
  siret: string;
  siren: string;
  address: string;
  postal_code: string;
  city: string;
  vat_number: string;
}

/** Calcule le n° de TVA intracommunautaire français à partir du SIREN. */
export function computeFrenchVAT(siren: string): string {
  if (!siren || siren.length !== 9) return '';
  const key = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${siren}`;
}

/**
 * Recherche une entreprise par nom, SIREN ou SIRET.
 * Retourne la meilleure correspondance, ou null (API injoignable / aucun résultat).
 * Échoue silencieement : l'enrichissement est un confort, pas un blocage.
 */
export async function lookupCompany(query: string): Promise<EnrichedCompany | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    const siege = r.siege || {};
    const addressParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie]
      .filter(Boolean).join(' ');
    return {
      name: r.nom_complet || r.nom_raison_sociale || '',
      siret: siege.siret || '',
      siren: r.siren || '',
      address: siege.geo_adresse || addressParts,
      postal_code: siege.code_postal || '',
      city: siege.libelle_commune || '',
      vat_number: computeFrenchVAT(r.siren || ''),
    };
  } catch {
    return null;
  }
}
