'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, FileText, Play, Zap,
  CheckCircle2, AlertCircle, Volume2, Loader2, Download, Clock, Info,
} from 'lucide-react';
import Link from 'next/link';
import { pdf } from '@react-pdf/renderer';
import { PdfDocument } from '@/components/pdf-document';

interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  vat_rate: number;
}

interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  lines: InvoiceLine[];
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  discount_percent: number;
  discount_amount: number;
}

interface ClientData {
  name: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
}

interface ProfileData {
  company_name: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  siret: string;
  vat_number: string;
  logo_url: string | null;
  accent_color: string;
  template_id: number;
  currency: string;
  language: string;
  legal_status: string;
  legal_mention: string | null;
  payment_terms: string | null;
  iban: string | null;
  bank_name: string | null;
  bic: string | null;
}

export default function DemoPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'intro' | 'listening' | 'processing' | 'result'>('intro');
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [pdfUrl]);

  // Update audio levels from microphone
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    const newLevels = [
      Math.random() * average * 1.5,
      Math.random() * average * 1.3,
      Math.random() * average * 1.1,
      Math.random() * average * 0.9,
      Math.random() * average * 0.7,
    ];
    setAudioLevels(newLevels);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, [isListening]);

  // Start recording timer
  const startTimer = useCallback(() => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  // Stop recording timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startListening = async () => {
    try {
      setError('');
      setTranscript('');
      setCurrentStep('listening');
      setIsListening(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      updateAudioLevels();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevels([0, 0, 0, 0, 0]);
        stopTimer();

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      startTimer();

    } catch (err: any) {
      console.error('Error starting microphone:', err);
      setIsListening(false);
      setCurrentStep('intro');

      if (err.name === 'NotAllowedError') {
        setError('Accès au microphone refusé. Cliquez sur le cadenas dans la barre d\'adresse et autorisez le microphone.');
      } else if (err.name === 'NotFoundError') {
        setError('Aucun microphone trouvé. Veuillez brancher un microphone et réessayer.');
      } else {
        setError('Impossible d\'accéder au microphone: ' + err.message);
      }
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    setCurrentStep('processing');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/process-voice-demo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du traitement vocal');
      }

      const data = await response.json();
      setTranscript(data.transcript || '');

      await processVoiceToInvoice(data.parsed, data.transcript);

    } catch (err: any) {
      console.error('Error processing audio:', err);
      setError('Erreur lors du traitement: ' + err.message);
      setCurrentStep('intro');
      setIsProcessing(false);
    }
  };

  const processVoiceToInvoice = async (parsedData: any, transcript: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const now = new Date();
    const dueDate = new Date(now.getTime() + (parsedData?.due_days || 30) * 24 * 60 * 60 * 1000);

    const items: InvoiceLine[] = parsedData?.items?.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      vat_rate: item.vat_rate || 20,
    })) || [
        { description: 'Prestation de services professionnels', quantity: 1, unit_price: 1000, total: 1000, vat_rate: 20 },
      ];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vat_amount = subtotal * 0.2;
    const discount_percent = parsedData?.discount_percent || 0;
    const discount_amount = discount_percent > 0 ? subtotal * (discount_percent / 100) : 0;
    const total = subtotal + vat_amount - discount_amount;

    const selectedInvoice: InvoiceData = {
      number: parsedData?.invoice_number || `FAC-${now.getFullYear()}-DEMO-${Math.floor(Math.random() * 1000) + 1}`,
      date: now.toISOString(),
      dueDate: dueDate.toISOString(),
      clientName: parsedData?.client_name || 'Client Démo SARL',
      clientEmail: parsedData?.client_email || 'contact@client-demo.fr',
      clientAddress: parsedData?.client_address || '15 Rue de la République',
      clientPostalCode: parsedData?.client_postal_code || '75001',
      clientCity: parsedData?.client_city || 'Paris',
      lines: items,
      subtotal,
      vat_amount,
      total,
      notes: parsedData?.notes || null,
      discount_percent,
      discount_amount,
    };

    const selectedClient: ClientData = {
      name: selectedInvoice.clientName,
      email: selectedInvoice.clientEmail,
      address: selectedInvoice.clientAddress,
      postal_code: selectedInvoice.clientPostalCode,
      city: selectedInvoice.clientCity,
    };

    const selectedProfile: ProfileData = {
      company_name: 'Factu.me',
      address: '12 rue de la Paix',
      postal_code: '75002',
      city: 'Paris',
      phone: '+33 1 23 45 67 89',
      email: 'contact@factu.me',
      siret: '123 456 789 00012',
      vat_number: 'FR12345678901',
      logo_url: null,
      accent_color: '#1D9E75',
      template_id: 1,
      currency: 'EUR',
      language: 'fr',
      legal_status: 'auto-entrepreneur',
      legal_mention: null,
      payment_terms: null,
      iban: null,
      bank_name: null,
      bic: null,
    };

    setInvoice(selectedInvoice);
    setClient(selectedClient);
    setProfile(selectedProfile);

    await generateDemoPdf(selectedInvoice, selectedClient, selectedProfile);

    setIsProcessing(false);
    setCurrentStep('result');
  };

  const generateDemoPdf = async (invoiceData: InvoiceData, clientData: ClientData, profileData: ProfileData) => {
    try {
      // Create invoice object for PdfDocument (with required fields)
      const invoice: any = {
        id: 'demo',
        user_id: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        number: invoiceData.number,
        document_type: 'invoice',
        status: 'sent',
        issue_date: invoiceData.date,
        due_date: invoiceData.dueDate,
        items: invoiceData.lines.map((line, i) => ({
          id: `demo-${i}`,
          invoice_id: 'demo',
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total,
          vat_rate: line.vat_rate,
          created_at: new Date().toISOString(),
        })),
        subtotal: invoiceData.subtotal,
        vat_amount: invoiceData.vat_amount,
        discount_percent: invoiceData.discount_percent,
        discount_amount: invoiceData.discount_amount,
        total: invoiceData.total,
        notes: invoiceData.notes,
        client: clientData,
        stripe_payment_link_url: null,
        stripe_payment_url: null,
        payment_link: null,
      };

      // Create profile object for PdfDocument (with required fields)
      const profile: any = {
        id: 'demo-profile',
        user_id: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_name: profileData.company_name,
        address: profileData.address,
        postal_code: profileData.postal_code,
        city: profileData.city,
        country: 'France',
        phone: profileData.phone,
        email: profileData.email,
        siret: profileData.siret,
        vat_number: profileData.vat_number,
        logo_url: profileData.logo_url,
        accent_color: profileData.accent_color,
        template_id: profileData.template_id,
        currency: profileData.currency,
        language: profileData.language,
        legal_status: profileData.legal_status,
        legal_mention: profileData.legal_mention,
        payment_terms: profileData.payment_terms,
        iban: profileData.iban,
        bank_name: profileData.bank_name,
        bic: profileData.bic,
        subscription_tier: 'solo',
        invoice_count: 0,
      };

      // Generate PDF using the real PdfDocument component
      const doc = <PdfDocument invoice={invoice} profile={profile} />;
      const pdfDoc = await pdf(doc);
      const blob = await pdfDoc.toBlob();

      // Add DEMO watermark using pdf-lib
      const { PDFDocument: PdfLibDoc, rgb, StandardFonts } = await import('pdf-lib');
      const pdfBytes = await blob.arrayBuffer();
      const pdfDocLib = await PdfLibDoc.load(pdfBytes);
      const pages = pdfDocLib.getPages();
      const font = await pdfDocLib.embedFont(StandardFonts.HelveticaBold);

      for (const page of pages) {
        const { width, height } = page.getSize();

        // Add DEMO watermark
        page.drawText('DÉMO', {
          x: width / 2 - 70,
          y: height / 2 + 30,
          size: 70,
          font: font,
          color: rgb(1, 0, 0),
          opacity: 0.08,
        });

        page.drawText('FACTU.ME', {
          x: width / 2 - 90,
          y: height / 2 - 50,
          size: 50,
          font: font,
          color: rgb(1, 0, 0),
          opacity: 0.06,
        });

        // Add demo notice at top
        page.drawText('MODE DÉMO - DOCUMENT NON CONTRACTUEL', {
          x: width / 2 - 120,
          y: height - 30,
          size: 9,
          font: font,
          color: rgb(1, 0, 0),
        });
      }

      const modifiedPdfBytes = await pdfDocLib.save();
      // Create blob from Uint8Array - cast as any to bypass TypeScript type checking
      const modifiedBlob = new Blob([modifiedPdfBytes as any], { type: 'application/pdf' });

      setPdfBlob(modifiedBlob);
      setPdfUrl(URL.createObjectURL(modifiedBlob));

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Erreur lors de la génération du PDF');
    }
  };

  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${invoice?.number || 'facture-demo'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetDemo = () => {
    setInvoice(null);
    setClient(null);
    setProfile(null);
    setTranscript('');
    setError('');
    setCurrentStep('intro');
    setRecordingTime(0);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfBlob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="Factu.me" className="h-10 w-auto group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Factu<span className="text-primary">.me</span></span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Retour
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {currentStep === 'intro' && (
          <div className="max-w-3xl mx-auto">
            {/* Hero section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Démo Interactive IA
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6">
                Dictée vocale
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
                  Facture instantanée
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                Parlez naturellement pour créer votre facture. Notre IA comprend le contexte et génère un PDF professionnel comme dans la vraie application.
              </p>
            </motion.div>

            {/* Voice interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Visualization */}
              <div className="relative h-64 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Prêt à écouter</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cliquez sur Commencer et parlez naturellement
                  </p>
                </div>
              </div>

              {/* Example phrases */}
              <div className="p-6 lg:p-8">
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3 mb-4">
                    <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">Exemples de phrases à dire :</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                      <span className="text-sm text-blue-800 dark:text-blue-300">Je veux facturer l'agence Marketing Digital pour un site e-commerce à 3500 euros</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                      <span className="text-sm text-blue-800 dark:text-blue-300">Facture pour Startup Innovate, conseil stratégique 3 jours à 850 euros, audit digital 1800 euros</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                      <span className="text-sm text-blue-800 dark:text-blue-300">Développement application mobile pour Tech Solutions à 12000 euros, design UI 3500 euros</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={startListening}
                    className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all group"
                  >
                    <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Commencer à parler
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </Link>
                </div>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                  <Info className="w-3 h-3 inline mr-1" />
                  Utilisez Chrome ou Edge pour la meilleure expérience. L'API Groq transcrira votre voix.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {currentStep === 'listening' && (
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Active listening visualization */}
              <div className="relative h-96 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 flex items-center justify-center overflow-hidden">
                {/* Animated sound bars - FIXED POSITION */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {audioLevels.map((level, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 bg-primary/40 rounded-full"
                      animate={{
                        height: [8, 20 + level * 0.8, 8],
                        opacity: [0.2, 0.7, 0.2],
                      }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        delay: i * 0.06,
                      }}
                      style={{
                        transform: `rotate(${i * 30}deg) translateX(100px)`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30 relative"
                  >
                    <Mic className="w-12 h-12 text-white relative z-10" />
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                  </motion.div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Je vous écoute...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Parlez naturellement, je comprends tout</p>

                  {/* Timer */}
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live transcript */}
              <div className="p-6 lg:p-8">
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Volume2 className="w-3 h-3" />
                    Transcription en direct
                  </p>
                  <div className="min-h-[120px] p-5 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-primary/20 relative">
                    <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                      {transcript || (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          En attente de votre voix... Parlez maintenant !
                        </span>
                      )}
                    </p>
                    {transcript && (
                      <span className="inline-block w-0.5 h-6 bg-primary ml-1 animate-pulse" />
                    )}
                  </div>
                </div>

                {error && error !== 'Je vous écoute... Parlez maintenant !' && (
                  <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={stopListening}
                    className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 transition-all group"
                  >
                    <MicOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Terminer - Générer la facture
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                  <Info className="w-3 h-3 inline mr-1" />
                  Parlez pendant au moins 5 secondes pour un meilleur résultat. Cliquez sur Terminer quand vous avez fini.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden p-16 text-center"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Loader2 className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">L'IA traite votre voix...</h2>
                  <p className="text-gray-600 dark:text-gray-400">Génération de la facture personnalisée avec le vrai template</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {currentStep === 'result' && invoice && client && profile && (
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Facture générée avec succès !
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Voici votre facture démo avec le vrai template Factu.me (filigrane DÉMO visible)
                </p>
              </div>
              <div className="flex gap-2">
                {pdfUrl && (
                  <button
                    onClick={downloadPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger PDF
                  </button>
                )}
                <button
                  onClick={resetDemo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Recommencer
                </button>
              </div>
            </motion.div>

            {/* Invoice Preview - PDF iframe */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-bold text-gray-900 dark:text-white">{invoice.number}</span>
                </div>
                <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  MODE DÉMO
                </div>
              </div>

              {pdfUrl && (
                <div className="w-full h-[800px]">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="Aperçu PDF"
                  />
                </div>
              )}

              <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-t border-gray-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">Mode démo</span> - Filigrane visible sur le PDF - Document non contractuel
                  </p>
                  <Link
                    href="/register?plan=pro&trial=4"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all group"
                  >
                    Commencer avec Factu.me
                    <Zap className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
