// ─────────────────────────────────────────────────────────────────────────────
// SAGE (CIBLE 3) — Client Mistral OCR (étape 1 du pipeline hybride 2 stages).
//
// Pipeline « surpasser Dext.com » au meilleur coût :
//   Stage 1 — Mistral OCR (mistral-ocr-latest) : document → markdown structuré.
//             ~$1 / 1000 pages, natif PDF multi-pages, excellent en français,
//             fidélité layout SOTA. C'est l'OCR doc le moins cher du marché.
//   Stage 2 — Gemini 2.5 Flash (OpenRouter, clé mutualisée) : markdown → JSON
//             comptable strict (voir app/api/ai/ocr-mistral/route.ts).
//
// Réf. API : https://docs.mistral.ai/capabilities/ocr/overview/
// ─────────────────────────────────────────────────────────────────────────────

const MISTRAL_OCR_ENDPOINT = 'https://api.mistral.ai/v1/ocr';
export const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';

export interface MistralOcrPage {
  index: number;
  markdown: string;
  dimensions?: { dpi?: number; height?: number; width?: number };
}

export interface MistralOcrResult {
  /** Markdown concaténé de toutes les pages (séparateur de page). */
  markdown: string;
  pages: MistralOcrPage[];
  model: string;
}

/**
 * Envoie un buffer (PDF ou image) à Mistral OCR et retourne le markdown + les pages.
 * Lève une erreur explicite si MISTRAL_API_KEY est absent ou si l'API répond en erreur.
 */
export async function ocrWithMistral(
  buffer: Buffer,
  mimeType: string,
): Promise<MistralOcrResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY manquant — configurez la clé Mistral (api.mistral.ai).');
  }

  const isPdf = mimeType === 'application/pdf';
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  // PDF → document_url ; image → image_url (les deux acceptent une data URI base64).
  const document = isPdf
    ? { type: 'document_url' as const, document_url: dataUri }
    : { type: 'image_url' as const, image_url: dataUri };

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(MISTRAL_OCR_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ model: MISTRAL_OCR_MODEL, document }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Mistral OCR HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const rawPages: any[] = Array.isArray(json?.pages) ? json.pages : [];
    const pages: MistralOcrPage[] = rawPages.map((p, i) => ({
      index: typeof p?.index === 'number' ? p.index : i,
      markdown: String(p?.markdown ?? ''),
      dimensions: p?.dimensions,
    }));
    const markdown = pages.map((p) => p.markdown).join('\n\n--- page ---\n\n');

    if (!markdown.trim()) {
      throw new Error("Mistral OCR n'a renvoyé aucun texte (document vide ou illisible).");
    }

    return { markdown, pages, model: json?.model ?? MISTRAL_OCR_MODEL };
  } finally {
    clearTimeout(tid);
  }
}
