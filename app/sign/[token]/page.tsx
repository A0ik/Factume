'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { Loader2, FileText, CheckCircle, AlertTriangle, Download, PenTool, Building2, User, Calendar, Euro, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  other: 'Contrat de travail',
};

export default function ContractSigningPage({ params }: { params: Promise<{ token: string }> }) {
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
  const [contract, setContract] = useState<any>(null);
  const [contractType, setContractType] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [tokenRecord, setTokenRecord] = useState<any>(null);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      const res = await fetch(`/api/contract-signing/${token}`);
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

      setContract(data.contract);
      setContractType(data.contractType);
      setProfile(data.profile);
      setTokenRecord(data.tokenRecord);
      setViewCount(data.tokenRecord?.view_count || 0);
      setSignerName(`${data.contract.employee_first_name} ${data.contract.employee_last_name}`);
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
    if (!contract) return;
    try {
      const res = await fetch('/api/contracts/html-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: { ...contract, contractType } }),
      });
      if (!res.ok) throw new Error('Erreur');
      const htmlContent = await res.text();
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Popups bloqués');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
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

      const res = await fetch(`/api/contract-signing/${token}/sign`, {
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
  const accent = profile?.accent_color || '#1D9E75';

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
          <p className="text-gray-500 text-sm">Contactez l&apos;expéditeur pour obtenir un nouveau lien.</p>
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Contrat signé avec succès</h1>
          <p className="text-gray-500 text-sm">L&apos;employeur a été notifié et a reçu le contrat signé.</p>
        </div>
      </div>
    );
  }

  const label = CONTRACT_LABELS[contractType] || 'Contrat';

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
          <h1 className="text-2xl font-bold text-gray-900">Signature de votre {label}</h1>
          {profile?.company_name && <p className="text-gray-500 mt-1">{profile.company_name}</p>}
        </div>

        {/* Contract summary */}
        {contract && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Résumé du contrat</h3>
              <button
                onClick={handlePreviewPDF}
                className="text-sm flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" /> Voir le PDF complet
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Salarié</p>
                  <p className="font-medium text-gray-900">{contract.employee_first_name} {contract.employee_last_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Employeur</p>
                  <p className="font-medium text-gray-900">{contract.company_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Poste</p>
                  <p className="font-medium text-gray-900">{contract.job_title}</p>
                  <p className="text-gray-500 text-xs">Début : {fmtDate(contract.contract_start_date || contract.start_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Euro className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Rémunération</p>
                  <p className="font-medium text-gray-900">{fmtMoney(contract.salary_amount)}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      {contract.salary_frequency === 'hourly' ? '/h' : contract.salary_frequency === 'monthly' ? '/mois' : ''}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Employer signature */}
            {contract.employer_signature && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-2">Signature de l&apos;employeur</p>
                <img
                  src={contract.employer_signature.startsWith('data:') ? contract.employer_signature : `data:image/png;base64,${contract.employer_signature}`}
                  alt="Signature employeur"
                  className="max-w-[200px] max-h-[80px] object-contain"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {contract.employer_name || profile?.company_name || 'Employeur'}
                  {contract.employer_signature_date && ` — Signé le ${fmtDate(contract.employer_signature_date)}`}
                </p>
              </div>
            )}
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              placeholder="Votre nom et prénom"
            />
          </div>

          {/* eIDAS consent checkbox */}
          <label className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white">J'accepte de signer ce contrat électroniquement</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                En cochant cette case, je reconnais que ma signature électronique a la même valeur légale qu'une signature manuscrite conformément au règlement eIDAS n°910/2014. J'atteste avoir lu et accepté l'intégralité du contrat.
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
              <Check className="w-5 h-5" /> Valider ma signature électronique
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
