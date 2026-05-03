'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, FileText, Play, Zap,
  CheckCircle2, AlertCircle, Volume2, Loader2, Download, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
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
  totalHT: number;
  tva: number;
  totalTTC: number;
}

export default function DemoPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
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
  const audioLevelCheckRef = useRef<number | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Cleanup animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup audio level checker
      if (audioLevelCheckRef.current) {
        clearInterval(audioLevelCheckRef.current);
      }
      // Cleanup timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Cleanup PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      // Cleanup media stream
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

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // Update audio levels (5 bars)
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

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Start audio level visualization
      updateAudioLevels();

      // Set up MediaRecorder for audio recording
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio level visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevels([0, 0, 0, 0, 0]);

        // Stop timer
        stopTimer();

        // Create audio blob and send to API
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);

        // Stop all tracks
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
        setError('⚠️ Accès au microphone refusé. Cliquez sur le 🔒 dans la barre d\'adresse et autorisez le microphone.');
      } else if (err.name === 'NotFoundError') {
        setError('⚠️ Aucun microphone trouvé. Veuillez brancher un microphone et réessayer.');
      } else {
        setError('❌ Impossible d\'accéder au microphone: ' + err.message);
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
      // Create FormData with audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to Groq API endpoint
      const response = await fetch('/api/process-voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du traitement vocal');
      }

      const data = await response.json();
      setTranscript(data.transcript || '');

      // Parse the invoice data from Groq response
      await processVoiceToInvoice(data.parsed, data.transcript);

    } catch (err: any) {
      console.error('Error processing audio:', err);
      setError('❌ Erreur lors du traitement: ' + err.message);
      setCurrentStep('intro');
      setIsProcessing(false);
    }
  };

  const processVoiceToInvoice = async (parsedData: any, transcript: string) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate invoice from parsed data or use defaults
    const selectedInvoice: InvoiceData = {
      number: parsedData?.invoice_number || `FAC-${new Date().getFullYear()}-DEMO-${Math.floor(Math.random() * 1000) + 1}`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      dueDate: new Date(Date.now() + (parsedData?.due_days || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      clientName: parsedData?.client_name || 'Client Démo SARL',
      clientEmail: parsedData?.client_email || 'contact@client-demo.fr',
      clientAddress: parsedData?.client_address || '15 Rue de la République',
      clientPostalCode: parsedData?.client_postal_code || '75001',
      clientCity: parsedData?.client_city || 'Paris',
      lines: parsedData?.items?.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.quantity * item.unit_price,
      })) || [
          { description: 'Prestation de services professionnels', quantity: 1, unitPrice: 1000, total: 1000 },
        ],
      totalHT: 0,
      tva: 0,
      totalTTC: 0,
    };

    // Calculate totals
    selectedInvoice.totalHT = selectedInvoice.lines.reduce((sum, line) => sum + line.total, 0);
    selectedInvoice.tva = selectedInvoice.totalHT * 0.2;
    selectedInvoice.totalTTC = selectedInvoice.totalHT + selectedInvoice.tva;

    setInvoice(selectedInvoice);

    // Generate PDF
    await generateDemoPdf(selectedInvoice);

    setIsProcessing(false);
    setCurrentStep('result');
  };

  const generateDemoPdf = async (invoiceData: InvoiceData) => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 11;
      const fontSizeLarge = 18;
      const fontSizeSmall = 9;

      // Colors
      const primaryColor = rgb(0.13, 0.59, 0.95); // brand-500 equivalent
      const textColor = rgb(0.2, 0.2, 0.2);
      const lightGray = rgb(0.95, 0.95, 0.95);
      const grayColor = rgb(0.5, 0.5, 0.5);

      let yPos = height - 50;

      // Header - Logo and Company Name
      page.drawText('Factu.me', {
        x: 50,
        y: yPos,
        size: fontSizeLarge,
        font: fontBold,
        color: primaryColor,
      });
      page.drawText('Facturation intelligente', {
        x: 50,
        y: yPos - 15,
        size: fontSizeSmall,
        font: font,
        color: grayColor,
      });

      // Invoice number and date
      page.drawText(`Facture n° ${invoiceData.number}`, {
        x: width - 200,
        y: yPos,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      page.drawText(`Date: ${invoiceData.date}`, {
        x: width - 200,
        y: yPos - 15,
        size: fontSizeSmall,
        font: font,
        color: grayColor,
      });
      page.drawText(`Échéance: ${invoiceData.dueDate}`, {
        x: width - 200,
        y: yPos - 30,
        size: fontSizeSmall,
        font: font,
        color: grayColor,
      });

      yPos -= 70;

      // Client Information
      page.drawText('Facturé à:', {
        x: 50,
        y: yPos,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      yPos -= 20;
      page.drawText(invoiceData.clientName, {
        x: 50,
        y: yPos,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      yPos -= 15;
      page.drawText(invoiceData.clientAddress, {
        x: 50,
        y: yPos,
        size: fontSizeSmall,
        font: font,
        color: grayColor,
      });
      yPos -= 12;
      page.drawText(`${invoiceData.clientPostalCode} ${invoiceData.clientCity}`, {
        x: 50,
        y: yPos,
        size: fontSizeSmall,
        font: font,
        color: grayColor,
      });

      yPos -= 50;

      // Table Header
      const tableTop = yPos;
      const tableLeft = 50;
      const tableRight = width - 50;
      const tableWidth = tableRight - tableLeft;

      page.drawRectangle({
        x: tableLeft,
        y: tableTop,
        width: tableWidth,
        height: 25,
        color: lightGray,
      });

      const colDesc = tableLeft + 10;
      const colQty = tableLeft + 300;
      const colPrice = tableLeft + 380;
      const colTotal = tableRight - 10;

      page.drawText('Description', {
        x: colDesc,
        y: tableTop + 8,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      page.drawText('Qté', {
        x: colQty,
        y: tableTop + 8,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      page.drawText('Prix unitaire', {
        x: colPrice,
        y: tableTop + 8,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });
      page.drawText('Total', {
        x: colTotal - 30,
        y: tableTop + 8,
        size: fontSize,
        font: fontBold,
        color: textColor,
      });

      yPos = tableTop - 30;

      // Table rows
      invoiceData.lines.forEach((line, idx) => {
        // Draw row background
        if (idx % 2 === 0) {
          page.drawRectangle({
            x: tableLeft,
            y: yPos + 5,
            width: tableWidth,
            height: 30,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        // Draw description
        const descriptionLines = wrapText(line.description, 40);
        descriptionLines.forEach((lineText, i) => {
          page.drawText(lineText, {
            x: colDesc,
            y: yPos - (i * 12),
            size: fontSize,
            font: font,
            color: textColor,
          });
        });

        // Draw quantity
        page.drawText(line.quantity.toString(), {
          x: colQty,
          y: yPos,
          size: fontSize,
          font: font,
          color: textColor,
        });

        // Draw unit price
        page.drawText(`${line.unitPrice.toFixed(2)} €`, {
          x: colPrice,
          y: yPos,
          size: fontSize,
          font: font,
          color: textColor,
        });

        // Draw total
        page.drawText(`${line.total.toFixed(2)} €`, {
          x: colTotal - 30,
          y: yPos,
          size: fontSize,
          font: fontBold,
          color: textColor,
        });

        yPos -= 35;
      });

      // Draw table border
      page.drawRectangle({
        x: tableLeft,
        y: yPos + 10,
        width: tableWidth,
        height: tableTop - yPos,
        borderColor: grayColor,
        borderWidth: 1,
      });

      yPos -= 40;

      // Totals
      const totalsX = width - 200;
      page.drawText(`Total HT: ${invoiceData.totalHT.toFixed(2)} €`, {
        x: totalsX,
        y: yPos,
        size: fontSize,
        font: font,
        color: textColor,
      });
      yPos -= 20;
      page.drawText(`TVA (20%): ${invoiceData.tva.toFixed(2)} €`, {
        x: totalsX,
        y: yPos,
        size: fontSize,
        font: font,
        color: textColor,
      });
      yPos -= 25;

      // Total TTC box
      page.drawRectangle({
        x: totalsX - 10,
        y: yPos - 10,
        width: 160,
        height: 30,
        color: primaryColor,
      });
      page.drawText('Total TTC', {
        x: totalsX,
        y: yPos + 2,
        size: fontSize,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      page.drawText(`${invoiceData.totalTTC.toFixed(2)} €`, {
        x: totalsX + 60,
        y: yPos + 2,
        size: fontSize,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      // Add DEMO watermark on every page
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText('DÉMO', {
          x: width / 2 - 80,
          y: height / 2,
          size: 80,
          font: fontBold,
          color: rgb(1, 0, 0), // Red color
          opacity: 0.1, // 10% opacity
        });
        page.drawText('FACTU.ME', {
          x: width / 2 - 100,
          y: height / 2 - 80,
          size: 60,
          font: fontBold,
          color: rgb(1, 0, 0),
          opacity: 0.08, // 8% opacity
        });
      }

      // Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      // Create blob from Uint8Array - cast as any to bypass TypeScript type checking
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Erreur lors de la génération du PDF');
    }
  };

  // Helper function to wrap text
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).length > maxChars) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
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
                Parlez naturellement pour créer votre facture. Notre IA comprend le contexte, utilise Groq API, et génère un PDF professionnel.
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
                    Cliquez sur "Commencer" et parlez naturellement
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
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm text-blue-800 dark:text-blue-300">"Je veux facturer l'agence Marketing Digital pour un site e-commerce à 3500 euros"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm text-blue-800 dark:text-blue-300">"Facture pour Startup Innovate, conseil stratégique 3 jours à 850 euros, audit digital 1800 euros"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm text-blue-800 dark:text-blue-300">"Développement application mobile pour Tech Solutions à 12000 euros, design UI 3500 euros"</span>
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
                  💡 Conseil : Utilisez Chrome ou Edge pour la meilleure expérience • L'API Groq transcrira votre voix
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
              <div className="relative h-80 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 flex items-center justify-center overflow-hidden">
                {/* Animated sound bars - responding to audio */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {audioLevels.map((level, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 bg-primary/40 rounded-full"
                      animate={{
                        height: [10, 20 + level * 0.8, 10],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 0.3,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                      style={{
                        transform: `rotate(${i * 30}deg) translateX(60px)`,
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
                    {/* Pulse effect */}
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                  </motion.div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Je vous écoute...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Parlez naturellement, je comprends tout</p>

                  {/* Timer */}
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
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
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">📝 Transcription en direct</p>
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

                {error && error !== '💬 Je vous écoute... Parlez maintenant !' && (
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
                  💡 Parlez pendant au moins 5 secondes pour un meilleur résultat • Cliquez sur "Terminer" quand vous avez fini
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
                  <p className="text-gray-600 dark:text-gray-400">Génération de la facture personnalisée avec PDF</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {currentStep === 'result' && invoice && (
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voici votre facture démo (avec filigrane DÉMO)
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

            {/* Invoice Preview - PDF-like display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* DEMO Watermark overlay - BIG and visible */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                <div className="transform -rotate-45">
                  <div className="text-[150px] sm:text-[180px] md:text-[200px] font-black text-red-500/10 leading-none select-none whitespace-nowrap">
                    DÉMO • FACTU.ME • DÉMO • FACTU.ME •
                  </div>
                </div>
              </div>

              {/* Invoice content */}
              <div className="relative z-0 p-8 lg:p-12">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white">Factu.me</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Facturation intelligente</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Facture n°</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{invoice.number}</p>
                  </div>
                </div>

                {/* Client & Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Facturé à</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{invoice.clientName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.clientEmail}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.clientAddress}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.clientPostalCode} {invoice.clientCity}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <div className="mb-3">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date d'émission</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{invoice.date}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date d'échéance</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{invoice.dueDate}</p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-800">
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">Description</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">Qté</th>
                        <th className="text-right py-4 px-4 text-sm font-bold text-gray-900 dark:text-white">Prix unitaire</th>
                        <th className="text-right py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines.map((line, idx) => (
                        <tr key={idx} className="border-t border-gray-200 dark:border-slate-700">
                          <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{line.description}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 text-center font-semibold">{line.quantity}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">{line.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white text-right">{line.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-sm space-y-3 p-6 rounded-2xl bg-gray-50 dark:bg-slate-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total HT</span>
                      <span className="font-bold text-gray-900 dark:text-white">{invoice.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{invoice.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t-2 border-gray-300 dark:border-slate-600">
                      <span className="text-lg font-black text-gray-900 dark:text-white">Total TTC</span>
                      <span className="text-2xl font-black text-primary">{invoice.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    🔒 <strong>Mode démo</strong> - Filigrane visible sur le PDF
                  </p>
                  <Link
                    href="/register?plan=solo&trial=4"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all group"
                  >
                    Commencer avec Factu.me
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
