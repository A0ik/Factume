'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Sparkles, Plus } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface QuickCreateSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * QuickCreateSheet — Création rapide de facture en Bottom Sheet
 *
 * UX mobile premium : pas de navigation complète.
 * L'utilisateur sélectionne un client, saisit un montant,
 * et un brouillon est créé en une seule interaction fluide.
 */
export default function QuickCreateSheet({ open, onClose }: QuickCreateSheetProps) {
  const router = useRouter();
  const { clients, createInvoice } = useDataStore();
  const { profile } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedClientId(null);
      setAmount('');
      setCreating(false);
    }
  }, [open]);

  const handleSelectClient = (clientId: string) => {
    triggerHaptic('light');
    setSelectedClientId(clientId);
    // Auto-focus montant après sélection
    setTimeout(() => amountRef.current?.focus(), 150);
  };

  const handleCreate = async () => {
    if (!selectedClientId || !amount || !profile) return;

    triggerHaptic('medium');
    setCreating(true);
    try {
      const total = parseFloat(amount.replace(',', '.'));
      if (isNaN(total) || total <= 0) {
        toast.error('Montant invalide');
        return;
      }

      const subtotal = total / 1.2; // TVA 20% par défaut
      const vat = total - subtotal;

      const invoice = await createInvoice(
        {
          client_id: selectedClientId,
          document_type: 'invoice',
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          items: [
            {
              id: crypto.randomUUID(),
              description: 'Prestation',
              quantity: 1,
              unit_price: Math.round(subtotal * 100) / 100,
              vat_rate: 20,
            },
          ],
          notes: '',
        },
        profile
      );

      triggerHaptic('success');
      toast.success('Brouillon créé !');
      onClose();
      router.push(`/invoices/${invoice.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-0 right-0 bottom-0 bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-hidden"
            style={{
              height: '90vh',
              paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles size={17} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Création rapide</h3>
                  <p className="text-xs text-muted-foreground">Brouillon en 2 taps</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none px-6 space-y-5">
              {/* Step 1: Client */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Client
                </label>

                {selectedClient ? (
                  <motion.button
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={() => setSelectedClientId(null)}
                    className="w-full flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedClient.name}</p>
                      {selectedClient.email && (
                        <p className="text-xs text-muted-foreground truncate">{selectedClient.email}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20">
                      Tap pour changer
                    </span>
                  </motion.button>
                ) : (
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                      className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                    {/* Client list */}
                    <div className="mt-2 space-y-1 max-h-[40vh] overflow-y-auto">
                      <AnimatePresence>
                        {filteredClients.map((client) => (
                          <motion.button
                            key={client.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handleSelectClient(client.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted active:bg-secondary transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                              {client.email && (
                                <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                      {filteredClients.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {search ? 'Aucun client trouvé' : 'Aucun client créé'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Amount */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Montant TTC
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-semibold">
                    €
                  </span>
                  <input
                    ref={amountRef}
                    type="decimal"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-4 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all tabular-nums"
                  />
                </div>
                {amount && !isNaN(parseFloat(amount.replace(',', '.'))) && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground mt-1.5 px-1"
                  >
                    TVA 20% incluse · HT : {formatCurrency(parseFloat(amount.replace(',', '.')) / 1.2)}
                  </motion.p>
                )}
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2">
                {[50, 100, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(String(preset))}
                    className="flex-1 py-2 rounded-xl bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-emerald-500/30 active:scale-95 transition-all"
                  >
                    {preset}€
                  </button>
                ))}
              </div>
            </div>

            {/* CTA — sticky bottom */}
            <div className="px-6 pt-4 border-t border-border mt-auto">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={!selectedClientId || !amount || creating}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-base font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {creating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Plus size={20} strokeWidth={2.5} />
                )}
                {creating ? 'Création...' : 'Créer le brouillon'}
              </motion.button>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Formulaire complet →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
