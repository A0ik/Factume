'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { Loader2, FileText, CheckCircle, AlertTriangle, Download, PenTool, Building2, User, Calendar, Euro, ExternalLink, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

  // Canvas drawing
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
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
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
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
    hasDrawnRef.current = true;
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
  };

  const handlePreviewPDF = async () => {
    if (!quote) return;
    try {
      const res = await fetch('/api/invoices/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: quote.id }),
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Erreur lors de la génération du PDF');
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

  const fmtDate = (d?: string) => d ? new Date(d.includes('T') ? d : `${d}T00:00:00`).toLocaleDateString('fr-FR') : '—';
  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const accent = profile?.accent_color || '#3B82F6';

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-500 text-sm">Contactez l'expéditeur pour obtenir un nouveau lien.</p>
        </div>
      </div>
    );
  }

  // Already signed
  if (alreadySigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
            <CheckCircle className="w-10 h-10" style={{ color: accent }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Devis signé avec succès</h1>
          <p className="text-gray-500 text-sm">L'expéditeur a été notifié et a reçu le devis signé.</p>
          <p className="text-gray-400 text-xs mt-4">Signature horodatée : {new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="w-full h-2" style={{ backgroundColor: accent }} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
            <FileText className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Signature du devis</h1>
          {profile?.company_name && <p className="text-gray-500 mt-1">{profile.company_name}</p>}
        </div>

        {/* Quote summary */}
        {quote && client && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Résumé du devis</h3>
              <button
                onClick={handlePreviewPDF}
                className="text-sm flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" /> Voir le PDF complet
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Client</p>
                  <p className="font-medium text-gray-900">{client.name}</p>
                  {client.email && <p className="text-gray-500 text-xs">{client.email}</p>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Expéditeur</p>
                  <p className="font-medium text-gray-900">{profile?.company_name || 'Entreprise'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Date d'émission</p>
                  <p className="font-medium text-gray-900">{fmtDate(quote.issue_date)}</p>
                  {quote.due_date && <p className="text-gray-500 text-xs">Valide jusqu'au : {fmtDate(quote.due_date)}</p>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Euro className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Montant total</p>
                  <p className="font-bold text-lg" style={{ color: accent }}>{fmtMoney(quote.total)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{quote.notes}</p>
              </div>
            )}

            {/* Validité note */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Validité :</strong> Ce devis est valable 30 jours à compter de sa date d'émission. En signant, vous acceptez le devis et vous engagez à payer le montant indiqué.
              </p>
            </div>
          </div>
        )}

        {/* Signature section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <PenTool className="w-5 h-5" style={{ color: accent }} />
            Votre signature
          </h3>

          <p className="text-sm text-gray-500">Dessinez votre signature dans le cadre ci-dessous :</p>

          <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none cursor-crosshair"
              style={{ height: 160 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={(e) => { e.preventDefault(); startDraw(e); }}
              onTouchMove={(e) => { e.preventDefault(); draw(e); }}
              onTouchEnd={stopDraw}
            />
          </div>

          <button onClick={clearCanvas} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Effacer et recommencer
          </button>

          {/* Signer name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Nom complet du signataire</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-sm"
              placeholder="Votre nom et prénom"
            />
          </div>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-5 h-5 text-blue-600 rounded focus:ring-blue-600"
            />
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white">J'accepte ce devis en signant</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                En cochant cette case, je reconnais que ma signature électronique a la même valeur légale qu'une signature manuscrite conformément au règlement eIDAS n°910/2014. J'atteste avoir lu et accepté l'intégralité du devis et m'engage à payer le montant indiqué.
              </p>
            </div>
          </label>

          {/* Legal */}
          <p className="text-xs text-gray-400 leading-relaxed">
            Cette signature est sécurisée et horodatée. Toute tentative de fraude sera poursuivie.
          </p>
        </div>

        {/* Sign button */}
        <button
          onClick={handleSign}
          disabled={signing || !consent || !hasDrawnRef.current}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          style={{ backgroundColor: accent }}
        >
          {signing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Validation en cours...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Signer et accepter le devis
            </span>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          Signature sécurisée via Factu.me • Lien valable 7 jours
        </p>
      </div>
    </div>
  );
}
