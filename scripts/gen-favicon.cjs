// One-shot: génère public/favicon.ico (multi-résolution) depuis public/favicon.png
// PHOENIX (CRISE 1D) : certains navigateurs requièrent /favicon.ico par défaut
// et prennent un 404 si seul favicon.png existe.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'favicon.png');
const OUT = path.join(__dirname, '..', 'public', 'favicon.ico');

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error('favicon.png introuvable');
    process.exit(1);
  }

  const sizes = [16, 32, 48];
  const images = [];
  for (const s of sizes) {
    const png = await sharp(SRC).resize(s, s).png().toBuffer();
    images.push({ size: s, png });
  }

  // ICO container : header (6) + N entrées (16) + blobs PNG
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type = icon
  header.writeUInt16LE(count, 4);

  const dirLen = 16;
  const offsetBase = 6 + dirLen * count;
  const entries = [];
  let cursor = offsetBase;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(dirLen);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);   // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1);   // height
    entry.writeUInt8(0, 2);                        // colors
    entry.writeUInt8(0, 3);                        // reserved
    entry.writeUInt16LE(1, 4);                     // planes
    entry.writeUInt16LE(32, 6);                    // bit count
    entry.writeUInt32LE(png.length, 8);            // bytes in res
    entry.writeUInt32LE(cursor, 12);               // image offset
    entries.push(entry);
    cursor += png.length;
  }

  const out = Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
  fs.writeFileSync(OUT, out);
  console.log(`favicon.ico généré (${out.length} octets, ${count} résolutions) → ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
