'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, Sparkles, CheckCircle, XCircle, Loader2, AlertCircle, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceSegment {
  startPage: number;
  endPage: number;
  vendor: string | null;
  invoiceNumber: string | null;
  date: string | null;
  confidence: number;
}

interface DetectionResult {
  totalPages: number;
  segments: InvoiceSegment[];
  needsManualReview: boolean;
}

interface MultiInvoiceUploadProps {
  onExtracted?: (expenses: any[]) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiInvoiceUpload({ onExtracted, className }: MultiInvoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [extractedExpenses, setExtractedExpenses] = useState<any[]>([]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (selected.size > 50 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 50 Mo)');
      return;
    }

    setFile(selected);
    setDetectionResult(null);
    setExtractedExpenses([]);
  }, []);

  // Detect invoices in PDF
  const handleDetect = useCallback(async () => {
    if (!file) return;

    setDetecting(true);
    setDetectionResult(null);
    setExtractedExpenses([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai/detect-invoices', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la détection');
      }

      const result: DetectionResult = await response.json();
      setDetectionResult(result);

      toast.success(`${result.segments.length} facture(s) détectée(s)`);
    } catch (error) {
      console.error('Detection error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de détection');
    } finally {
      setDetecting(false);
    }
  }, [file]);

  // Extract all detected invoices
  const handleExtract = useCallback(async () => {
    if (!file || !detectionResult) return;

    setExtracting(true);
    setExtractedExpenses([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('segments', JSON.stringify(detectionResult.segments));

      const response = await fetch('/api/ai/ocr-multi-page', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'extraction');
      }

      const data = await response.json();
      const expenses = data.results
        .filter((r: any) => r.success && r.expense)
        .map((r: any) => r.expense);

      setExtractedExpenses(expenses);

      toast.success(`${data.summary.succeeded}/${data.summary.totalSegments} facture(s) extraite(s)`);

      if (onExtracted) {
        onExtracted(expenses);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'extraction');
    } finally {
      setExtracting(false);
    }
  }, [file, detectionResult, onExtracted]);

  // Reset state
  const handleReset = useCallback(() => {
    setFile(null);
    setDetectionResult(null);
    setExtractedExpenses([]);
  }, []);

  // Format page range
  const formatPageRange = (start: number, end: number) => {
    return start === end ? `p.${start}` : `p.${start}-${end}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* File Upload Area */}
      <AnimatePresence mode="wait">
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="multi-invoice-input"
              disabled={detecting || extracting}
            />
            <label
              htmlFor="multi-invoice-input"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Uploadez un PDF multi-factures
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  L\'IA détectera automatiquement chaque facture
                </p>
              </div>
              <span className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
                Parcourir les fichiers
              </span>
            </label>
          </motion.div>
        )}

        {file && !detectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleDetect}
                disabled={detecting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {detecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Détection en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Détecter les factures
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {file && detectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* File Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {detectionResult.totalPages} pages • {detectionResult.segments.length} facture(s)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Segments Grid */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Factures détectées
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {detectionResult.segments.map((segment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'bg-white dark:bg-gray-900 rounded-lg p-4 border-2 transition-colors',
                      extractedExpenses[index]
                        ? 'border-green-500'
                        : segment.confidence < 70
                        ? 'border-amber-500'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-400">
                        {index + 1}
                      </span>
                      {extractedExpenses[index] ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : segment.confidence < 70 ? (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {segment.vendor || 'Fournisseur inconnu'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {segment.invoiceNumber || 'N° inconnu'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {formatPageRange(segment.startPage, segment.endPage)}
                      </p>
                      {segment.confidence < 70 && (
                        <p className="text-amber-600 dark:text-amber-400 text-xs">
                          Confiance: {segment.confidence}%
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {detectionResult.needsManualReview && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Révision manuelle recommandée
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        Certaines factures ont une faible confiance. Veuillez vérifier les résultats.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Results */}
            {extractedExpenses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Extraction terminée
                  </h3>
                </div>

                <div className="space-y-2">
                  {extractedExpenses.map((expense, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded p-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.vendor || 'Fournisseur inconnu'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {expense.description || 'Sans description'}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {expense.amount
                          ? `${(expense.amount as number).toFixed(2)} €`
                          : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExtract}
                disabled={extracting || extractedExpenses.length > 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extraction en cours...
                  </>
                ) : extractedExpenses.length > 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Extraction terminée
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Extraire les factures
                  </>
                )}
              </button>

              {extractedExpenses.length > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Nouveau fichier
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MultiInvoiceUpload;
