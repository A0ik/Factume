'use client';

import { Loader2 } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

/**
 * ZEUS (CIBLE 2) — <img> pour un justificatif.
 *
 * Résout une URL signée si la source est dans le bucket privé `receipts`
 * (pipeline OCR) ; sinon (bucket public `assets`, blob:, data:) la passe
 * telle quelle. Affiche un spinner pendant la résolution.
 */
export function ReceiptImg({
  url,
  alt = '',
  className,
  loadingClassName,
}: {
  url: string | null | undefined;
  alt?: string;
  className?: string;
  loadingClassName?: string;
}) {
  const { url: src, loading } = useSignedUrl(url);

  if (loading) {
    return (
      <div className={className}>
        <Loader2 className={loadingClassName ?? 'w-4 h-4 animate-spin opacity-50'} />
      </div>
    );
  }

  return <img src={src || ''} alt={alt} className={className} />;
}
