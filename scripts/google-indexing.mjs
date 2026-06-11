/**
 * ──────────────────────────────────────────────────────────
 * SINGULARITY — Google Indexing API Setup & Submission
 * ──────────────────────────────────────────────────────────
 *
 * Ce script fait TOUT automatiquement :
 *   1. Vérifie la propriété du site pour le compte de service
 *   2. Soumet toutes les URLs à l'indexation Google
 *
 * PRÉREQUIS :
 *   - Avoir créé un compte de service Google Cloud
 *   - Avoir téléchargé la clé JSON
 *   - Avoir activé l'Indexing API + Search Console API
 *
 * UTILISATION :
 *   node scripts/google-indexing.mjs
 *
 * ──────────────────────────────────────────────────────────
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════
// CONFIGURATION — Modifie ces valeurs
// ═══════════════════════════════════════════════════

// Chemin vers ta clé JSON (mets le fichier dans le dossier scripts/)
const KEY_FILE_PATH = join(__dirname, 'service-account-key.json');

const SITE_URL = 'https://factu.me';

// Toutes les URLs à soumettre
const URLS_TO_SUBMIT = [
  // ── Hubs Singularity (priorité max) ──
  `${SITE_URL}/facture-ia`,
  `${SITE_URL}/facture-voix`,

  // ── Homepage ──
  SITE_URL,

  // ── Pages marketing clés ──
  `${SITE_URL}/facturation-electronique`,
  `${SITE_URL}/facturation-vocale`,
  `${SITE_URL}/facturation-freelances`,
  `${SITE_URL}/facturation-artisans`,
  `${SITE_URL}/facturation-auto-entrepreneur`,
  `${SITE_URL}/facturation-pme`,
  `${SITE_URL}/facturation-btp`,
  `${SITE_URL}/creer-facture`,
  `${SITE_URL}/logiciel-facture-gratuit`,
  `${SITE_URL}/facture-gratuite`,
  `${SITE_URL}/generateur-facture`,
  `${SITE_URL}/devis-facture`,
  `${SITE_URL}/mentions-obligatoires-facture`,
  `${SITE_URL}/alternative-henrj`,
  `${SITE_URL}/alternative-tiime`,
  `${SITE_URL}/alternative-abby`,

  // ── Pages programmatiques facture-ia/[profession] ──
  // Les 22 professions
  ...[
    'plombier', 'electricien', 'menuisier', 'peintre', 'carreleur',
    'chauffagiste', 'couvreur', 'macon', 'developpeur', 'designer',
    'consultant', 'coach', 'photographe', 'redacteur', 'traducteur',
    'graphiste', 'formateur', 'avocat', 'architecte', 'agent-immobilier',
    'osteopathe', 'kinesitherapeute', 'psychologue', 'restaurateur', 'e-commerce',
  ].map(slug => `${SITE_URL}/facture-ia/${slug}`),
];

// ═══════════════════════════════════════════════════
// CODE — Ne touche pas en dessous
// ═══════════════════════════════════════════════════

let keyFile;
try {
  keyFile = JSON.parse(readFileSync(KEY_FILE_PATH, 'utf-8'));
} catch {
  console.error('❌ Fichier clé JSON introuvable !');
  console.error(`   Place ton fichier dans : ${KEY_FILE_PATH}`);
  console.error('   ou change KEY_FILE_PATH en haut du script.');
  process.exit(1);
}

const SERVICE_ACCOUNT_EMAIL = keyFile.client_email;
console.log(`\n🔑 Compte de service : ${SERVICE_ACCOUNT_EMAIL}\n`);

// Authentification
const auth = new google.auth.JWT({
  email: keyFile.client_email,
  key: keyFile.private_key,
  scopes: [
    'https://www.googleapis.com/auth/indexing',
    'https://www.googleapis.com/auth/webmasters',
  ],
});

const indexingApi = google.indexing({ version: 'v3', auth });
const searchConsoleApi = google.searchconsole({ version: 'v1', auth });

// ═══════════════════════════════════════════
// ÉTAPE 1 : Vérifier la propriété du site
// ═══════════════════════════════════════════

async function checkSiteOwnership() {
  console.log('📋 Étape 1 : Vérification de la propriété du site...\n');

  try {
    const res = await searchConsoleApi.sites.get({
      siteUrl: SITE_URL,
    });

    if (res.data.permissionLevel === 'siteOwner') {
      console.log('   ✅ Le compte de service est PROPRIÉTAIRE du site.\n');
      return true;
    } else if (res.data.permissionLevel === 'siteFullUser') {
      console.log('   ✅ Le compte de service a un accès complet.\n');
      return true;
    }

    console.log(`   ⚠️  Permission : ${res.data.permissionLevel}`);
    return true;
  } catch (err) {
    if (err.code === 403 || err.response?.status === 403) {
      console.log('   ❌ Le compte de service n\'a PAS accès au site.');
      console.log('   Il faut l\'ajouter comme propriétaire via l\'API.\n');
      return false;
    }
    throw err;
  }
}

async function getVerificationToken() {
  console.log('🔐 Récupération du token de vérification...\n');

  const res = await searchConsoleApi.webresource.getToken({
    requestBody: {
      site: {
        type: 'SITE',
        identifier: SITE_URL,
      },
      verificationMethod: 'META',
    },
  });

  return res.data;
}

async function verifySite(token) {
  const res = await searchConsoleApi.webresource.insert({
    requestBody: {
      site: {
        type: 'SITE',
        identifier: SITE_URL,
      },
      verificationMethod: 'META',
    },
  });

  return res.data;
}

// ═══════════════════════════════════════════
// ÉTAPE 2 : Soumettre les URLs
// ═══════════════════════════════════════════

async function submitUrl(url) {
  try {
    const res = await indexingApi.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    });
    return { url, status: '✅', response: res.data };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return { url, status: '❌', error: msg };
  }
}

async function submitAllUrls() {
  console.log(`\n🚀 Étape 2 : Soumission de ${URLS_TO_SUBMIT.length} URLs à Google...\n`);
  console.log('─'.repeat(60));

  let success = 0;
  let failed = 0;

  // Google limite à ~200 requêtes/jour, on envoie par batches de 10
  const BATCH_SIZE = 10;

  for (let i = 0; i < URLS_TO_SUBMIT.length; i += BATCH_SIZE) {
    const batch = URLS_TO_SUBMIT.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(submitUrl));

    for (const result of results) {
      if (result.status === '✅') {
        success++;
        console.log(`   ${result.status} ${result.url}`);
      } else {
        failed++;
        console.log(`   ${result.status} ${result.url}`);
        console.log(`      → ${result.error}`);
      }
    }

    // Pause entre les batches pour éviter le rate limiting
    if (i + BATCH_SIZE < URLS_TO_SUBMIT.length) {
      console.log(`\n   ⏳ Pause 2s... (${i + batch.length}/${URLS_TO_SUBMIT.length})\n`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Résultat : ${success} réussies, ${failed} échouées sur ${URLS_TO_SUBMIT.length} URLs\n`);
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   SINGULARITY — Google Indexing Automator     ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Vérifier si le compte de service a accès
  const hasAccess = await checkSiteOwnership();

  if (!hasAccess) {
    console.log('━'.repeat(50));
    console.log('📝 Pour donner accès au compte de service :');
    console.log('━'.repeat(50));
    console.log(`
   Option A — Via gcloud CLI (le plus simple) :

     gcloud search-console sites add-owners \
       --site-url="${SITE_URL}" \
       --owners="${SERVICE_ACCOUNT_EMAIL}"

   Option B — Méthode manuelle :

     1. Va sur https://www.google.com/webmasters/verification
     2. Connecte-toi avec ton compte Google personnel
     3. Ajoute une méthode de vérification META
     4. On va récupérer le token automatiquement...
`);

    try {
      const tokenData = await getVerificationToken();
      console.log('🔑 Token de vérification récupéré :');
      console.log(`   ${tokenData.token}\n`);
      console.log('   Ajoute cette balise dans ton <head> :');
      console.log(`   <meta name="google-site-verification" content="${tokenData.token}" />\n`);

      console.log('   Une fois ajoutée, relance ce script.');
      console.log('   Il vérifiera automatiquement la propriété.\n');

      // Essayer de vérifier
      try {
        await verifySite(tokenData.token);
        console.log('   ✅ Vérification réussie !\n');
      } catch (verifyErr) {
        console.log('   ⏳ La vérification a échoué. Ajoute la balise et relance le script.\n');
        process.exit(0);
      }
    } catch (tokenErr) {
      console.log('   ❌ Impossible de récupérer le token.');
      console.log(`   Erreur : ${tokenErr.message}\n`);
      console.log('   Essaie la méthode gcloud CLI (Option A) ci-dessus.\n');
      process.exit(1);
    }
  }

  // Soumettre les URLs
  await submitAllUrls();

  console.log('🎉 Terminé ! Vérifie l\'indexation dans 24-48h sur :');
  console.log('   https://search.google.com/search-console\n');
}

main().catch(err => {
  console.error('💥 Erreur fatale :', err.message);
  process.exit(1);
});
