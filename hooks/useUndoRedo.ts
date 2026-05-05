'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const ignoreChange = useRef(false);

  const setPresent = useCallback((newPresent: T) => {
    if (ignoreChange.current) {
      ignoreChange.current = false;
      return;
    }

    setState((prevState) => {
      const newPast = [...prevState.past, prevState.present].slice(-maxHistory);
      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setState((prevState) => {
      const { past, present, future } = prevState;

      if (past.length === 0) return prevState;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      ignoreChange.current = true;

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prevState) => {
      const { past, present, future } = prevState;

      if (future.length === 0) return prevState;

      const next = future[0];
      const newFuture = future.slice(1);

      ignoreChange.current = true;

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const reset = useCallback((newState: T) => {
    setState({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    state: state.present,
    setPresent,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}

// Keyboard shortcuts for undo/redo
export function useUndoRedoShortcuts(undo: () => void, redo: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z for redo
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
