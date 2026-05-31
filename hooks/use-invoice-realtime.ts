import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

export function useInvoiceRealtime(invoiceId: string | undefined) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let channel: RealtimeChannel | null = null;

    // Initial fetch
    const fetchInvoice = async () => {
      try {
        setError(null);
        const { data } = await supabase
          .from('invoices')
          .select('*, client:clients(*)')
          .eq('id', invoiceId)
          .single();

        setInvoice(data);
      } catch (err) {
        setError('Erreur de chargement');
        console.error('Failed to fetch invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();

    // Subscribe to realtime changes
    const setupRealtime = async () => {
      channel = supabase
        .channel(`invoice-${invoiceId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `id=eq.${invoiceId}`,
          },
          (payload) => {
            setInvoice(payload.new);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [invoiceId]);

  return { invoice, loading, error };
}
