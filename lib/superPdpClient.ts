/**
 * Super PDP API Client — Opérateur de Dématérialisation (OD)
 *
 * Intégration complète avec l'API Super PDP pour la transmission
 * légale des factures électroniques (réforme française 2026+).
 *
 * Documentation : https://www.superpdp.tech/openapi/
 * Authentification : OAuth2 Client Credentials
 * Format : CII XML (EN 16931) — réutilise notre générateur Factur-X
 */

import { generateFacturXXml, isFacturXEligible } from './facturx';
import { isInvoiceB2B } from './tva-validator';
import { Invoice, Profile } from '@/types';

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.superpdp.tech/v1.beta';
const TOKEN_URL = 'https://api.superpdp.tech/oauth2/token';

function getClientId(): string {
  const id = process.env.SUPER_PDP_CLIENT_ID;
  if (!id) throw new Error('SUPER_PDP_CLIENT_ID manquant dans les variables d\'environnement');
  return id;
}

function getClientSecret(): string {
  const secret = process.env.SUPER_PDP_CLIENT_SECRET || process.env.SUPER_PDP_SECRET_ID;
  if (!secret) throw new Error('SUPER_PDP_CLIENT_SECRET manquant dans les variables d\'environnement');
  return secret;
}

/**
 * NOTE: Le mode sandbox/production est déterminé par les identifiants OAuth2
 * (client_id/client_secret), PAS par l'URL. Les 2 modes utilisent le même
 * endpoint https://api.superpdp.tech. Cf. documentation SuperPDP §Introduction.
 */

// ── OAuth2 Token Management ───────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

