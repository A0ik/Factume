'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText, TrendingUp, CheckCircle2, Clock, AlertTriangle, Plus, Loader2,
  Download, Eye, Printer, Mail, Send, Receipt,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency, formatDateShort, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';
import { useCabinetEmailCapture } from '@/components/cabinet/CabinetEmailCaptureModal';

interface CabinetInvoice {
  id: string;
  number: string;
  client_id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  objet: string | null;
  items: any[];
}

const STATUS_DOT: Record<string, { dot: string; label: string }> = {
  draft: { dot: '#9ca3af', label: 'Brouillon' },
  sent: { dot: '#3b82f6', label: 'Envoyée' },
  paid: { dot: '#10b981', label: 'Payée' },
  overdue: { dot: '#ef4444', label: 'En retard' },
  cancelled: { dot: '#9ca3af', label: 'Annulée' },
};

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'paid', label: 'Payées' },
  { value: 'sent', label: 'Envoyées' },
  { value: 'overdue', label: 'En retard' },
  { value: 'draft', label: 'Brouillons' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = d.toISOString().slice(0, 7);
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

const VAT_RATES = [
  { value: 0, label: '0%' },
  { value: 5.5, label: '5,5%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
];

function Paywall({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${accent}1a` }}>
          <Receipt size={40} style={{ color: accent }} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Facturation du cabinet</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Gérez vos factures d&apos;honoraires, suivez les paiements et relancez vos clients.
        </p>
        <Link
          href="/paywall?plan=business"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold shadow-lg"
          style={{ backgroundColor: accent }}
        >
          Passer au plan Business
        </Link>
      </motion.div>
    </div>
  );
}

export default function CabinetFacturationPage() {
  const sub = useSubscription();
  const { clients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  // PROMÉTHÉE (CIBLE 2 #1) — capture email IN-PLACE quand l'envoi échoue (fini l'impasse
  // « allez sur la fiche client »). Persiste contact_email puis relance l'envoi.
  const { promptForEmail, modal: emailCaptureModal } = useCabinetEmailCapture();

  const { data: invoices, loading, error, refresh } = useCabinetData<CabinetInvoice[]>(
    '/api/cabinet/invoices',
  );

  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [viewing, setViewing] = useState<CabinetInvoice | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // Nouvelle facture
  const [nClient, setNClient] = useState('');
  const [nObjet, setNObjet] = useState('');
  const [nHt, setNHt] = useState('');
  const [nVat, setNVat] = useState(20);
  const [nDue, setNDue] = useState('');
  const [creating, setCreating] = useState(false);

  const clientName = useCallback(
    (id: string) => {
      const c: any = clients.find((cl: any) => cl.id === id);
      if (!c) return '—';
      return c.client_type === 'manual'
        ? c.company_name || 'Client'
        : c.profile?.company_name || c.profile?.first_name || 'Client';
    },
    [clients],
  );

  const list = invoices || [];

  const kpis = useMemo(() => {
    const sum = (st: string) => list.filter((i) => i.status === st).reduce((s, i) => s + (i.amount_ttc || 0), 0);
    return {
      total: list.reduce((s, i) => s + (i.amount_ttc || 0), 0),
      paid: sum('paid'),
      pending: sum('sent'),
      overdue: sum('overdue'),
      nPaid: list.filter((i) => i.status === 'paid').length,
      nPending: list.filter((i) => i.status === 'sent').length,
      nOverdue: list.filter((i) => i.status === 'overdue').length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((inv) => {
      const okStatus = !statusFilter || inv.status === statusFilter;
      const okMonth = !monthFilter || (inv.issue_date || '').startsWith(monthFilter);
      return okStatus && okMonth;
    });
  }, [list, statusFilter, monthFilter]);

  const handleMarkPaid = async (inv: CabinetInvoice) => {
    setMarkingId(inv.id);
    try {
      await cabinetMutation('/api/cabinet/invoices', 'PATCH', { id: inv.id, status: 'paid' });
      clearCabinetCache('/api/cabinet/invoices');
      toast.success(`${inv.number} marquée comme payée`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setMarkingId(null);
    }
  };

  const handleSendEmail = async (inv: CabinetInvoice) => {
    const doSend = () => cabinetMutation('/api/cabinet/invoices/send', 'POST', { invoiceId: inv.id });
    setSendingId(inv.id);
    try {
      await doSend();
      toast.success(`${inv.number} envoyée`);
    } catch (err: any) {
      const msg = err?.message || '';
      const c: any = inv.client_id ? clients.find((cl: any) => cl.id === inv.client_id) : null;
      // PROMÉTHÉE — si l'envoi échoue sur email manquant, on saisit l'email IN-PLACE
      // (persistance PATCH) puis on relance, au lieu d'orienter vers une fiche read-only.
      if (c && /fiche client/i.test(msg)) {
        setSendingId(null);
        const captured = await promptForEmail({ id: c.id, name: clientName(c.id) });
        if (!captured) return; // annulé
        setSendingId(inv.id);
        try {
          await doSend();
          toast.success(`${inv.number} envoyée`);
        } catch (e2: any) {
          toast.error(e2.message || "Erreur lors de l'envoi");
        }
      } else {
        toast.error(msg || "Erreur lors de l'envoi");
      }
    } finally {
      setSendingId(null);
    }
  };

  // ASTRÉE (CIBLE 2b) — Téléchargement / aperçu PDF d'une facture d'honoraires.
  const handlePdf = async (inv: CabinetInvoice, mode: 'download' | 'preview' = 'download') => {
    setPdfLoadingId(inv.id);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }
      const res = await fetch(`/api/cabinet/invoices/${inv.id}/pdf${mode === 'preview' ? '?mode=preview' : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur génération PDF');
      }
      const blob = await res.blob();
      const filename = `${inv.number.replace(/[/\r\n"']/g, '-')}.pdf`;
      const url = URL.createObjectURL(blob);
      if (mode === 'preview') {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
      }
    } catch (err: any) {
      toast.error(err.message || 'Impossible de générer le PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!nClient) {
      toast.error('Sélectionnez un client');
      return;
    }
    const ht = parseFloat(nHt);
    if (!ht || ht <= 0) {
      toast.error('Montant HT invalide');
      return;
    }
    setCreating(true);
    try {
      await cabinetMutation('/api/cabinet/invoices', 'POST', {
        client_id: nClient,
        objet: nObjet || null,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: nDue || null,
        items: [{ description: nObjet || 'Honoraires', unit_price: ht, quantity: 1, vat_rate: nVat }],
      });
      clearCabinetCache('/api/cabinet/invoices');
      toast.success('Facture créée');
      setShowNew(false);
      setNClient('');
      setNObjet('');
      setNHt('');
      setNDue('');
      setNVat(20);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    downloadXLSX(`cabinet-facturation-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Factures',
        headers: ['N°', 'Client', 'Objet', 'HT', 'TVA', 'TTC', 'Date', 'Échéance', 'Statut'],
        rows: filtered.map((i) => [
          i.number,
          clientName(i.client_id),
          i.objet || '',
          i.amount_ht,
          i.amount_tva,
          i.amount_ttc,
          i.issue_date,
          i.due_date || '',
          STATUS_DOT[i.status]?.label || i.status,
        ]),
      },
    ]);
    toast.success('Export Excel téléchargé');
  };

  if (!sub.isBusiness && !sub.isTrialActive) return <Paywall accent={primaryColor} />;

  const columns: Column<CabinetInvoice>[] = [
    {
      key: 'number',
      header: 'N°',
      sortValue: (i) => i.number,
      sortable: true,
      render: (i) => <span className="text-sm font-bold" style={{ color: primaryColor }}>{i.number}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortValue: (i) => clientName(i.client_id),
      sortable: true,
      render: (i) => (
        <span className="text-sm font-semibold text-gray-900 truncate">{clientName(i.client_id)}</span>
      ),
    },
    {
      key: 'objet',
      header: 'Objet',
      hideOnMobile: true,
      render: (i) => <span className="text-sm text-gray-500 truncate">{i.objet || '—'}</span>,
    },
    {
      key: 'ht',
      header: 'HT',
      align: 'right',
      hideOnMobile: true,
      render: (i) => <span className="text-sm text-gray-700">{formatCurrency(i.amount_ht)}</span>,
    },
    {
      key: 'tva',
      header: 'TVA',
      align: 'right',
      hideOnMobile: true,
      render: (i) => <span className="text-sm text-gray-500">{formatCurrency(i.amount_tva)}</span>,
    },
    {
      key: 'ttc',
      header: 'TTC',
      align: 'right',
      sortValue: (i) => i.amount_ttc,
      sortable: true,
      render: (i) => (
        <span className={cn('text-sm font-bold', i.status === 'overdue' ? 'text-red-600' : 'text-gray-900')}>
          {formatCurrency(i.amount_ttc)}
        </span>
      ),
    },
    {
      key: 'issue_date',
      header: 'Date',
      hideOnMobile: true,
      sortValue: (i) => i.issue_date,
      sortable: true,
      render: (i) => <span className="text-sm text-gray-500">{formatDateShort(i.issue_date)}</span>,
    },
    {
      key: 'due_date',
      header: 'Échéance',
      hideOnMobile: true,
      render: (i) => (
        <span className={cn('text-sm', i.status === 'overdue' && 'text-red-600 font-semibold')}>
          {i.due_date ? formatDateShort(i.due_date) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (i) => {
        const cfg = STATUS_DOT[i.status] || STATUS_DOT.draft;
        return <StatusBadge dot={cfg.dot}>{cfg.label}</StatusBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <div className="flex items-center justify-end gap-0.5">
          <IconBtn
            title="Télécharger le PDF"
            onClick={() => handlePdf(i, 'download')}
            disabled={pdfLoadingId === i.id}
            hover="brand"
          >
            {pdfLoadingId === i.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </IconBtn>
          <IconBtn title="Détails" onClick={() => setViewing(i)}>
            <Eye size={14} />
          </IconBtn>
          {i.status !== 'paid' && (
            <IconBtn
              title="Marquer payée"
              onClick={() => handleMarkPaid(i)}
              disabled={markingId === i.id}
              hover="green"
            >
              {markingId === i.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            </IconBtn>
          )}
          <IconBtn
            title="Envoyer par email"
            onClick={() => handleSendEmail(i)}
            disabled={sendingId === i.id}
            hover="brand"
          >
            {sendingId === i.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total facturé" value={formatCurrency(kpis.total)} icon={TrendingUp} accent="#10b981" hint={`${list.length} facture(s)`} />
        <KpiCard label="Payées" value={formatCurrency(kpis.paid)} icon={CheckCircle2} accent="#22c55e" hint={`${kpis.nPaid} payée(s)`} />
        <KpiCard label="En attente" value={formatCurrency(kpis.pending)} icon={Clock} accent="#f59e0b" hint={`${kpis.nPending} en attente`} />
        <KpiCard label="En retard" value={formatCurrency(kpis.overdue)} icon={AlertTriangle} accent={kpis.nOverdue > 0 ? '#ef4444' : '#6b7280'} hint={`${kpis.nOverdue} en retard`} />
      </div>

      <SectionCard
        title={`Factures (${filtered.length})`}
        icon={FileText}
        accent={primaryColor}
        noPadding
        action={
          <>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              title="Exporter Excel"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nouvelle</span>
            </button>
          </>
        }
      >
        {loading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Erreur de chargement" description={error} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(i) => i.id}
            searchable
            searchPlaceholder="Rechercher par n°, client, objet…"
            searchText={(i) => `${i.number} ${clientName(i.client_id)} ${i.objet || ''}`}
            emptyIcon={FileText}
            emptyTitle="Aucune facture"
            emptyDescription="Créez votre première facture pour suivre vos honoraires."
            initialSort={{ key: 'issue_date', dir: 'desc' }}
            toolbar={
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border-0 outline-none cursor-pointer"
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border-0 outline-none cursor-pointer"
                >
                  <option value="">Tous les mois</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </>
            }
          />
        )}
      </SectionCard>

      {/* Modale détail */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.number}
        icon={FileText}
        accent={primaryColor}
        footer={
          viewing && (
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePdf(viewing, 'preview')}
                  disabled={pdfLoadingId === viewing.id}
                  className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Printer size={14} /> Aperçu
                </button>
                <button
                  onClick={() => handlePdf(viewing, 'download')}
                  disabled={pdfLoadingId === viewing.id}
                  className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50"
                >
                  {pdfLoadingId === viewing.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Télécharger
                </button>
              </div>
              {viewing.status !== 'paid' && (
                <button
                  onClick={() => { handleMarkPaid(viewing); setViewing(null); }}
                  className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <CheckCircle2 size={14} /> Marquer payée
                </button>
              )}
            </div>
          )
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Client" value={clientName(viewing.client_id)} />
              <Detail label="Statut" value={STATUS_DOT[viewing.status]?.label || viewing.status} />
              <Detail label="Date d'émission" value={formatDateShort(viewing.issue_date)} />
              <Detail label="Échéance" value={viewing.due_date ? formatDateShort(viewing.due_date) : '—'} />
            </div>
            {viewing.objet && <Detail label="Objet" value={viewing.objet} />}
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              <Row label="Total HT" value={formatCurrency(viewing.amount_ht)} />
              <Row label="TVA" value={formatCurrency(viewing.amount_tva)} />
              <Row label="Total TTC" value={formatCurrency(viewing.amount_ttc)} strong />
            </div>
          </div>
        )}
      </Modal>

      {/* Modale nouvelle facture */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Nouvelle facture"
        icon={Plus}
        accent={primaryColor}
        footer={
          <>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Créer la facture
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={nClient}
              onChange={(e) => setNClient(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Sélectionner un client…</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Objet</label>
            <input
              type="text"
              value={nObjet}
              onChange={(e) => setNObjet(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Ex : Honoraires comptables T3 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Montant HT (€)</label>
              <input
                type="number"
                step="0.01"
                value={nHt}
                onChange={(e) => setNHt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">TVA</label>
              <select
                value={nVat}
                onChange={(e) => setNVat(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {VAT_RATES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          {nHt && parseFloat(nHt) > 0 && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm flex justify-between">
              <span className="text-gray-500">Total TTC estimé</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(parseFloat(nHt) * (1 + nVat / 100))}
              </span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Échéance</label>
            <input
              type="date"
              value={nDue}
              onChange={(e) => setNDue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>
      </Modal>

      {emailCaptureModal}
    </motion.div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  hover = 'gray',
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  hover?: 'gray' | 'green' | 'brand';
}) {
  const hoverCls =
    hover === 'green'
      ? 'hover:text-green-600 hover:bg-green-50'
      : hover === 'brand'
        ? 'hover:text-brand-600 hover:bg-brand-50'
        : 'hover:text-gray-700 hover:bg-gray-100';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn('p-1.5 rounded-lg text-gray-400 transition-colors disabled:opacity-40', hoverCls)}
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={cn('text-sm', strong ? 'font-bold text-gray-900' : 'text-gray-500')}>{label}</span>
      <span className={cn('text-sm', strong ? 'font-black text-gray-900' : 'font-semibold text-gray-700')}>{value}</span>
    </div>
  );
}
