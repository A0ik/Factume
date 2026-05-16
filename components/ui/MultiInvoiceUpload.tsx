'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, Sparkles, CheckCircle, XCircle, Loader2, AlertCircle, ChevronLeft, ChevronRight, Merge, Split } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceSegment {
  startPage: number;
  endPage: number | null;
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

// Segment colors for visual distinction
const SEGMENT_COLORS = [
  'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  'border-violet-500 bg-violet-50 dark:bg-violet-900/20',
  'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
  'border-rose-500 bg-rose-50 dark:bg-rose-900/20',
  'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
  'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
  'border-pink-500 bg-pink-50 dark:bg-pink-900/20',
];

const SEGMENT_DOT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiInvoiceUpload({ onExtracted, className }: MultiInvoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [editedSegments, setEditedSegments] = useState<InvoiceSegment[]>([]);
  const [editingMode, setEditingMode] = useState(false);
  const [extractedExpenses, setExtractedExpenses] = useState<any[]>([]);

  // Get segment index for a given page
  const getSegmentForPage = useCallback((pageNum: number, segments: InvoiceSegment[]) => {
    return segments.findIndex(s => pageNum >= s.startPage && pageNum <= (s.endPage ?? s.startPage));
  }, []);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 50 Mo)');
      return;
    }
    setFile(selected);
    setDetectionResult(null);
    setEditedSegments([]);
    setExtractedExpenses([]);
    setEditingMode(false);
  }, []);

  // Detect invoices
  const handleDetect = useCallback(async () => {
    if (!file) return;
    setDetecting(true);
    setDetectionResult(null);
    setEditedSegments([]);
    setExtractedExpenses([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/ai/detect-invoices', { method: 'POST', body: formData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur');
      }
      const result: DetectionResult = await response.json();
      setDetectionResult(result);
      setEditedSegments(result.segments);
      toast.success(`${result.segments.length} facture(s) détectée(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de détection');
    } finally {
      setDetecting(false);
    }
  }, [file]);

  // Extract all detected invoices
  const handleExtract = useCallback(async () => {
    if (!file || !editedSegments.length) return;
    setExtracting(true);
    setExtractedExpenses([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('segments', JSON.stringify(editedSegments));
      const response = await fetch('/api/ai/ocr-multi-page', { method: 'POST', body: formData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur');
      }
      const data = await response.json();
      // Keep results indexed by segment position (null for failures)
      const expenses: (any | null)[] = data.results.map((r: any) =>
        r.success && r.expense ? r.expense : null
      );

      setExtractedExpenses(expenses);
      const successCount = expenses.filter(Boolean).length;
      toast.success(`${successCount}/${data.summary.totalSegments} facture(s) extraite(s)`);
      if (onExtracted) onExtracted(expenses.filter(Boolean));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur extraction');
    } finally {
      setExtracting(false);
    }
  }, [file, editedSegments, onExtracted]);

  // Merge segment at boundary (combine segment i and i+1)
  const handleMergeSegment = useCallback((segmentIndex: number) => {
    setEditedSegments(prev => {
      if (segmentIndex < 0 || segmentIndex >= prev.length - 1) return prev;
      const next = [...prev];
      const target = next[segmentIndex + 1];
      next[segmentIndex] = {
        ...next[segmentIndex],
        endPage: target.endPage ?? target.startPage,
        vendor: next[segmentIndex].vendor || target.vendor,
        invoiceNumber: next[segmentIndex].invoiceNumber || target.invoiceNumber,
      };
      next.splice(segmentIndex + 1, 1);
      return next;
    });
    toast.success('Segments fusionnés');
  }, []);

  // Split segment at a specific page
  const handleSplitSegment = useCallback((segmentIndex: number, splitAtPage: number) => {
    let didSplit = false;
    setEditedSegments(prev => {
      if (segmentIndex < 0 || segmentIndex >= prev.length) return prev;
      const seg = prev[segmentIndex];
      const segEnd = seg.endPage ?? seg.startPage;
      if (splitAtPage <= seg.startPage || splitAtPage > segEnd) return prev;
      const next = [...prev];
      next[segmentIndex] = { ...seg, endPage: splitAtPage - 1 };
      next.splice(segmentIndex + 1, 0, {
        startPage: splitAtPage,
        endPage: segEnd,
        vendor: null,
        invoiceNumber: null,
        date: null,
        confidence: 60,
      });
      didSplit = true;
      return next;
    });
    if (didSplit) toast.success('Segment divisé');
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setFile(null);
    setDetectionResult(null);
    setEditedSegments([]);
    setExtractedExpenses([]);
    setEditingMode(false);
  }, []);

  const totalPages = detectionResult?.totalPages || 0;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className={cn('space-y-4', className)}>
      <AnimatePresence mode="wait">
        {/* Upload Area */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="multi-invoice-input" disabled={detecting || extracting} />
            <label htmlFor="multi-invoice-input" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Uploadez un PDF multi-factures</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">L'IA détectera chaque facture automatiquement</p>
              </div>
              <span className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                Parcourir
              </span>
            </label>
          </motion.div>
        )}

        {/* File loaded, not yet detected */}
        {file && !detectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
              </div>
              <button onClick={handleReset} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"><XCircle className="w-5 h-5 text-gray-500" /></button>
            </div>
            <button onClick={handleDetect} disabled={detecting} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {detecting ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyse en cours...</> : <><Sparkles className="w-5 h-5" /> Détecter les factures</>}
            </button>
          </motion.div>
        )}

        {/* Detection result */}
        {file && detectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-sm text-gray-500">{totalPages} pages · {editedSegments.length} facture(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMode(!editingMode)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    editingMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                  )}
                >
                  {editingMode ? 'Terminé' : 'Ajuster'}
                </button>
                <button onClick={handleReset} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"><XCircle className="w-5 h-5 text-gray-500" /></button>
              </div>
            </div>

            {/* Page strip with segment coloring */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Pages ({totalPages})</h3>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {pages.map(pageNum => {
                  const segIdx = getSegmentForPage(pageNum, editedSegments);
                  const colorClass = segIdx >= 0 ? SEGMENT_COLORS[segIdx % SEGMENT_COLORS.length] : 'border-gray-300 bg-white dark:bg-gray-900';
                  const dotColor = segIdx >= 0 ? SEGMENT_DOT_COLORS[segIdx % SEGMENT_DOT_COLORS.length] : 'bg-gray-400';

                  return (
                    <div key={pageNum} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={cn('w-10 h-14 rounded-lg border-2 flex flex-col items-center justify-center text-xs', colorClass)}>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{pageNum}</span>
                        {segIdx >= 0 && <div className={cn('w-2 h-2 rounded-full mt-0.5', dotColor)} />}
                      </div>
                      {/* Split button between pages (editing mode) */}
                      {editingMode && pageNum < totalPages && (
                        <button
                          onClick={() => {
                            const seg = editedSegments.find(s => pageNum >= s.startPage && pageNum < (s.endPage ?? s.startPage));
                            if (seg) {
                              const segIdx2 = editedSegments.indexOf(seg);
                              handleSplitSegment(segIdx2, pageNum + 1);
                            }
                          }}
                          className="w-6 h-4 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
                          title={`Couper après page ${pageNum}`}
                        >
                          <Split size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Segments list with merge buttons */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Factures détectées</h3>
              <div className="space-y-2">
                {editedSegments.map((segment, index) => {
                  const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
                  const dotColor = SEGMENT_DOT_COLORS[index % SEGMENT_DOT_COLORS.length];

                  return (
                    <div key={index}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'rounded-xl p-3 border-2 flex items-center gap-3 transition-colors',
                          extractedExpenses[index] ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : colorClass
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm', dotColor)}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {segment.vendor || 'Fournisseur inconnu'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{segment.invoiceNumber || 'N° inconnu'}</span>
                            <span>·</span>
                            <span>P. {segment.startPage === (segment.endPage ?? segment.startPage) ? segment.startPage : `${segment.startPage}-${segment.endPage}`}</span>
                            {segment.confidence < 70 && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">{segment.confidence}%</span>
                            )}
                          </div>
                        </div>
                        {extractedExpenses[index] ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : segment.confidence < 70 ? (
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        ) : null}
                      </motion.div>
                      {/* Merge button between segments (editing mode) */}
                      {editingMode && index < editedSegments.length - 1 && (
                        <div className="flex justify-center py-1">
                          <button
                            onClick={() => handleMergeSegment(index)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            title="Fusionner avec le suivant"
                          >
                            <Merge size={12} />
                            Fusionner
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {detectionResult.needsManualReview && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">Certains segments ont une faible confiance. Utilisez "Ajuster" pour modifier les frontières.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted results */}
            {extractedExpenses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100 text-sm">Extraction terminée</h3>
                </div>
                <div className="space-y-2">
                  {extractedExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded-xl p-2.5">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{expense.vendor || 'Fournisseur inconnu'}</p>
                        <p className="text-gray-500 text-xs truncate">{expense.description || 'Sans description'}</p>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white flex-shrink-0 ml-2">
                        {expense.amount ? `${(expense.amount as number).toFixed(2)} €` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleExtract}
                disabled={extracting || extractedExpenses.length > 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {extracting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Extraction...</>
                ) : extractedExpenses.length > 0 ? (
                  <><CheckCircle className="w-5 h-5" /> Terminé</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Extraire les {editedSegments.length} factures</>
                )}
              </button>
              {extractedExpenses.length > 0 && (
                <button onClick={handleReset} className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  Nouveau
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
