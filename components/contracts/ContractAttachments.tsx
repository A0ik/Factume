'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, X, File, Download, Trash2, Image, FileCode, Loader2 } from 'lucide-react';
import { ContractAttachment, ContractType } from '@/types';
import { toast } from 'sonner';

interface ContractAttachmentsProps {
  contractId: string;
  contractType: ContractType;
  attachments: ContractAttachment[];
  onAttachmentAdded: (attachment: ContractAttachment) => void;
  onAttachmentDeleted: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identité',
  diploma: 'Diplômes',
  contract: 'Contrat',
  other: 'Autre',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  identity: FileText,
  diploma: FileCode,
  contract: FileText,
  other: File,
};

export function ContractAttachments({
  contractId,
  contractType,
  attachments,
  onAttachmentAdded,
  onAttachmentDeleted,
}: ContractAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('other');

  const handleFile = useCallback(async (file: File, description?: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('contractId', contractId);
      formData.append('contractType', contractType);
      formData.append('file', file);
      formData.append('category', selectedCategory);
      if (description) formData.append('description', description);

      const res = await fetch('/api/contracts/attachments', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors de l\'upload');
      }

      const attachment = await res.json();
      onAttachmentAdded(attachment);
      toast.success('Fichier ajouté');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }, [contractId, contractType, selectedCategory, onAttachmentAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    try {
      const res = await fetch(`/api/contracts/attachments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      onAttachmentDeleted(id);
      toast.success('Fichier supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const groupedAttachments = React.useMemo(() => {
    const groups: Record<string, ContractAttachment[]> = {
      identity: [],
      diploma: [],
      contract: [],
      other: [],
    };
    attachments.forEach((a) => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return groups;
  }, [attachments]);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 dark:border-white/10 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Upload en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Glissez-déposez un fichier ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-gray-500 mb-4">PDF, Images, Word (max 10MB)</p>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary/50"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <label className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                Choisir un fichier
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Attachments List */}
      <AnimatePresence>
        {Object.entries(groupedAttachments).map(([category, items]) => (
          items.length > 0 && (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                {React.createElement(CATEGORY_ICONS[category] || File, { className: 'w-4 h-4' })}
                {CATEGORY_LABELS[category]}
                <span className="text-xs font-normal text-gray-500">({items.length})</span>
              </h4>

              <div className="space-y-2">
                {items.map((attachment) => {
                  const FileIcon = getFileIcon(attachment.file_type);
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-gray-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          {formatFileSize(attachment.file_size)}
                          {attachment.description && ` • ${attachment.description}`}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )
        ))}
      </AnimatePresence>

      {attachments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune pièce jointe
          </p>
        </div>
      )}
    </div>
  );
}
