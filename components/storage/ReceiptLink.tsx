'use client';

import { useState, type ReactNode, type MouseEvent } from 'react';
import { FileImage } from 'lucide-react';
import { isReceiptsPrivateUrl } from '@/lib/receipt-storage';

/**
 * ZEUS (CIBLE 2) — Lien vers un justificatif.
 *
 *  • Bucket privé `receipts` (pipeline OCR) → minte une URL signée AU CLIC via
 *    /api/storage/signed-url puis ouvre la fenêtre (1 requête par clic, pas de
 *    fan-out au montage des listes).
 *  • Tout le reste (bucket public `assets`, blob:, data:, déjà signé…) →
 *    comportement <a> natif (target=_blank).
 */
export function ReceiptLink({
  url,
  children,
  className,
  ariaLabel,
}: {
  url: string;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const isPrivate = isReceiptsPrivateUrl(url);

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (!isPrivate) return; // URL publique → on laisse le navigateur faire.
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      /* silently ignore — l'utilisateur peut réessayer */
    } finally {
      setBusy(false);
    }
  };

  return (
    <a
      href={isPrivate ? '#' : url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel ?? 'Voir le justificatif'}
      aria-busy={busy}
    >
      {children ?? <FileImage size={14} />}
    </a>
  );
}
