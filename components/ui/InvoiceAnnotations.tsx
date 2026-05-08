'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Highlighter, StickyNote, CheckCircle, X,
  Type, MapPin, Trash2, Edit2, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Annotation {
  id: string;
  annotation_type: 'highlight' | 'note' | 'field_marker' | 'correction' | 'approval';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    page?: number;
  };
  content?: string;
  created_at: string;
}

interface InvoiceAnnotationsProps {
  expenseId: string;
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationChange?: (annotations: Annotation[]) => void;
  readOnly?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Annotation Types Config
// ---------------------------------------------------------------------------

const ANNOTATION_TYPES = [
  {
    type: 'highlight' as const,
    label: 'Surlignage',
    icon: Highlighter,
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  {
    type: 'note' as const,
    label: 'Note',
    icon: StickyNote,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    type: 'correction' as const,
    label: 'Correction',
    icon: Edit2,
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-300',
  },
  {
    type: 'field_marker' as const,
    label: 'Marqueur',
    icon: Type,
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300',
  },
  {
    type: 'approval' as const,
    label: 'Validation',
    icon: CheckCircle,
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceAnnotations({
  expenseId,
  imageUrl,
  annotations,
  onAnnotationChange,
  readOnly = false,
  className,
}: InvoiceAnnotationsProps) {
  const [mode, setMode] = useState<'view' | 'create'>('view');
  const [selectedType, setSelectedType] = useState<typeof ANNOTATION_TYPES[number]['type']>('highlight');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create annotation
  const createAnnotation = useCallback(async () => {
    if (!startPos || !currentPos || readOnly) return;

    // Calculate position as percentages
    const imgRect = await getImageRect();
    if (!imgRect) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    const position = {
      x: (x / imgRect.width) * 100,
      y: (y / imgRect.height) * 100,
      width: (width / imgRect.width) * 100,
      height: (height / imgRect.height) * 100,
      page: 1,
    };

    const newAnnotation: Omit<Annotation, 'id' | 'created_at'> = {
      annotation_type: selectedType,
      position,
      content: selectedType === 'note' ? noteContent : undefined,
    };

    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expenseId,
          annotation: newAnnotation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create annotation');
      }

      const { annotation } = await response.json();

      // Update local state
      onAnnotationChange?.([...annotations, annotation]);

      // Reset drawing state
      setStartPos(null);
      setCurrentPos(null);
      setNoteContent('');
      setIsDrawing(false);

      toast.success('Annotation créée');
    } catch (error) {
      console.error('[Create Annotation] Error:', error);
      toast.error('Erreur lors de la création de l\'annotation');
    }
  }, [startPos, currentPos, selectedType, noteContent, expenseId, annotations, onAnnotationChange, readOnly]);

  // Delete annotation
  const deleteAnnotation = useCallback(async (annotationId: string) => {
    try {
      const response = await fetch(`/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }

      // Update local state
      onAnnotationChange?.(annotations.filter(a => a.id !== annotationId));

      toast.success('Annotation supprimée');
    } catch (error) {
      console.error('[Delete Annotation] Error:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [annotations, onAnnotationChange]);

  // Get image rect
  const getImageRect = async (): Promise<DOMRect | null> => {
    const img = document.getElementById(`invoice-image-${expenseId}`);
    return img?.getBoundingClientRect() || null;
  };

  // Handle mouse events on image
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (readOnly || mode !== 'create' || isDrawing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDrawing(true);
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPos({ x, y });
  };

  const handleImageMouseUp = () => {
    if (selectedType === 'note' || (startPos && currentPos)) {
      createAnnotation();
    }
  };

  // Get annotation type config
  const getTypeConfig = (type: Annotation['annotation_type']) => {
    return ANNOTATION_TYPES.find(t => t.type === type) || ANNOTATION_TYPES[0];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Annotations</h3>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
            {annotations.length}
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {mode === 'view' ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('create')}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                <Plus size={16} />
                Ajouter
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setMode('view');
                    setStartPos(null);
                    setCurrentPos(null);
                    setIsDrawing(false);
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Annuler
                </motion.button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Annotation Type Selector */}
      {mode === 'create' && !readOnly && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {ANNOTATION_TYPES.map((type) => (
            <motion.button
              key={type.type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type.type)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedType === type.type
                  ? `${type.bgColor} ring-2 ring-offset-2 ${type.textColor.replace('text-', 'ring-')}`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              <type.icon size={16} />
              {type.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Note Input for notes */}
      {mode === 'create' && selectedType === 'note' && !readOnly && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Ajoutez une note..."
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            rows={2}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (noteContent.trim()) {
                createAnnotation();
              } else {
                toast.error('Veuillez entrer une note');
              }
            }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Ajouter la note
          </motion.button>
        </motion.div>
      )}

      {/* Instructions for drawing */}
      {mode === 'create' && selectedType !== 'note' && !readOnly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
        >
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Instructions :</strong> Cliquez et faites glisser sur l'image pour créer une zone de surlignage.
          </p>
        </motion.div>
      )}

      {/* Image with annotations */}
      <div className="relative inline-block w-full">
        <img
          id={`invoice-image-${expenseId}`}
          src={imageUrl}
          alt="Facture"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 cursor-crosshair"
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          draggable={false}
        />

        {/* Drawing preview */}
        {isDrawing && startPos && currentPos && selectedType !== 'note' && (
          <div
            className="absolute border-2 border-dashed opacity-70 pointer-events-none"
            style={{
              left: `${Math.min(startPos.x, currentPos.x)}px`,
              top: `${Math.min(startPos.y, currentPos.y)}px`,
              width: `${Math.abs(currentPos.x - startPos.x)}px`,
              height: `${Math.abs(currentPos.y - startPos.y)}px`,
              borderColor: getTypeConfig(selectedType)?.color,
              backgroundColor: getTypeConfig(selectedType)?.color + '40',
            }}
          />
        )}

        {/* Render existing annotations */}
        {annotations.map((annotation) => {
          const config = getTypeConfig(annotation.annotation_type);
          if (!config) return null;

          return (
            <div
              key={annotation.id}
              className="absolute border border-opacity-50 rounded cursor-pointer group"
              style={{
                left: `${annotation.position.x}%`,
                top: `${annotation.position.y}%`,
                width: `${annotation.position.width}%`,
                height: `${annotation.position.height}%`,
                borderColor: config.color,
                backgroundColor: config.color + '40',
              }}
            >
              {/* Show content on hover */}
              <div className="hidden group-hover:block absolute inset-0 bg-white/95 dark:bg-gray-900/95 p-3 rounded shadow-xl">
                <div className="flex items-start gap-2">
                  <config.icon size={16} className={config.textColor} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {config.label}
                    </p>
                    {annotation.content && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {annotation.content}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotations List */}
      {annotations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Liste des annotations
          </h4>
          {annotations.map((annotation) => {
            const config = getTypeConfig(annotation.annotation_type);
            return (
              <motion.div
                key={annotation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  config.bgColor
                )}
              >
                <config.icon size={18} className={config.textColor} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {config.label}
                  </p>
                  {annotation.content && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {annotation.content}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteAnnotation(annotation.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InvoiceAnnotations;
