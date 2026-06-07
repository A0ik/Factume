'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ZENITH: Cabinet module disabled.
 * All cabinet routes redirect to dashboard.
 * Original code is preserved in git history (commit 31885f7).
 */
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}
