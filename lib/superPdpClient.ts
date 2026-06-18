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
import { createAdminClient } from './supabase-server';
import { encryptToken, decryptToken } from './utils';
import { Invoice, Profile } from '@/types';

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.superpdp.tech/v1.beta';
const TOKEN_URL = 'https://api.superpdp.tech/oauth2/token';
const AUTHORIZE_URL = 'https://api.superpdp.tech/oauth2/authorize';

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

/**
 * URI de redirection OAuth (Authorization Code). Doit être enregistrée dans
 * l'application SuperPDP (interface SuperPDP → Applications → Redirect URI).
 */
function getRedirectUri(origin: string): string {
  return process.env.SUPER_PDP_REDIRECT_URI || `${origin}/api/superpdp/callback`;
}

/** Mode sandbox (true en dev). Détermine le scheme d'adressage du tunnel OAuth. */
function isSandbox(): boolean {
  return (process.env.SUPER_PDP_SANDBOX ?? 'true').toLowerCase() !== 'false';
}

// ── Multi-SIRET : tokens OAuth par utilisateur (modèle marque grise) ──────────
//
// PRÉREUX ARCHITECTURAL : chez SuperPDP, 1 token = 1 entreprise émettrice
// (page 2 « un jeu d'identifiants par entreprise » ; page 4 Authorization Code =
// « l'utilisateur d'un logiciel de gestion qui donne accès à son compte »).
// Le token détermine l'identité du vendeur ; les factures sont « scoped » au
// compte authentifié. Pour transmettre POUR un utilisateur (son SIRET), il faut
// un token qui représente SON compte SuperPDP — obtenu via le flux Authorization
// Code (cf. exemple officiel erp.go), stocké chiffré dans superpdp_connections.

export interface UserToken {
  token: string;
  siren?: string | null;
  env?: string | null;
}

interface ConnectionRow {
  id: string;
  user_id: string;
  siren: string | null;
  siret: string | null;
  company_name: string | null;
  platform_company_id: string | null;
  env: string | null;
  refresh_token_encrypted: string;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  connected_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
}

/**
 * Récupère la connexion SuperPDP active d'un utilisateur.
 */
export async function getUserConnection(userId: string): Promise<ConnectionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('superpdp_connections')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

/**
 * Statut de connexion (pour badge UI). Ne lève jamais.
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  siren?: string | null;
  companyName?: string | null;
  env?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
}> {
  try {
    const conn = await getUserConnection(userId);
    if (!conn) return { connected: false };
    return {
      connected: true,
      siren: conn.siren,
      companyName: conn.company_name,
      env: conn.env,
      connectedAt: conn.connected_at,
      lastError: conn.last_error,
    };
  } catch {
    return { connected: false };
  }
}

/**
 * Révoque (déconnecte) la connexion SuperPDP d'un utilisateur.
 */
export async function disconnectSuperPdp(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('superpdp_connections')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}

/**
 * Construit l'URL d'autorisation OAuth (Authorization Code) pour brancher le
 * compte SuperPDP de l'utilisateur. Pré-remplit l'email et le SIREN (scheme
 * `fr_siren` en prod, `sandbox` en sandbox) comme documenté page 4.
 */
