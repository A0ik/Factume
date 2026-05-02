'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Sparkles, FileText, Play,
  CheckCircle2, AlertCircle, Volume2, Loader2, Building2,
} from 'lucide-react';
import Link from 'next/link';

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
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'intro' | 'listening' | 'processing' | 'result'>('intro');
  const recognitionRef = useRef<any>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Simulate audio level animation when listening
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isListening]);

  const startListening = () => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.');
      return;
    }

    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let finalTranscriptText = '';
        let interimTranscriptText = '';

        recognition.onstart = () => {
          setIsListening(true);
          setCurrentStep('listening');
          setError('');
          setFinalTranscript('');
          setInterimTranscript('');
        };

        recognition.onresult = (event: any) => {
          interimTranscriptText = '';
          finalTranscriptText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptText += transcript;
            } else {
              interimTranscriptText += transcript;
            }
          }

          setFinalTranscript(finalTranscriptText);
          setInterimTranscript(interimTranscriptText);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech error:', event.error);
          if (event.error === 'no-speech') {
            setError('Je vous écoute... Parlez maintenant');
          } else if (event.error === 'not-allowed') {
            setError('Accès microphone refusé. Autorisez l\'accès dans votre navigateur.');
          } else {
            setError('Erreur: ' + event.error);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (finalTranscriptText.trim().length > 10) {
            setCurrentStep('processing');
            setIsProcessing(true);
            setTimeout(() => {
              processVoiceToInvoice(finalTranscriptText);
            }, 1500);
          } else if (finalTranscriptText.trim()) {
            setError('Phrase trop courte. Continuez à parler ou arrêtez pour générer.');
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      })
      .catch((err) => {
        console.error('Microphone access error:', err);
        setError('Impossible d\'accéder au microphone. Vérifiez vos permissions.');
      });
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceToInvoice = (text: string) => {
    const lowerText = text.toLowerCase();

    // Demo scenarios based on keywords
    const scenarios = [
      {
        keywords: ['site', 'web', 'ecommerce', 'agence', 'marketing', 'formation', 'maintenance'],
        invoice: {
          number: 'FAC-2024-DEMO-001',
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          clientName: 'Agence Marketing Digital SAS',
          clientEmail: 'contact@agence-demo.fr',
          clientAddress: '15 Rue de la République',
          clientPostalCode: '75001',
          clientCity: 'Paris',
          lines: [
            { description: 'Création site web e-commerce avec paiement sécurisé', quantity: 1, unitPrice: 3500, total: 3500 },
            { description: 'Formation équipe (5 jours) - Utilisation CMS', quantity: 5, unitPrice: 450, total: 2250 },
            { description: 'Maintenance et support mensuel', quantity: 1, unitPrice: 350, total: 350 },
            { description: 'Hébergement et nom de domaine (1 an)', quantity: 1, unitPrice: 150, total: 150 },
          ],
          totalHT: 6250,
          tva: 1250,
          totalTTC: 7500,
        },
      },
      {
        keywords: ['conseil', 'stratège', 'audit', 'startup', 'accompagnement', 'transformation'],
        invoice: {
          number: 'FAC-2024-DEMO-002',
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          clientName: 'Startup Innovate SAS',
          clientEmail: 'hello@startup-demo.fr',
          clientAddress: '42 Avenue des Champs-Élysées',
          clientPostalCode: '75008',
          clientCity: 'Paris',
          lines: [
            { description: 'Mission de conseil stratégique - Digitalisation', quantity: 3, unitPrice: 850, total: 2550 },
            { description: 'Audit complet de l\'infrastructure IT', quantity: 1, unitPrice: 1800, total: 1800 },
            { description: 'Accompagnement transformation agile (10 jours)', quantity: 10, unitPrice: 650, total: 6500 },
          ],
          totalHT: 10850,
          tva: 2170,
          totalTTC: 13020,
        },
      },
      {
        keywords: ['développ', 'app', 'mobile', 'application', 'tech', 'solution', 'logiciel'],
        invoice: {
          number: 'FAC-2024-DEMO-003',
          date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
          clientName: 'Tech Solutions SARL',
          clientEmail: 'contact@techsolutions-demo.fr',
          clientAddress: '8 Rue de la Loi',
          clientPostalCode: '69001',
          clientCity: 'Lyon',
          lines: [
            { description: 'Développement application mobile iOS/Android', quantity: 1, unitPrice: 12000, total: 12000 },
            { description: 'Design UI/UX et maquettes prototypes', quantity: 1, unitPrice: 3500, total: 3500 },
            { description: 'Tests fonctionnels et recette utilisateur', quantity: 5, unitPrice: 450, total: 2250 },
            { description: 'Formation équipe technique (2 jours)', quantity: 2, unitPrice: 800, total: 1600 },
          ],
          totalHT: 19350,
          tva: 3870,
          totalTTC: 23220,
        },
      },
    ];

    // Select best matching scenario
    let bestMatch = scenarios[0];
    let maxMatches = 0;

    for (const scenario of scenarios) {
      const matches = scenario.keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = scenario;
      }
    }

    setInvoice(bestMatch.invoice);
    setIsProcessing(false);
    setCurrentStep('result');
  };

  const resetDemo = () => {
    setInvoice(null);
    setFinalTranscript('');
    setInterimTranscript('');
    setError('');
    setCurrentStep('intro');
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
              <Sparkles className="w-5 h-5 text-white" />
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
                <Sparkles className="w-4 h-4" />
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
                Parlez naturellement pour créer votre facture. Notre IA comprend le contexte et génère un PDF professionnel.
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
                    Cliquez et parlez naturellement
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
                      <span className="text-sm text-blue-800 dark:text-blue-300">"Je veux facturer l'agence Marketing Digital pour un site e-commerce à 3500 euros, formation 5 jours à 450 euros par jour"</span>
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
              <div className="relative h-72 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 flex items-center justify-center overflow-hidden">
                {/* Animated sound waves */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-primary/30 rounded-full"
                      animate={{
                        scale: [1, 1 + audioLevel / 20, 1],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                      style={{
                        transform: `rotate(${i * 45}deg) translateX(50px)`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30"
                  >
                    <Mic className="w-12 h-12 text-white" />
                  </motion.div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Je vous écoute...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Parlez naturellement, je comprends tout</p>
                </div>
              </div>

              {/* Live transcript */}
              <div className="p-6 lg:p-8">
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">📝 Transcription en direct</p>
                  <div className="min-h-[120px] p-5 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-primary/20">
                    <p className="text-lg text-gray-900 dark:text-white leading-relaxed">
                      {finalTranscript && <span className="font-semibold">{finalTranscript}</span>}
                      {interimTranscript && (
                        <span className="text-primary/70 font-medium">{interimTranscript}</span>
                      )}
                      {!finalTranscript && !interimTranscript && (
                        <span className="text-gray-400 dark:text-gray-500 italic">En attente de votre voix...</span>
                      )}
                      <span className="inline-block w-0.5 h-6 bg-primary ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>

                {error && (
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
                  💡 Parlez pendant au moins 5 secondes pour un meilleur résultat
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
                  <p className="text-gray-600 dark:text-gray-400">Génération de la facture personnalisée</p>
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
                  Voici votre facture démo (avec filigrane)
                </p>
              </div>
              <button
                onClick={resetDemo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Play className="w-4 h-4" />
                Recommencer
              </button>
            </motion.div>

            {/* Invoice Preview - Styled like a real PDF */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* DEMO Watermark overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                <div className="transform -rotate-45">
                  <div className="text-[180px] font-black text-red-500/10 leading-none select-none">
                    DÉMO
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
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">{line.unitPrice.toLocaleString('fr-FR')} €</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white text-right">{line.total.toLocaleString('fr-FR')} €</td>
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
                      <span className="font-bold text-gray-900 dark:text-white">{invoice.totalHT.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{invoice.tva.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t-2 border-gray-300 dark:border-slate-600">
                      <span className="text-lg font-black text-gray-900 dark:text-white">Total TTC</span>
                      <span className="text-2xl font-black text-primary">{invoice.totalTTC.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    🔒 <strong>Mode démo</strong> - Téléchargement désactivé
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
