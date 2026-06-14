// Optimisation des visuels de la page d'accueil (LCP / conversion).
// - Logos : une taille appropriée par variante (au lieu de 5 × 7,5 Mo identiques).
// - Mockups iPhone/iPad : résolution retina réelle + compression.
// Sauvegarde des originaux dans scripts/_imgbackup/.
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BACKUP = path.join(__dirname, '_imgbackup');

const bytes = (n) => `${(n / 1024).toFixed(0)} Ko`;

async function opt(relPath, { width, palette }) {
  const src = path.join(PUBLIC, relPath);
  const statBefore = (await fs.stat(src)).size;
  // backup
  await fs.mkdir(BACKUP, { recursive: true });
  const bak = path.join(BACKUP, relPath.replace(/\//g, '__'));
  await fs.copyFile(src, bak);
  // optimize
  const tmp = src + '.opt.png';
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: !!palette, quality: 90, colors: 256 })
    .toFile(tmp);
  await fs.rename(tmp, src);
  const statAfter = (await fs.stat(src)).size;
  const ratio = ((1 - statAfter / statBefore) * 100).toFixed(0);
  console.log(`${relPath.padEnd(28)} ${bytes(statBefore).padStart(9)} → ${bytes(statAfter).padStart(8)}  (-${ratio}%, w=${width})`);
}

const tasks = [
  ['logo-sm.png', { width: 128, palette: true }],
  ['logo-md.png', { width: 256, palette: true }],
  ['logo-lg.png', { width: 384, palette: true }],
  ['logo-xl.png', { width: 512, palette: true }],
  ['logo.png', { width: 256, palette: true }],
  ['iphone-hero.png', { width: 900, palette: false }],
  ['images/ipad-section.png', { width: 1800, palette: false }],
];

for (const [p, opts] of tasks) {
  try { await opt(p, opts); }
  catch (e) { console.error(`FAIL ${p}: ${e.message}`); }
}
console.log(`\nOriginaux sauvegardés dans : ${path.relative(ROOT, BACKUP)}`);
