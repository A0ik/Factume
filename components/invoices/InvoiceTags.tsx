'use client';

import { useState, useEffect } from 'react';
import { Tag, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface InvoiceTagsProps {
  invoiceId: string;
  tags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  readonly?: boolean;
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export function InvoiceTags({ invoiceId, tags, onTagsChange, readonly = false }: InvoiceTagsProps) {
  const { session } = useAuthStore();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    if (!session) return;

    try {
      const res = await fetch('/api/tags', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setAllTags(data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleCreateTag = async () => {
    if (!session || !newTagName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la création');

      const newTag = await res.json();
      setAllTags([...allTags, newTag]);
      setNewTagName('');
      setShowCreate(false);

      // Automatically assign the new tag
      await handleAssignTag(newTag.id);
    } catch (err) {
      toast.error('Erreur lors de la création du tag');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTag = async (tagId: string) => {
    if (!session || readonly) return;

    setAssigning(tagId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'assignation');

      const assignedTag = await res.json();
      onTagsChange?.([...tags, assignedTag]);
    } catch (err) {
      toast.error('Erreur lors de l\'assignation du tag');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!session || readonly) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      onTagsChange?.(tags.filter(t => t.id !== tagId));
    } catch (err) {
      toast.error('Erreur lors de la suppression du tag');
    }
  };

  const unassignedTags = allTags.filter(t => !tags.find(ut => ut.id === t.id));

  return (
    <div className="space-y-2">
      {/* Affichage des tags assignés */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              <Tag size={14} />
              {tag.name}
              {!readonly && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {!readonly && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <Plus size={14} />
            Tag
          </button>
        )}
      </div>

      {/* Formulaire de création/assignation */}
      <AnimatePresence>
        {showCreate && !readonly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3"
          >
            {/* Créer un nouveau tag */}
            <div className="space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nouveau tag..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) {
                    handleCreateTag();
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Couleur:</span>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newTagColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {newTagName.trim() && (
                <button
                  onClick={handleCreateTag}
                  disabled={creating}
                  className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Créer & assigner
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Ou assigner un tag existant */}
            {unassignedTags.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ou assigner un tag existant:</p>
                <div className="flex flex-wrap gap-2">
                  {unassignedTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAssignTag(tag.id)}
                      disabled={assigning === tag.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {assigning === tag.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Tag size={14} />
                          {tag.name}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
