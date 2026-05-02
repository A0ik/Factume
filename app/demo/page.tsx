'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Sparkles, FileText, X, Download, Play,
  Clock, User, Building2, Euro, Send, CheckCircle2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  clientName: string;
  clientEmail: string;
  lines: InvoiceLine[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  date: string;
  number: string;
}

export default function DemoPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');
  const [showVoicePrompt, setShowVoicePrompt] = useState(true);

  useEffect(() => {
    // Auto-show voice prompt on mount
    const timer = setTimeout(() => setShowVoicePrompt(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const startListening = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur. Veuillez utiliser Chrome ou Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      setError('Erreur de reconnaissance vocale: ' + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      } else {
        setIsProcessing(true);
        // Simulate processing
        setTimeout(() => {
          processVoiceToInvoice(transcript);
        }, 1500);
      }
    };

    recognition.start();
    (recognition as any).currentRef = recognition;
  };

  const stopListening = () => {
    setIsListening(false);
    if ((window as any).speechRecognition) {
      (window as any).speechRecognition.stop();
    }
  };

  const processVoiceToInvoice = (text: string) => {
    // Simulated AI processing - in real app, this would call an AI API
    const demoInvoices: InvoiceData[] = [
      {
        clientName: 'Agence Marketing Digital',
        clientEmail: 'contact@agence-demo.fr',
        lines: [
          { description: 'Création site web e-commerce', quantity: 1, unitPrice: 2500, total: 2500 },
          { description: 'Formation équipe (4 jours)', quantity: 4, unitPrice: 450, total: 1800 },
          { description: 'Maintenance mensuelle', quantity: 1, unitPrice: 300, total: 300 },
        ],
        totalHT: 4600,
        tva: 920,
        totalTTC: 5520,
        date: new Date().toLocaleDateString('fr-FR'),
        number: 'FAC-DEMO-2024-001',
      },
    ];

    setInvoice(demoInvoices[0]);
    setIsProcessing(false);
    setTranscript('');
  };

  const startDemo = () => {
    startListening();
  };

  const resetDemo = () => {
    setInvoice(null);
    setTranscript('');
    setError('');
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
        {!invoice ? (
          <div className="max-w-3xl mx-auto">
            {/* Hero section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Démo Interactive
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6">
                Créez une facture
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
                  avec votre voix
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                Découvrez la puissance de l'IA de Factu.me en dictant votre facture. Le résultat apparaît en temps réel !
              </p>

              {/* Voice prompt */}
              <AnimatePresence>
                {showVoicePrompt && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                  >
                    <Mic className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Cliquez sur le micro pour commencer</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Voice interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Visualization */}
              <div className="relative h-48 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 flex items-center justify-center">
                {isListening && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        animate={{
                          height: [20, 40, 60, 40, 20],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}
                {isProcessing && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm font-medium text-primary">Traitement IA en cours...</span>
                  </div>
                )}
                {!isListening && !isProcessing && (
                  <div className="text-center">
                    <Mic className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Prêt à écouter
                    </p>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="p-6 lg:p-8">
                {transcript && (
                  <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {transcript}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {!isListening ? (
                    <button
                      onClick={startDemo}
                      disabled={isProcessing}
                      className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      {isProcessing ? 'Traitement...' : 'Commencer la dictée'}
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 transition-all group"
                    >
                      <MicOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Arrêter et générer
                    </button>
                  )}
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-4 rounded-2xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </Link>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                    💡 <strong>Conseil:</strong> Dites des choses comme "Facture pour l'agence Marketing, création de site web à 2500 euros, formation 4 jours à 450 euros par jour"
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Invoice preview */
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Facture générée avec succès !
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voici un aperçu de votre facture démo
                </p>
              </div>
              <button
                onClick={resetDemo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Play className="w-4 h-4" />
                Nouvelle démo
              </button>
            </motion.div>

            {/* Invoice card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* DEMO Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <div className="transform -rotate-45">
                  <div className="text-[120px] font-black text-gray-900 dark:text-white leading-none">
                    DÉMO
                  </div>
                </div>
              </div>

              {/* Invoice content */}
              <div className="relative z-10 p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-8 pb-8 border-b border-gray-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Factu.me</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Facturation intelligente</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Facture n°</strong> {invoice.number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Date:</strong> {invoice.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Facturé à</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{invoice.clientName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.clientEmail}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="mb-8 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 dark:border-slate-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Qté</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Prix unitaire</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-slate-800">
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{line.description}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 text-center">{line.quantity}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 text-right">{line.unitPrice.toFixed(2)} €</td>
                          <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white text-right">{line.total.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total HT</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{invoice.totalHT.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{invoice.tva.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t-2 border-gray-200 dark:border-slate-800">
                      <span className="text-base font-bold text-gray-900 dark:text-white">Total TTC</span>
                      <span className="text-xl font-black text-primary">{invoice.totalTTC.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/register?plan=solo"
                    className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all group"
                  >
                    <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Commencer avec Factu.me
                  </Link>
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-gray-400 bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
                    title="Téléchargement non disponible en mode démo"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                  🔒 Mode démo - Le téléchargement est désactivé. Inscrivez-vous pour utiliser toutes les fonctionnalités.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Powered by AI • Créez vos factures en quelques secondes
          </p>
        </div>
      </footer>
    </div>
  );
}
