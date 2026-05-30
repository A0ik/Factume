'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Download, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { generateInvoiceHtml } from '@/lib/pdf';
import type { Invoice, InvoiceItem, Profile, LegalStatus, SubscriptionTier, DocumentType, InvoiceStatus } from '@/types';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

const VAT_RATES = [
  { label: '20%', value: 20 },
  { label: '10%', value: 10 },
  { label: '5,5%', value: 5.5 },
  { label: '2,1%', value: 2.1 },
  { label: '0% (exonéré)', value: 0 },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function GenerateurForm() {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);

  // User info
  const [companyName, setCompanyName] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userCity, setUserCity] = useState('');
  const [userPostal, setUserPostal] = useState('');
  const [userSiret, setUserSiret] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Client info
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientPostal, setClientPostal] = useState('');

  // Invoice details
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);

  // Calculations
  const calcItemTotal = (item: LineItem) => item.quantity * item.unit_price;
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const vatAmount = items.reduce((s, i) => s + calcItemTotal(i) * (i.vat_rate / 100), 0);
  const total = subtotal + vatAmount;

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: uid(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }, []);

  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + parseInt(paymentTerms || '30'));
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const invoiceItems: InvoiceItem[] = items.map(item => ({
        id: item.id,
        description: item.description || 'Prestation',
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        total: item.quantity * item.unit_price,
      }));

      const invoice: Invoice = {
        id: 'free-' + uid(),
        user_id: 'free',
        number: `FAC-${Date.now().toString().slice(-6)}`,
        document_type: 'invoice' as DocumentType,
        status: 'sent' as InvoiceStatus,
        issue_date: issueDate,
        due_date: dueDateStr,
        items: invoiceItems,
        subtotal,
        vat_amount: vatAmount,
        total,
        notes: notes || undefined,
        client_name_override: clientName || undefined,
        client_address: clientAddress || undefined,
        client_city: clientCity || undefined,
        client_postal_code: clientPostal || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const profile: Profile = {
        id: 'free',
        email: userEmail || '',
        company_name: companyName || 'Mon entreprise',
        address: userAddress || undefined,
        city: userCity || undefined,
        postal_code: userPostal || undefined,
        country: 'FR',
        phone: userPhone || undefined,
        siret: userSiret || undefined,
        template_id: 1,
        accent_color: '#10b981',
        legal_status: 'auto-entrepreneur' as LegalStatus,
        subscription_tier: 'free' as SubscriptionTier,
        invoice_count: 0,
        monthly_invoice_count: 0,
        invoice_month: '',
        invoice_prefix: 'FAC',
        onboarding_done: true,
        created_at: new Date().toISOString(),
      };

      const html = generateInvoiceHtml(invoice, profile);

      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
      }
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section id="generateur" className="py-16 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Créez votre facture gratuitement
          </h2>
          <p className="text-lg text-gray-600">
            Remplissez les champs, téléchargez votre PDF. Aucune inscription requise.
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
          {/* User info section */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <span className="font-bold text-lg">Vos informations</span>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="p-6 sm:p-8 space-y-8">
            {/* User info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nom / Raison sociale *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: Jean Dupont ou Dupont Consulting"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={e => setUserAddress(e.target.value)}
                  placeholder="12 rue de la Paix"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Code postal</label>
                  <input
                    type="text"
                    value={userPostal}
                    onChange={e => setUserPostal(e.target.value)}
                    placeholder="75001"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                  <input
                    type="text"
                    value={userCity}
                    onChange={e => setUserCity(e.target.value)}
                    placeholder="Paris"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">SIRET</label>
                <input
                  type="text"
                  value={userSiret}
                  onChange={e => setUserSiret(e.target.value)}
                  placeholder="123 456 789 00010"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="jean@exemple.fr"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Client info */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Client</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Nom ou raison sociale du client"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    placeholder="Adresse du client"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={clientPostal}
                      onChange={e => setClientPostal(e.target.value)}
                      placeholder="75001"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={clientCity}
                      onChange={e => setClientCity(e.target.value)}
                      placeholder="Paris"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Dates & payment */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dates & conditions</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date d&apos;émission</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Délai de paiement</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  >
                    <option value="0">À réception</option>
                    <option value="15">15 jours</option>
                    <option value="30">30 jours</option>
                    <option value="45">45 jours</option>
                    <option value="60">60 jours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Conditions, références..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Line items */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Prestations / Produits</h3>
              <div className="space-y-3">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-2 text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Quantité</div>
                  <div className="col-span-2">Prix unitaire HT</div>
                  <div className="col-span-2">TVA</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1" />
                </div>

                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Description de la prestation"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={item.vat_rate}
                        onChange={e => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      >
                        {VAT_RATES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-1 flex items-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {calcItemTotal(item).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addItem}
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une ligne
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-emerald-50 rounded-2xl p-6">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total HT</span>
                  <span className="font-medium">{subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA</span>
                  <span className="font-medium">{vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-emerald-200">
                  <span>Total TTC</span>
                  <span>{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <p className="text-xs text-gray-400">
                En utilisant cet outil gratuit, vous acceptez nos{' '}
                <a href="/legal/cgu" className="underline hover:text-gray-600">CGU</a>.
                La facture inclut un discret &quot;Généré avec Factu.me&quot;.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={generating || !companyName || !clientName || items.every(i => !i.description)}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2" />
                  )}
                  Télécharger en PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
