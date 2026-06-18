'use client';

import React from 'react';
import { FileWarning, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

interface State {
  hasError: boolean;
  errorCount: number;
}

/**
 * Error Boundary wrapping LivePdfCanvas with automatic + manual retry.
 * Resets on retry so the child component remounts from scratch.
 */
export default class PdfCanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PdfCanvasErrorBoundary] Caught error:', error?.message, errorInfo);
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center h-full text-center px-8 bg-gray-100 dark:bg-zinc-950 ${this.props.className || ''}`}>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
            <FileWarning size={24} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Aper&ccedil;u indisponible
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[260px] mb-4">
            Le moteur PDF n&apos;a pas pu se charger. Votre document sera toujours cr&eacute;&eacute; correctement.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw size={14} />
            R&eacute;essayer
          </motion.button>
          {this.state.errorCount > 3 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 max-w-[240px]">
              Plusieurs tentatives &eacute;chou&eacute;es. V&eacute;rifiez votre connexion et rechargez la page.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
