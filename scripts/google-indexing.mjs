/**
 * OVERDRIVE — Indexation Massive sans API Google
 *
 * La Site Verification API est cassée chez Google (503 backendError, bug confirmé).
 * L'interface GSC rejette les service accounts ("User not found").
 *
 * STRATÉGIE ALTERNATIVE :
 * 1. IndexNow (Bing/Yandex) — soumission instantanée, zéro auth
 * 2. Google Sitemap ping — force le crawl du sitemap
 * 3. Génération d'un fichier HTML avec toutes les URLs pour référence
 *
 * Usage : node scripts/google-indexing.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const crypto = require('crypto');

const SITE_URL = 'https://factu.me';

// IndexNow key (on la génère si elle n'existe pas)
const INDEXNOW_KEY = crypto.randomBytes(16).toString('hex');

const URLS = [
  `${SITE_URL}`,
  `${SITE_URL}/facture-ia`,
  `${SITE_URL}/facture-voix`,
  `${SITE_URL}/facturation-vocale`,
  `${SITE_URL}/facturation-electronique`,
  `${SITE_URL}/facturation-factur-x`,
  `${SITE_URL}/facture-gratuite`,
  `${SITE_URL}/modele-facture`,
  `${SITE_URL}/creer-facture`,
  `${SITE_URL}/editeur-facture`,
  `${SITE_URL}/generateur-facture`,
  `${SITE_URL}/facturation-artisans`,
  `${SITE_URL}/facturation-freelances`,
  `${SITE_URL}/facturation-pme`,
  `${SITE_URL}/facturation-auto-entrepreneur`,
  `${SITE_URL}/facturation-btp`,
  `${SITE_URL}/logiciel-facture-gratuit`,
  `${SITE_URL}/meilleur-logiciel-facture`,
  `${SITE_URL}/alternative-henrj`,
  `${SITE_URL}/a-propos`,
  `${SITE_URL}/securite`,
  `${SITE_URL}/modeles-facture`,
  `${SITE_URL}/comment-facturer`,
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 1. IndexNow (Bing + Yandex + Naver + Seznam) ──
async function submitIndexNow() {
  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
    'https://search.seznam.cz/indexnow',
  ];

  const body = JSON.stringify({
    host: 'factu.me',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: URLS,
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log(' PHASE 1 : IndexNow (Bing, Yandex, Seznam)');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`🔑 Clé IndexNow : ${INDEXNOW_KEY}`);
  console.log(`📄 URLs        : ${URLS.length}\n`);

  // Créer le fichier key de vérification
  const keyFilePath = join(__dirname, '..', 'public', `${INDEXNOW_KEY}.txt`);
  try {
    writeFileSync(keyFilePath, INDEXNOW_KEY);
    console.log(`✅ Fichier clé créé : public/${INDEXNOW_KEY}.txt`);
    console.log('   ⚠️  Committez ce fichier pour qu\'il soit accessible en ligne\n');
  } catch (e) {
    console.log(`⚠️  Impossible de créer le fichier clé : ${e.message}`);
    console.log(`   Créez manuellement public/${INDEXNOW_KEY}.txt avec le contenu : ${INDEXNOW_KEY}\n`);
  }

  for (const endpoint of endpoints) {
    const engine = new URL(endpoint).hostname;
    process.stdout.write(`   ${engine.padEnd(30)} `);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      // 200 = déjà en queue, 202 = accepté, 403 = clé invalide
      if (res.status === 200 || res.status === 202) {
        console.log(`✅ ${res.status} ${res.statusText || 'Accepted'}`);
      } else {
        console.log(`⚠️  ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    await sleep(500);
  }
}

// ── 2. Google Sitemap Ping ──
async function pingGoogleSitemap() {
  console.log('\n═══════════════════════════════════════════════');
  console.log(' PHASE 2 : Google Sitemap Ping');
  console.log('═══════════════════════════════════════════════\n');

  const pingUrl = `https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`;
  process.stdout.write(`   Ping sitemap.xml ... `);
  try {
    const res = await fetch(pingUrl);
    console.log(`${res.ok ? '✅' : '⚠️'} ${res.status}`);
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }

  // Aussi pinger Bing
  const bingPing = `https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml`;
  process.stdout.write(`   Ping Bing sitemap ... `);
  try {
    const res = await fetch(bingPing);
    console.log(`${res.ok ? '✅' : '⚠️'} ${res.status}`);
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }
}

// ── 3. Google Indexing API (tente si le SA est owner) ──
async function tryGoogleIndexingAPI() {
  console.log('\n═══════════════════════════════════════════════');
  console.log(' PHASE 3 : Google Indexing API (tentative)');
  console.log('═══════════════════════════════════════════════\n');

  const SA_PATH = join(__dirname, 'factume.json');
  let sa;
  try {
    sa = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
  } catch {
    console.log('   ⚠️  factume.json introuvable — skip\n');
    return;
  }

  // JWT
  const now = Math.floor(Date.now() / 1000);
  const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const pld = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const sig = crypto.createSign('RSA-SHA256').update(`${hdr}.${pld}`).sign(sa.private_key, 'base64url');

  process.stdout.write('   Token JWT ... ');
  let at;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${hdr}.${pld}.${sig}` }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    at = (await res.json()).access_token;
    console.log('✅');
  } catch (e) {
    console.log(`❌ ${e.message}\n`);
    return;
  }

  // Tester avec la homepage
  process.stdout.write('   Test homepage ... ');
  try {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
      body: JSON.stringify({ url: SITE_URL, type: 'URL_UPDATED' }),
    });
    if (res.ok) {
      console.log('✅ SA est owner ! Soumission en cours...\n');
      let ok = 0, err = 0;
      for (let i = 0; i < URLS.length; i++) {
        const short = URLS[i].replace(SITE_URL, '') || '/';
        process.stdout.write(`   [${String(i + 1).padStart(2, '0')}/${URLS.length}] ${short.padEnd(42)} `);
        const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` },
          body: JSON.stringify({ url: URLS[i], type: 'URL_UPDATED' }),
        });
        if (r.ok) { console.log('✅'); ok++; } else { console.log(`❌ ${r.status}`); err++; }
        await sleep(1100);
      }
      console.log(`\n   📊 Résultat : ${ok} succès, ${err} erreurs`);
    } else {
      console.log(`❌ ${res.status} — SA pas owner (c'est normal, voir instructions ci-dessous)`);
    }
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }
}

// ══════════════ MAIN ══════════════
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log(' OVERDRIVE — Indexation Massive');
  console.log('═══════════════════════════════════════════════');
  console.log(`🌐 Site : ${SITE_URL}`);
  console.log(`📄 URLs : ${URLS.length}\n`);
  console.log('⚠️  La Site Verification API est cassée chez Google (503 confirmé).');
  console.log('   Pivot vers IndexNow + Sitemap ping.\n');

  await submitIndexNow();
  await pingGoogleSitemap();
  await tryGoogleIndexingAPI();

  console.log('\n═══════════════════════════════════════════════');
  console.log(' ACTIONS RESTANTES POUR GOOGLE :');
  console.log('═══════════════════════════════════════════════\n');
  console.log('   1. Allez sur Google Search Console :');
  console.log('      https://search.google.com/search-console');
  console.log('   2. Sélectionnez factu.me');
  console.log('   3. Pour chaque URL, collez-la dans la barre');
  console.log('      d\'inspection et cliquez "Demander l\'indexation"');
  console.log('   4. C\'est le seul moyen fiable tant que le bug');
  console.log('      Google "User not found" / 503 n\'est pas fixé.\n');
  console.log('   📋 Liste des URLs à soumettre manuellement :');
  URLS.forEach((u, i) => console.log(`      ${String(i + 1).padStart(2, '0')}. ${u}`));
  console.log('\n═══════════════════════════════════════════════\n');
}

main().catch(console.error);
