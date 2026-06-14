'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import {
  Loader2, FileText, CheckCircle, AlertTriangle, PenTool,
  Building2, User, Calendar, Euro, ExternalLink, Check, Clock,
  ShieldCheck, Lock, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type QuoteItem = {
  id?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  vat_rate?: number;
  total?: number;
};

export default function QuoteSigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasDrawnRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [consent, setConsent] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tokenRecord, setTokenRecord] = useState<any>(null);

  useEffect(() => {
    loadQuote();
  }, [token]);

  const loadQuote = async () => {
    try {
      const res = await fetch(`/api/quote-signing/${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'already_signed') {
          setAlreadySigned(true);
          setLoading(false);
          return;
        }
        setError(data.error === 'Lien expiré' ? 'Ce lien a expiré.' : 'Ce lien est invalide.');
        setLoading(false);
        return;
      }

      setQuote(data.contract);
      setClient(data.client);
      setProfile(data.profile);
      setTokenRecord(data.tokenRecord);
      setSignerName(data.client?.name || '');
    } catch {
      setError('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  // ── Canvas signature ────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#EDEDED'; // encre claire, lisible sur fond Obsidian
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
    hasDrawnRef.current = true;
    if (!hasDrawn) setHasDrawn(true);
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setHasDrawn(false);
  };

  // ── PDF (route publique, token-gated) ───────────────────────────────
  const handlePreviewPDF = async () => {
    if (!quote || pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/quote-signing/${token}/pdf`);
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Impossible d\'ouvrir le PDF pour le moment.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSign = async () => {
    if (!hasDrawnRef.current) {
      toast.error('Veuillez signer dans le cadre');
      return;
    }
    if (!consent) {
      toast.error('Veuillez cocher la case de consentement');
      return;
    }
    if (!signerName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas?.toDataURL('image/png') || '';

      const res = await fetch(`/api/quote-signing/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl, signerName: signerName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setSigned(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('fr-FR') : '—';
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  // Emerald par défaut (charte Factu.me), sauf si l'expéditeur a personnalisé.
  const accent = profile?.accent_color || '#10b981';
  const items: QuoteItem[] = Array.isArray(quote?.items) ? quote.items : [];
  const showBreakdown = items.length > 0;

  // ── États ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell accent={accent}>
        <div className="flex flex-col items-center gap-4 py-32">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
          <p className="text-zinc-500 text-sm">Chargement du devis…</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell accent={accent}>
        <div className="flex flex-col items-center text-center max-w-md mx-auto py-24">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">{error}</h1>
          <p className="text-zinc-500 text-sm">Contactez l'expéditeur pour obtenir un nouveau lien.</p>
        </div>
      </Shell>
    );
  }

  if (alreadySigned || signed) {
    return (
      <Shell accent={accent}>
        <div className="flex flex-col items-center text-center max-w-md mx-auto py-24">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
            style={{ backgroundColor: `${accent}1A`, boxShadow: `0 0 60px ${accent}33` }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: accent }} />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Devis signé avec succès</h1>
          <p className="text-zinc-400 text-sm mb-6">
            L'expéditeur a été notifié et a reçu le devis signé.
          </p>
          {quote && (
            <button
              onClick={handlePreviewPDF}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-200 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Voir le PDF
            </button>
          )}
          <p className="text-zinc-600 text-xs mt-8">
            Signature horodatée • {new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      </Shell>
    );
  }

  // ── Page principale ─────────────────────────────────────────────────
  return (
    <Shell accent={accent}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        {/* En-tête émetteur */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt={profile?.company_name || 'Logo'}
                className="w-11 h-11 rounded-xl object-cover bg-white/5 border border-white/10 shrink-0"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0"
                style={{ backgroundColor: `${accent}1A`, color: accent, border: `1px solid ${accent}33` }}
              >
                {(profile?.company_name || 'F').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {profile?.company_name || 'Un professionnel factu.me'}
              </p>
              <p className="text-xs text-zinc-500">vous a envoyé un devis à signer</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 shrink-0">
            <Lock className="w-3.5 h-3.5" style={{ color: accent }} />
            Sécurisé eIDAS
          </div>
        </header>

        {/* Carte résumé */}
        {quote && client && (
          <section className="rounded-2xl border border-white/10 bg-[#111113]/80 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Titre */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${accent}1A` }}
                >
                  <FileText className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Devis</p>
                  <h2 className="text-base font-semibold text-zinc-100 truncate">N° {quote.number}</h2>
                </div>
              </div>
              <button
                onClick={handlePreviewPDF}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 shrink-0"
                style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}10` }}
              >
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span className="hidden xs:inline">Voir le PDF</span>
                <span className="xs:hidden">PDF</span>
              </button>
            </div>

            {/* Méta client / dates */}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 px-5 sm:px-6 py-5 border-b border-white/[0.06]">
              <Meta icon={<User className="w-4 h-4" />} label="Client" value={client.name} sub={client.email} />
              <Meta
                icon={<Building2 className="w-4 h-4" />}
                label="Émetteur"
                value={profile?.company_name || '—'}
              />
              <Meta icon={<Calendar className="w-4 h-4" />} label="Date d'émission" value={fmtDate(quote.issue_date)} />
              <Meta
                icon={<Clock className="w-4 h-4" />}
                label="Valide jusqu'au"
                value={fmtDate(quote.due_date)}
                valueClass="text-zinc-200"
              />
            </div>

            {/* Lignes */}
            {showBreakdown && (
              <div className="px-5 sm:px-6 py-5 border-b border-white/[0.06]">
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="font-medium pb-2 pr-4">Description</th>
                        <th className="font-medium pb-2 pr-4 text-right whitespace-nowrap">Qté</th>
                        <th className="font-medium pb-2 pr-4 text-right whitespace-nowrap">Prix HT</th>
                        <th className="font-medium pb-2 text-right whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {items.map((it, i) => (
                        <tr key={it.id || i} className="text-zinc-300">
                          <td className="py-2.5 pr-4">
                            <span className="text-zinc-200">{it.description || '—'}</span>
                            {typeof it.vat_rate === 'number' && (
                              <span className="block text-[11px] text-zinc-600">TVA {it.vat_rate}%</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-400">{it.quantity ?? 1}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-400">
                            {fmtMoney(it.unit_price || 0)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-medium text-zinc-200">
                            {fmtMoney(it.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totaux */}
            <div className="px-5 sm:px-6 py-5 space-y-2">
              <TotalRow label="Sous-total HT" value={fmtMoney(quote.subtotal ?? 0)} />
              {Number(quote.discount_amount) > 0 && (
                <TotalRow
                  label={`Remise${quote.discount_percent ? ` (${quote.discount_percent}%)` : ''}`}
                  value={`− ${fmtMoney(quote.discount_amount)}`}
                  className="text-emerald-400/90"
                />
              )}
              <TotalRow label="TVA" value={fmtMoney(quote.vat_amount ?? 0)} />
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.08]">
                <span className="text-sm text-zinc-400">Total TTC</span>
                <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
                  {fmtMoney(quote.total ?? 0)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="px-5 sm:px-6 py-4 border-t border-white/[0.06] bg-black/20">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">Notes</p>
                <p className="text-sm text-zinc-400 whitespace-pre-line leading-relaxed">{quote.notes}</p>
              </div>
            )}

            {/* Validité */}
            <div
              className="flex items-start gap-2.5 px-5 sm:px-6 py-3.5 border-t border-white/[0.06]"
              style={{ backgroundColor: `${accent}0D` }}
            >
              <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />
              <p className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-zinc-300 font-medium">Validité :</span> ce devis est valable 30 jours à
                compter de sa date d'émission. En signant, vous acceptez le devis et vous engagez à payer le
                montant indiqué.
              </p>
            </div>
          </section>
        )}

        {/* Carte signature */}
        <section className="rounded-2xl border border-white/10 bg-[#111113]/80 backdrop-blur-sm shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5" style={{ color: accent }} />
            <h3 className="font-semibold text-zinc-100">Votre signature</h3>
          </div>

          <div className="relative rounded-xl border border-dashed border-white/15 bg-black/30 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none cursor-crosshair block"
              style={{ height: 180 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
              onTouchMove={(e) => { e.preventDefault(); draw(e); }}
              onTouchEnd={stopDraw}
            />
            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-zinc-600 select-none">
                  ✍️ Signez ici avec la souris ou le doigt
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={clearCanvas}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Effacer et recommencer
            </button>
            <span className="text-[11px] text-zinc-600">Signature électronique horodatée</span>
          </div>

          {/* Nom du signataire */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Nom complet du signataire</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-white/25 focus:ring-2 focus:ring-white/10 text-sm"
              placeholder="Votre nom et prénom"
            />
          </div>

          {/* Consentement */}
          <label className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-black/30 transition-colors">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-white/20 bg-black/40 shrink-0"
              style={{ accentColor: accent }}
            />
            <div className="text-sm">
              <p className="font-medium text-zinc-200">J'accepte ce devis en signant</p>
              <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                Je reconnais que ma signature électronique a la même valeur légale qu'une signature manuscrite
                conformément au règlement eIDAS n°910/2014. J'atteste avoir lu et accepté l'intégralité du devis
                et m'engage à payer le montant indiqué.
              </p>
            </div>
          </label>
        </section>

        {/* Bouton signer */}
        <button
          onClick={handleSign}
          disabled={signing || !consent || !hasDrawn}
          className="group w-full py-4 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:brightness-110"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 40px ${accent}40, 0 8px 24px -8px ${accent}80`,
          }}
        >
          {signing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Validation…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" /> Signer et accepter le devis
            </span>
          )}
        </button>

        {/* Pied de confiance */}
        <div className="flex items-center justify-center gap-4 pt-2 pb-6 text-[11px] text-zinc-600">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> eIDAS</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Chiffré</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Propulsé par Factu.me</span>
        </div>
      </div>
    </Shell>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────

function Shell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#09090B] text-zinc-100 selection:bg-emerald-500/30">
      {/* Fond : aurore émeraude très subtile */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-20 w-[480px] h-[480px] rounded-full blur-[130px] opacity-[0.18]"
          style={{ backgroundColor: accent }}
        />
        <div className="absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>
      {/* Barre d'accent */}
      <div
        className="relative w-full h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function Meta({
  icon, label, value, sub, valueClass = 'text-zinc-200',
}: {
  icon: React.ReactNode; label: string; value?: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className="text-zinc-600 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className={`text-sm font-medium truncate ${valueClass}`}>{value || '—'}</p>
        {sub && <p className="text-xs text-zinc-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function TotalRow({
  label, value, className = '',
}: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`tabular-nums ${className || 'text-zinc-300'}`}>{value}</span>
    </div>
  );
}
