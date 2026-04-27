/**
 * Server-side PDF generation for French labor contracts.
 * Renders the HTML template via html-pdf-node (Puppeteer) for pixel-perfect output.
 * The HTML template already handles all layout, page breaks, and styling.
 */
import htmlPdfNode from 'html-pdf-node';
import { generateContract } from '@/lib/labor-law/contract-templates';

export type { ContractTemplateData } from '@/lib/labor-law/contract-templates';

export async function generateContractPdfBuffer(data: Parameters<typeof generateContract>[0]): Promise<Uint8Array> {
  const html = generateContract(data);

  const buffer = await htmlPdfNode.generatePdf(
    { content: html },
    {
      format: 'A4',
      printBackground: true,
      // Margins are handled by the @page rule inside the HTML template
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    }
  );

  return new Uint8Array(buffer);
}
