'use client';
import { useEffect, useState } from 'react';
import { Mail, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * ARGUS — Chip "adresse d'import email" affichée dans le header /ocr (Dext-like).
 * Récupère (et crée au besoin) l'adresse unique factures+<token>@factu.me de l'user.
 * Copie au clic ; régénère le token via le bouton ↻ (l'ancienne adresse cesse).
 */
export default function InboxAddressChip() {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/inbox/address');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAddress(data.address);
      } catch {
        /* silencieux */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Adresse copiée');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const regenerate = async () => {
    if (!confirm('Régénérer l’adresse ? L’ancienne cessera de fonctionner.')) return;
    setRegen(true);
    try {
      const res = await fetch('/api/inbox/address', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setAddress(data.address);
      toast.success('Nouvelle adresse générée');
    } catch (e: any) {
      toast.error(e.message || 'Échec');
    } finally {
      setRegen(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] px-2.5 py-2 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  if (!address) return null;

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-white/[0.08] overflow-hidden">
      <button
        onClick={copy}
        title={`Copier l’adresse d’import : ${address}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition"
      >
        <Mail className="w-3.5 h-3.5 text-emerald-500" />
        <span className="font-mono max-w-[180px] truncate">{address}</span>
        <Copy className="w-3 h-3 text-gray-400" />
      </button>
      <button
        onClick={regenerate}
        disabled={regen}
        title="Régénérer l’adresse"
        className={cn(
          'inline-flex items-center justify-center px-2 py-2 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition border-l border-gray-200 dark:border-white/[0.08]',
          regen && 'opacity-50',
        )}
      >
        <RefreshCw className={cn('w-3.5 h-3.5', regen && 'animate-spin')} />
      </button>
    </div>
  );
}