export function buildAuthorizeUrl(params: {
  origin: string;
  state: string;
  loginHint?: string;
  companySiren?: string; // 9 chiffres
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', getClientId());
  url.searchParams.set('redirect_uri', getRedirectUri(params.origin));
  url.searchParams.set('state', params.state);
  // Pas de scopes (page 4 : « Scopes : aucun, laisser vide »)
  if (params.loginHint) url.searchParams.set('login_hint', params.loginHint);
  if (params.companySiren && !isSandbox()) {
    url.searchParams.set('superpdp_company_number', params.companySiren);
    url.searchParams.set('superpdp_company_number_scheme', 'fr_siren');
  }
  return url.toString();
}

/**
 * Échange un code d'autorisation contre des tokens (access + refresh) et stocke
 * la connexion. Vérifie la concordance SIREN : le compte SuperPDP connecté DOIT
 * correspondre au SIRET du profil (sinon on refuse — on ne transmet pas pour une
 * autre entreprise que celle de l'utilisateur).
 *
 * @returns {created: true} si OK, sinon {error}
 */
export async function exchangeAndStoreConnection(params: {
  userId: string;
  code: string;
  origin: string;
  expectedSiren?: string; // SIREN du profil (9 chiffres) — garde-fou
}): Promise<{ created: boolean; error?: string }> {
  const tokenResp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(params.origin),
    }),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    console.error('[SuperPDP] token exchange failed:', tokenResp.status, errText);
    return { created: false, error: `Échange du code OAuth échoué (${tokenResp.status})` };
  }

  const tokens = (await tokenResp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token || !tokens.refresh_token) {
    return { created: false, error: 'Réponse OAuth invalide (tokens manquants)' };
  }

  // Récupère l'identité de l'entreprise connectée
  const meResp = await fetch(`${BASE_URL}/companies/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  });
  let me: any = null;
  if (meResp.ok) {
    try { me = await meResp.json(); } catch { me = null; }
  }
  const connectedSiren = me?.number ? String(me.number) : null;

  // Garde-fou concordance SIREN (production uniquement : en sandbox, number scheme
  // = sandbox, le SIREN réel n'est pas pertinent)
  if (!isSandbox() && params.expectedSiren && connectedSiren && connectedSiren !== params.expectedSiren) {
    return {
      created: false,
      error: `Le compte SuperPDP connecté (SIREN ${connectedSiren}) ne correspond pas à votre entreprise (SIREN ${params.expectedSiren}).`,
    };
  }

  const admin = createAdminClient();
  // Upsert : une seule connexion active par utilisateur (UNIQUE user_id)
  const { error } = await admin
    .from('superpdp_connections')
    .upsert(
      {
        user_id: params.userId,
        siren: connectedSiren,
        siret: me?.siret || null,
        company_name: me?.formal_name || me?.name || null,
        platform_company_id: me?.id || null,
        env: me?.env || (isSandbox() ? 'sandbox' : 'production'),
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        access_token_encrypted: encryptToken(tokens.access_token),
        access_token_expires_at: new Date(
          Date.now() + (tokens.expires_in || 1800) * 1000
        ).toISOString(),
        connected_at: new Date().toISOString(),
        revoked_at: null,
        last_error: null,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[SuperPDP] upsert connection failed:', error.message);
    return { created: false, error: 'Échec enregistrement de la connexion' };
  }

  console.log('[SuperPDP] Connexion OAuth stockée pour user', params.userId, '— SIREN', connectedSiren);
  return { created: true };
}

/**
 * Récupère un access_token valide pour l'utilisateur : utilise le cache (30 min)
 * ou rafraîchit via le refresh_token (rotation OAuth 2.1). Retourne null si
 * l'utilisateur n'a pas de connexion active ou si elle est invalide.
 */
export async function getAccessTokenForUser(userId: string): Promise<UserToken | null> {
  const conn = await getUserConnection(userId);
  if (!conn) return null;

  // Cache access_token encore valide (marge 60s)
  const stillValid =
    conn.access_token_encrypted &&
    conn.access_token_expires_at &&
    new Date(conn.access_token_expires_at).getTime() > Date.now() + 60_000;
  if (stillValid && conn.access_token_encrypted) {
    return {
      token: decryptToken(conn.access_token_encrypted),
      siren: conn.siren,
      env: conn.env,
    };
  }

  // Refresh (OAuth 2.1 → rotation du refresh_token)
  let refreshToken: string;
  try {
    refreshToken = decryptToken(conn.refresh_token_encrypted);
  } catch {
    console.error('[SuperPDP] refresh_token indéchiffrable pour user', userId);
    return null;
  }

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[SuperPDP] refresh failed:', resp.status, errText);
    // invalid_grant = refresh_token révoqué/expiré → on marque la connexion
    if (resp.status === 400 || resp.status === 401) {
      const admin = createAdminClient();
      await admin
        .from('superpdp_connections')
        .update({
          revoked_at: new Date().toISOString(),
          last_error: `Refresh token invalide (${resp.status})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);
    }
    return null;
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const update: Record<string, unknown> = {
    access_token_encrypted: encryptToken(data.access_token),
    access_token_expires_at: new Date(
      Date.now() + (data.expires_in || 1800) * 1000
    ).toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  };
  if (data.refresh_token) {
    update.refresh_token_encrypted = encryptToken(data.refresh_token);
  }

  const admin = createAdminClient();
  await admin.from('superpdp_connections').update(update).eq('id', conn.id);

  return { token: data.access_token, siren: conn.siren, env: conn.env };
}

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

// ── Diagnostic : rapport de validation détaillé ───────────────────────────────

/**
 * Valide un XML Factur-X auprès de SuperPDP via POST /validation_reports (FormData).
 *
 * /invoices répond souvent « Invalid report » SANS détail quand le XML échoue à la
 * validation EN 16931. Cet endpoint renvoie le rapport complet (is_valid + erreurs),
 * ce qui permet de diagnostiquer précisément le 400. Cf. SUPERPDP_API_REFERENCE §3.3.
 */
