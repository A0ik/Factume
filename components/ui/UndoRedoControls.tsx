'use client';

import { Undo, Redo } from 'lucide-react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Annuler"
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Annuler (Ctrl+Z)"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Rétablir"
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Rétablir (Ctrl+Y)"
      >
        <Redo size={18} />
      </button>
    </div>
  );
}
