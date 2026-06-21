import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { PDFDocument, rgb } from 'pdf-lib';
import { drawRoundedRect } from '../pdf-server';

// PROMETHEUS (CIBLE 2) — helper drawRoundedRect. pdf-lib n'a pas de rectangles
// arrondis natifs ; on compose un chemin SVG (4 quarts de cercle + segments).
// pdf-lib.drawSvgPath inverse lui-même l'axe Y (scale(1,-1) dans operations.js),
// donc on passe un path SVG standard (0,0)→(w,h) avec y = bottomY + height.
//
// Ces tests figent deux contrats :
//   1. Le helper ne lève pas et produit un PDF valide.
//   2. Avec radius>0, le flux contient des courbes de Bézier (opérateur `c`),
//      ce qui distingue un rectangle arrondi d'un rectangle plat (aucun `c`).

function contentStreamHasCurves(bytes: Uint8Array): boolean {
  const latin = Buffer.from(bytes).toString('latin1');
  // Les flux de contenu sont compressés (FlateDecode) : on décompresse d'abord.
  let raw = '';
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin)) !== null) {
    try {
      raw += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1') + '\n';
    } catch { /* flux non-Flate — ignoré */ }
  }
  // pdf-lib convertit le path SVG (quarts de cercle Q) en courbes de Bézier
  // cubiques via l'opérateur 'v' (curveto initial-répliqué). Un rectangle plat
  // utiliserait l'opérateur 're' et n'émettrait aucun 'v'.
  return /(^|\s)v(\s|$)/.test(raw);
}

describe('drawRoundedRect — helper d\'arrondi (CIBLE 2)', () => {
  it('ne lève pas et produit un PDF valide (%PDF)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    expect(() => drawRoundedRect(page, { x: 10, y: 10, width: 180, height: 100, radius: 8, color: rgb(0.9, 0.9, 0.9) })).not.toThrow();
    const bytes = await doc.save();
    const header = Buffer.from(bytes.slice(0, 5)).toString('latin1');
    expect(header.startsWith('%PDF')).toBe(true);
  });

  it('radius>0 → le flux contient des courbes de Bézier (opérateur v)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    drawRoundedRect(page, { x: 10, y: 10, width: 180, height: 100, radius: 10, color: rgb(0.9, 0.9, 0.9) });
    const bytes = await doc.save();
    expect(contentStreamHasCurves(bytes)).toBe(true);
  });

  it('radius=0 → AUCUNE courbe (rectangle plat équivalent)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    drawRoundedRect(page, { x: 10, y: 10, width: 180, height: 100, radius: 0, color: rgb(0.9, 0.9, 0.9) });
    const bytes = await doc.save();
    expect(contentStreamHasCurves(bytes)).toBe(false);
  });

  it('radius > min(width,height)/2 → saturé sans planter (square mini)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    expect(() => drawRoundedRect(page, { x: 10, y: 10, width: 20, height: 20, radius: 999, color: rgb(0.5, 0.5, 0.5) })).not.toThrow();
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(300);
  });

  it('bordure + fond ensemble (borderColor/borderWidth)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    expect(() => drawRoundedRect(page, {
      x: 5, y: 5, width: 190, height: 190, radius: 12,
      color: rgb(1, 1, 1), borderColor: rgb(0.1, 0.5, 0.3), borderWidth: 1,
    })).not.toThrow();
  });
});