async function validateXmlReport(xml: string, token?: string): Promise<any | null> {
  try {
    const authToken = token || (await getAccessToken());
    const form = new FormData();
    form.append('file', new Blob([xml], { type: 'application/xml' }), 'factur-x.xml');
    const response = await fetch(`${BASE_URL}/validation_reports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: form,
    });
    const text = await response.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    console.log('[SuperPDP] validation_reports:', response.status, JSON.stringify(json).slice(0, 3000));
    return json;
  } catch (e: any) {
    console.warn('[SuperPDP] validation_reports échoué:', e?.message);
    return null;
  }
}

/**
 * Diagnostic contexte (sur 500 serveur) : un 500 SuperPDP après validation XML OK
 * signifie généralement que le serveur ne sait pas TRAITER la facture — souvent
 * parce que le vendeur du XML n'est pas le compte authentifié (problème multi-
 * SIRET : le token client_credentials émet pour un autre SIRET non enrollé), ou
 * parce que l'acheteur n'est pas routable. On logge ces infos pour trancher.
 */
async function diagnoseTransmissionContext(
  invoice: any,
  profile: Profile,
  token?: string,
): Promise<{ buyerInDirectory: boolean | null; sellerMatchesAccount: boolean | null; env: string | null }> {
  let buyerInDirectory: boolean | null = null;
  let sellerMatchesAccount: boolean | null = null;
  let env: string | null = null;
  try {
    const authToken = token || (await getAccessToken());
    const sellerSiret = (profile.siret || '').trim();
    const sellerSiren = sellerSiret.replace(/\s/g, '').substring(0, 9);
    const buyerSiret = (invoice?.client_siret || invoice?.client?.siret || '').trim();
    console.log('[SuperPDP] diagnostic — SIRET vendeur (XML):', sellerSiret, '| SIRET acheteur:', buyerSiret);

    // 1. Compte authentifié = la plateforme (dont son propre SIREN).
    try {
      const meRes = await fetch(`${BASE_URL}/companies/me`, {
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
      });
      const meText = await meRes.text();
      console.log('[SuperPDP] diagnostic companies/me:', meRes.status, meText.slice(0, 1000));
      try {
        const me = JSON.parse(meText);
        if (me?.number) sellerMatchesAccount = String(me.number) === sellerSiren;
        if (me?.env) { env = me.env; console.log('[SuperPDP] diagnostic env compte:', me.env); }
      } catch {}
    } catch (e: any) {
      console.warn('[SuperPDP] diagnostic companies/me échoué:', e?.message);
    }

    // 2. Reachabilité de l'acheteur dans l'annuaire DGFiP. IMPORTANT : SuperPDP
    // identifie les entreprises par leur NUMÉRO D'ENTREPRISE (SIREN, 9 chiffres),
    // pas le SIRET (14). On interroge donc avec le SIREN.
    const buyerSiren = buyerSiret.replace(/\s/g, '').substring(0, 9);
    if (buyerSiren) {
      try {
        const dirRes = await fetch(
          `${BASE_URL}/french_directory/companies?number=${encodeURIComponent(buyerSiren)}`,
          { headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' } },
        );
        const dirText = await dirRes.text();
        console.log('[SuperPDP] diagnostic french_directory (acheteur SIREN', buyerSiren, '):', dirRes.status, dirText.slice(0, 1000));
        try {
          const dir = JSON.parse(dirText);
          const entries = dir?.data || dir?.entries || (Array.isArray(dir) ? dir : []);
          buyerInDirectory = Array.isArray(entries) && entries.length > 0;
        } catch {}
      } catch (e: any) {
        console.warn('[SuperPDP] diagnostic french_directory échoué:', e?.message);
      }
    }
  } catch (e: any) {
    console.warn('[SuperPDP] diagnostic contexte échoué:', e?.message);
  }
  return { buyerInDirectory, sellerMatchesAccount, env };
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

    // ── 2. Connexion SuperPDP de l'utilisateur (token = SON entreprise) ──
    // MULTI-SIRET : chez SuperPDP, le token détermine le vendeur (les factures
    // sont « scoped » au compte authentifié). Pour transmettre pour l'utilisateur,
    // le token DOIT porter SON SIREN — obtenu via le flux Authorization Code et
    // stocké chiffré dans superpdp_connections. Sans connexion → on s'arrête
    // proprement avec un code que l'UI sait gérer (proposer le branchement).
    const userId = (profile as any).id as string | undefined;
    if (!userId) {
      return {
        success: false,
        error: 'Impossible d\'identifier l\'utilisateur pour la transmission',
        errorCode: 'INTERNAL_ERROR',
      };
    }
    const userToken = await getAccessTokenForUser(userId);
    if (!userToken) {
      return {
        success: false,
        error: 'Votre plateforme de facturation (SuperPDP) n\'est pas encore connectée. Branchez-la une seule fois pour transmettre légalement vos factures.',
        errorCode: 'SUPERPDP_NOT_CONNECTED',
      };
    }

    // ── 3. Génération du XML CII ─────────────────────────────────────────
    // SuperPDP exige le customization ID CII pur (urn:cen.eu:en16931:2017),
    // PAS l'ID Factur-X (rejeté en « unknown profile »). On le passe explicitement.
    console.log('[SuperPDP] Génération XML CII pour facture', invoice.number);
    const ciiXml = generateFacturXXml(invoice, profile, { customizationId: 'urn:cen.eu:en16931:2017' });
    console.log('[SuperPDP] XML généré, taille:', ciiXml.length, 'caractères');

    // ── 4. Envoi à Super PDP (token de l'utilisateur) ────────────────────
    // D'après la documentation officielle + quick_start.js :
    // POST /v1.beta/invoices avec le XML brut en body (pas de FormData).
    // Le token porte le SIREN de l'utilisateur → le vendeur du XML (SellerTradeParty)
    // correspond au compte authentifié → la facture est acceptée.
    console.log('[SuperPDP] Transmission de la facture', invoice.number, '...');

    const response = await fetch(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken.token}`,
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

      // Erreurs de validation (400) — SuperPDP répond « Invalid report » sans détail
      // sur /invoices. On appelle /validation_reports (FormData) pour récupérer le
      // rapport complet et l'injecter dans les logs + validationDetails.
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

        // Diagnostic : rapport de validation détaillé (BR-XX / règles EN 16931)
        const report = await validateXmlReport(ciiXml, userToken.token);
        if (report) {
          const arr: any[] = Array.isArray(report)
            ? report
            : (report.data || report.reports || report.validation_reports || [report]);
          for (const r of arr) {
            if (!r || typeof r !== 'object') continue;
            const entries =
              r.report?.subreport || r.subreport || r.errors || r.validation_errors || r.details;
            if (Array.isArray(entries) && entries.length) {
              for (const e of entries) {
                details.push(
                  `[validation] ${e.location || e.field || e.rule || e.id || ''}: ${e.message || e.text || JSON.stringify(e)}`
                );
              }
            } else {
              details.push(`[validation] ${r.summary || r.message || JSON.stringify(r).slice(0, 400)}`);
            }
          }
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

      // Erreur serveur (500+) — retryable SAUF si la cause est identifiée comme
      // non retentable. On diagnostique via companies/me + annuaire.
      if (response.status >= 500) {
        const diag = await diagnoseTransmissionContext(invoice, profile, userToken.token);

        // PROD : french_directory = annuaire DGFiP réel. Acheteur absent = non
        // routable → message clair, NON retenté (retry inutile tant que le client
        // n'est pas inscrit).
        if (diag.env !== 'sandbox' && diag.buyerInDirectory === false) {
          const buyerSiret = (invoice?.client_siret || invoice?.client?.siret || '').trim();
          return {
            success: false,
            error: `Le client (${buyerSiret}) n'est pas inscrit à la facturation électronique (absent de l'annuaire DGFiP). La transmission sera possible dès qu'il sera enregistré auprès d'une plateforme agréée (PDP).`,
            errorCode: 'RECEIVER_NOT_REGISTERED',
          };
        }

        // SANDBOX : french_directory interroge l'annuaire DGFiP RÉEL (vide pour
        // les entreprises de test) → ce check n'est PAS fiable en sandbox. Un 500
        // sandbox vient généralement d'un acheteur de test invalide/non routable
        // (le quick_start officiel utilise Tricatel). Message clair, non retenté.
        if (diag.env === 'sandbox') {
          const sellerOk = diag.sellerMatchesAccount !== false;
          return {
            success: false,
            error: `Erreur serveur SuperPDP en sandbox (500). Causes probables : (1) l'acheteur n'est pas une entreprise de test sandbox valide/routable — utilise celle du quick_start officiel (Tricatel), pas un numéro inventé ; (2) instabilité sandbox. Vendeur ${sellerOk ? 'OK (matche le token)' : 'en MISMATCH (le SIREN profil ≠ token)'}.`,
            errorCode: 'SANDBOX_CONFIG_ERROR',
          };
        }

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

    // SuperPDP identifie les entreprises par leur numéro d'entreprise (SIREN, 9
    // chiffres). On normalise : si on reçoit un SIRET (14), on prend le SIREN.
    const cleaned = (sirenOrSiret || '').replace(/\s/g, '');
    const number = cleaned.length >= 14 ? cleaned.substring(0, 9) : cleaned;

    const response = await fetch(
      `${BASE_URL}/french_directory/companies?number=${encodeURIComponent(number)}`,
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