// Cache in-process (sur Vercel, chaque cold start obtient un nouveau token,
// les instances chaudes le réutilisent)
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  // Vérifier le cache
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  console.log('[SuperPDP] Demande de token OAuth2...');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SuperPDP] Erreur authentification:', response.status, errorText);
    throw new Error(`Auth Super PDP échouée (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Réponse OAuth2 invalide: pas de access_token');
  }

  // Cache avec marge de sécurité de 60 secondes
  const expiresIn = data.expires_in || 3600;
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  };

  console.log('[SuperPDP] Token obtenu, expire dans', expiresIn, 'secondes');
  return data.access_token;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransmitResult {
  success: boolean;
  /** ID de transmission Super PDP (à sauvegarder en DB) */
  superPdpId?: string;
  /** Statut de la facture côté Super PDP */
  status?: string;
  /** Message d'erreur en cas d'échec */
  error?: string;
  /** Code d'erreur Super PDP */
  errorCode?: string;
  /** Détails de validation (en cas d'erreur de format) */
  validationDetails?: string[];
}

export interface DirectoryLookupResult {
  found: boolean;
  /** Nom de la plateforme du destinataire (si trouvé) */
  platformName?: string;
  /** Peppol participant ? */
  peppolRegistered?: boolean;
}

export interface InvoiceEventResult {
  events: Array<{
    id: string;
    invoiceId: string;
    statusCode: string;
    description: string;
    createdAt: string;
  }>;
  hasMore: boolean;
}

// ── Fonction principale : Transmission d'une facture ──────────────────────────

/**
 * Transmet une facture électronique via Super PDP.
 *
 * Flux :
 * 1. Vérifie l'éligibilité de la facture
 * 2. Génère le XML CII EN16931 (via notre service Factur-X existant)
 * 3. Authentifie auprès de Super PDP (OAuth2 Client Credentials)
 * 4. POST le XML à /v1.beta/invoices
 * 5. Retourne l'ID de transmission Super PDP
 *
 * @param invoice La facture factu.me
 * @param profile Le profil de l'utilisateur
 * @returns TransmitResult avec l'ID Super PDP ou l'erreur
 */
export async function transmitInvoice(
  invoice: Invoice,
  profile: Profile
): Promise<TransmitResult> {
  const startTime = Date.now();

  try {
    // ── 0. Vérification B2C — pas de transmission PDP requise ───────────
    // ATELIER (e-invoicing / réforme FR 2026) — SEUL le B2B (client assujetti =
    // SIRET ou identifiants d'entreprise) est soumis à la transmission via
    // /invoices. Le B2C (particulier) relève de l'e-reporting (endpoints SuperPDP
    // /b2c_*), JAMAIS de /invoices. Détection SIRET-based via isInvoiceB2B,
    // cohérente avec le flux voix et isFacturXEligible (source de vérité unique).
    if (!isInvoiceB2B(invoice as any)) {
      console.log('[SuperPDP] Facture B2C (particulier) — transmission non requise (e-reporting à part)');
      return {
        success: false,
        error: 'Facture B2C — transmission PDP non requise pour les particuliers',
        errorCode: 'B2C_NOT_REQUIRED',
      };
    }

    // ── 1. Vérification d'éligibilité ────────────────────────────────────
    const eligibility = isFacturXEligible(invoice, profile);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: `Facture non éligible: ${eligibility.reason}`,
        errorCode: 'INELIGIBLE',
      };
    }

    if (eligibility.warnings && eligibility.warnings.length > 0) {
      console.warn('[SuperPDP] Avertissements éligibilité:', eligibility.warnings);
    }

    // Vérification SIRET vendeur (obligatoire pour la transmission)
    if (!profile.siret?.trim()) {
      return {
        success: false,
        error: 'SIRET de l\'entreprise émettrice requis pour la transmission électronique',
        errorCode: 'MISSING_SELLER_SIRET',
      };
    }

    // Vérification type de document (uniquement les factures et avoirs)
    if (!['invoice', 'credit_note', 'deposit'].includes(invoice.document_type)) {
      return {
        success: false,
        error: `Type de document "${invoice.document_type}" non transmissible électroniquement`,
        errorCode: 'UNSUPPORTED_TYPE',
      };
    }

    // ── 2. Génération du XML CII ─────────────────────────────────────────
    console.log('[SuperPDP] Génération XML CII pour facture', invoice.number);
    const ciiXml = generateFacturXXml(invoice, profile);
    console.log('[SuperPDP] XML généré, taille:', ciiXml.length, 'caractères');

    // ── 3. Authentification OAuth2 ───────────────────────────────────────
    const token = await getAccessToken();

    // ── 4. Envoi à Super PDP ─────────────────────────────────────────────
    // D'après la documentation officielle + quick_start.js :
    // POST /v1.beta/invoices avec le XML brut en body (pas de FormData).
    // Content-Type auto-détecté par l'API. Headers minimaux : Authorization.
    console.log('[SuperPDP] Transmission de la facture', invoice.number, '...');

    const response = await fetch(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/xml; charset=utf-8',
        'Accept': 'application/json',
      },
      body: ciiXml, // XML brut — cf. quick_start.js
    });

    const duration = Date.now() - startTime;
    console.log('[SuperPDP] Réponse:', response.status, 'en', duration, 'ms');

    // ── 5. Traitement de la réponse ──────────────────────────────────────
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }

      console.error('[SuperPDP] Erreur transmission:', response.status, errorData);

      // Erreurs de validation (400)
      if (response.status === 400) {
        const details: string[] = [];
        if (errorData.validation_errors) {
          errorData.validation_errors.forEach((e: any) =>
            details.push(`${e.field || e.location}: ${e.message}`)
          );
        }
        if (errorData.report?.subreport) {
          errorData.report.subreport.forEach((s: any) =>
            details.push(`${s.location}: ${s.message}`)
          );
        }

        return {
          success: false,
          error: errorData.message || errorData.error || 'Erreur de validation Super PDP',
          errorCode: 'VALIDATION_ERROR',
          validationDetails: details.length > 0 ? details : undefined,
        };
      }

      // Erreur d'authentification (401)
      if (response.status === 401) {
        // Invalider le cache token
        tokenCache = null;
        return {
          success: false,
          error: 'Authentification Super PDP échouée — vérifiez vos identifiants',
          errorCode: 'AUTH_FAILED',
        };
      }

      // Erreur destinataire non trouvé (404 / pre-check)
      if (response.status === 404 || errorData.message?.includes('receiver')) {
        return {
          success: false,
          error: 'Destinataire non trouvé dans l\'annuaire électronique (PDP/PPF). Le client n\'est peut-être pas encore inscrit.',
          errorCode: 'RECEIVER_NOT_FOUND',
        };
      }

      // Erreur serveur (500+) — retryable
      if (response.status >= 500) {
        return {
          success: false,
          error: `Erreur serveur Super PDP (${response.status}) — sera retenté automatiquement`,
          errorCode: 'SERVER_ERROR',
        };
      }

      // Autre erreur
      return {
        success: false,
        error: errorData.message || errorData.error || `Erreur Super PDP (${response.status})`,
        errorCode: `HTTP_${response.status}`,
      };
    }

    // ── Succès ! ─────────────────────────────────────────────────────────
    const result = await response.json();
    const superPdpId = result.id || result.invoice_id || result.data?.id;

    if (!superPdpId) {
      console.warn('[SuperPDP] Réponse OK mais pas d\'ID:', JSON.stringify(result));
    }

    console.log('[SuperPDP] Facture', invoice.number, 'transmise avec succès. ID:', superPdpId);

    return {
      success: true,
      superPdpId,
      status: result.status || result.data?.status || 'queued',
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[SuperPDP] Exception après', duration, 'ms:', error.message);

    // Erreurs réseau — retryable
    if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ETIMEDOUT' || error.cause?.code === 'ENOTFOUND') {
      return {
        success: false,
        error: `Erreur réseau Super PDP: ${error.cause.code} — sera retenté automatiquement`,
        errorCode: 'NETWORK_ERROR',
      };
    }

    return {
      success: false,
      error: error.message || 'Erreur inconnue lors de la transmission',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

// ── Lookup annuaire ───────────────────────────────────────────────────────────

/**
 * Vérifie si une entreprise est enregistrée dans l'annuaire électronique.
 * Utile pour pré-valider avant envoi.
 */
export async function lookupCompany(sirenOrSiret: string): Promise<DirectoryLookupResult> {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${BASE_URL}/french_directory/companies?number=${encodeURIComponent(sirenOrSiret)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('[SuperPDP] Lookup échoué:', response.status);
      return { found: false };
    }

    const data = await response.json();
    const entries = data.data || data.entries || data;

    if (Array.isArray(entries) && entries.length > 0) {
      return {
        found: true,
        platformName: entries[0].platform_name || entries[0].provider,
        peppolRegistered: entries[0].peppol_registered ?? true,
      };
    }

    if (data.id || data.name) {
      return {
        found: true,
        platformName: data.platform_name || data.provider,
        peppolRegistered: data.peppol_registered ?? true,
      };
    }

    return { found: false };
  } catch (error: any) {
    console.error('[SuperPDP] Erreur lookup:', error.message);
    return { found: false };
  }
}

// ── Suivi du cycle de vie ─────────────────────────────────────────────────────

/**
 * Récupère les événements d'une facture transmise (CDAR).
 * Permet de suivre : acceptation, refus, paiement, litige...
 */
export async function getInvoiceEvents(
  superPdpInvoiceId: string
): Promise<InvoiceEventResult> {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${BASE_URL}/invoice_events?invoice_id=${encodeURIComponent(superPdpInvoiceId)}&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[SuperPDP] Erreur récupération événements:', response.status);
      return { events: [], hasMore: false };
    }

    const data = await response.json();
    const rawEvents = data.data || data.events || data.items || [];
    const hasMore = data.has_more || data.pagination?.has_more || false;

    return {
      events: rawEvents.map((e: any) => ({
        id: e.id,
        invoiceId: e.invoice_id,
        statusCode: e.status_code || e.lifecycle_status,
        description: e.description || e.reason || '',
        createdAt: e.created_at || e.timestamp,
      })),
      hasMore,
    };
  } catch (error: any) {
    console.error('[SuperPDP] Erreur événements:', error.message);
    return { events: [], hasMore: false };
  }
}

// ── Santé / Diagnostic ────────────────────────────────────────────────────────

/**
 * Vérifie que la connexion à Super PDP est fonctionnelle.
 * Utile pour un health check ou une page de diagnostic.
 */
export async function checkSuperPdpHealth(): Promise<{
  connected: boolean;
  error?: string;
  tokenValid?: boolean;
}> {
  try {
    const token = await getAccessToken();
    return { connected: true, tokenValid: true };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
      tokenValid: false,
    };
  }
}

/**
 * Invalide le cache de token (utile après une erreur 401).
 */
export function invalidateTokenCache(): void {
  tokenCache = null;
}

/**
 * Vérifie si une erreur de transmission est retryable.
 */
export function isRetryableError(result: TransmitResult): boolean {
  if (result.success) return false;
  return ['SERVER_ERROR', 'NETWORK_ERROR'].includes(result.errorCode || '');
}
