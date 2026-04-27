/**
 * Server-side PDF generation using Puppeteer directly.
 * Renders the HTML template for perfect fidelity with the preview.
 */
import puppeteer from 'puppeteer';
import { generateContract } from '@/lib/labor-law/contract-templates';

export type { ContractTemplateData } from '@/lib/labor-law/contract-templates';

export async function generateContractPdfBuffer(
  data: Parameters<typeof generateContract>[0]
): Promise<Uint8Array> {
  const html = generateContract(data);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    // networkidle2 — page is considered loaded when ≤2 pending network requests
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 30_000 });
    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      // Margins are handled by @page CSS in the template
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
