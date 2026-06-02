'use client';

import React from 'react';
import { FileWarning } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Error Boundary wrapping LivePdfCanvas as a last-resort safety net.
 * If @react-pdf/renderer throws during rendering (not just during the
 * async generatePdf call), this prevents the error from bubbling up
 * and crashing the entire document creation page.
 */
export default class PdfCanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PdfCanvasErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center h-full text-center px-8 bg-gray-100 dark:bg-slate-900 ${this.props.className || ''}`}>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
            <FileWarning size={24} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Aper&ccedil;u indisponible
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[240px]">
            Le moteur PDF n&apos;a pas pu se charger. Votre document sera toujours cr&eacute;&eacute; correctement.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
