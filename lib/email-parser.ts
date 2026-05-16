export interface ParsedEmailAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

export interface ParsedEmail {
  from: string;
  subject: string;
  attachments: ParsedEmailAttachment[];
}

export function parseInboundEmail(rawBody: any): ParsedEmail {
  const from = rawBody.from?.text || rawBody.from || '';
  const subject = rawBody.subject || '';
  const attachments: ParsedEmailAttachment[] = [];

  // Resend inbound webhook format
  if (rawBody.attachments && Array.isArray(rawBody.attachments)) {
    for (const att of rawBody.attachments) {
      if (!att.content) continue;
      const isDocument = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      ].includes(att.content_type || '');

      if (isDocument) {
        attachments.push({
          filename: att.filename || 'document.pdf',
          mimeType: att.content_type || 'application/pdf',
          content: Buffer.from(att.content, 'base64'),
        });
      }
    }
  }

  return { from, subject, attachments };
}
