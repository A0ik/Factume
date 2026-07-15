'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export interface CabinetClientEditable {
  id: string;
  company_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  siret?: string | null;
  notes?: string | null;
}

interface Props {
  client: CabinetClientEditable;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  company_name: '', contact_name: '', contact_email: '', phone: '',
  address: '', zip_code: '', city: '', siret: '', notes: '',
};

/**
 * PROMÉTHÉE (CIBLE 2 #3) — La fiche client cabinet était 100 % read-only.
 * Cette modale est le chaînon UI qui rend les champs éditables (dont l'email,
 * cause de l'impasse « allez sur la fiche client »). PATCH /api/cabinet/clients/[id].
 */
export default function EditCabinetClientModal({ client, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      company_name: client.company_name || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      phone: client.phone || '',
      address: client.address || '',
      zip_code: client.zip_code || '',
      city: client.city || '',
      siret: client.siret || '',
      notes: client.notes || '',
    });
  }, [client]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const email = form.contact_email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Format d\'email invalide.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Session expirée.'); return; }
      const res = await fetch(`/api/cabinet/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          contact_email: email,
          phone: form.phone.trim(),
          address: form.address.trim(),
          zip_code: form.zip_code.trim(),
          city: form.city.trim(),
          siret: form.siret.trim(),
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Échec de l\'enregistrement');
      toast.success('Fiche client mise à jour.');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof typeof EMPTY; label: string; type?: string; full?: boolean }> = [
    { key: 'company_name', label: 'Raison sociale', full: true },
    { key: 'contact_name', label: 'Nom du contact' },
    { key: 'contact_email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Téléphone', type: 'tel' },
    { key: 'siret', label: 'SIRET' },
    { key: 'address', label: 'Adresse', full: true },
    { key: 'zip_code', label: 'Code postal' },
    { key: 'city', label: 'Ville' },
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#15151a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#15151a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Modifier la fiche client</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                Coordonnées, email et SIRET
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  {f.label}
                </label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-5 border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-end gap-2 bg-white dark:bg-[#15151a]">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium text-sm flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
