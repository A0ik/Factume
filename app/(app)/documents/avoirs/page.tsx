'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/documents?type=credit_note'); }, [router]);
  return null;
}
