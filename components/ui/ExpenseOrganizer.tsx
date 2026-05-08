'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Folder, Tag, Plus, X, FolderOpen, Tag as TagIcon,
  Edit2, Trash2, Check, ChevronRight, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  parent_id?: string | null;
  description?: string;
  expense_count?: number;
  parent?: { name: string; color: string };
}

interface ExpenseOrganizerProps {
  expenseId: string;
  currentTags?: Tag[];
  currentFolder?: Folder | null;
  onUpdate?: (data: { tags?: Tag[]; folder?: Folder | null }) => void;
  readOnly?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpenseOrganizer({
  expenseId,
  currentTags = [],
  currentFolder = null,
  onUpdate,
  readOnly = false,
  className,
}: ExpenseOrganizerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentTags.map(t => t.id)
  );
  const [selectedFolder, setSelectedFolder] = useState<string | null>(
    currentFolder?.id || null
  );
  const [showTagManager, setShowTagManager] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#10B981');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch tags and folders
  const fetchData = useCallback(async () => {
    try {
      const [tagsRes, foldersRes] = await Promise.all([
        fetch('/api/tags?type=all'),
        fetch('/api/organize?' + new URLSearchParams({
          expense_id: expenseId,
        })),
      ]);

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
      }

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData.folders || []);
      }
    } catch (error) {
      console.error('[Fetch Data] Error:', error);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update organization
  const updateOrganization = useCallback(async () => {
    try {
      const response = await fetch('/api/expenses/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expenseId,
          tag_ids: selectedTags,
          folder_id: selectedFolder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      const data = await response.json();
      onUpdate?.(data);
      toast.success('Organisation mise à jour');
    } catch (error) {
      console.error('[Update Organization] Error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [expenseId, selectedTags, selectedFolder, onUpdate]);

  // Create new tag
  const createTag = useCallback(async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tag',
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create tag');
      }

      const { tag } = await response.json();
      setTags(prev => [...prev, tag]);
      setSelectedTags(prev => [...prev, tag.id]);
      setNewTagName('');
      setShowTagManager(false);
      toast.success('Tag créé');
    } catch (error) {
      console.error('[Create Tag] Error:', error);
      toast.error('Erreur lors de la création du tag');
    }
  }, [newTagName, newTagColor]);

  // Create new folder
  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'folder',
          name: newFolderName.trim(),
          color: newFolderColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const { folder } = await response.json();
      setFolders(prev => [...prev, folder]);
      setSelectedFolder(folder.id);
      setNewFolderName('');
      setShowFolderManager(false);
      toast.success('Dossier créé');
    } catch (error) {
      console.error('[Create Folder] Error:', error);
      toast.error('Erreur lors de la création du dossier');
    }
  }, [newFolderName, newFolderColor]);

  // Toggle tag selection
  const toggleTag = useCallback((tagId: string) => {
    if (readOnly) return;
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, [readOnly]);

  // Select folder
  const selectFolder = useCallback((folderId: string | null) => {
    if (readOnly) return;
    setSelectedFolder(folderId);
  }, [readOnly]);

  // Build folder tree
  const buildFolderTree = useCallback((folders: Folder[], parentId: string | null = null): Folder[] => {
    return folders
      .filter(f => f.parent_id === parentId)
      .map(f => ({
        ...f,
        children: buildFolderTree(folders, f.id),
      }));
  }, []);

  const folderTree = buildFolderTree(folders);

  // Render folder node
  const renderFolderNode = useCallback((folder: Folder & { children?: any[] }, depth = 0) => (
    <div key={folder.id}>
      <motion.button
        whileHover={{ scale: readOnly ? 1 : 1.01 }}
        whileTap={{ scale: readOnly ? 1 : 0.99 }}
        onClick={() => selectFolder(folder.id)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
          selectedFolder === folder.id
            ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-primary'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <FolderOpen size={16} style={{ color: folder.color }} />
        <span className="flex-1 truncate text-sm">{folder.name}</span>
        {folder.expense_count !== undefined && (
          <span className="text-xs text-gray-400">{folder.expense_count}</span>
        )}
        {selectedFolder === folder.id && <Check size={14} className="text-primary" />}
      </motion.button>
      {folder.children?.map(child => renderFolderNode(child, depth + 1))}
    </div>
  ), [selectedFolder, selectFolder, readOnly]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Folder size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Organisation
          </h3>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
            {selectedTags.length + (selectedFolder ? 1 : 0)}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={16} className="text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Folder Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dossier
                </label>
                {!readOnly && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFolderManager(!showFolderManager)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showFolderManager ? 'Annuler' : '+ Nouveau dossier'}
                  </motion.button>
                )}
              </div>

              {showFolderManager && !readOnly && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                >
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nom du dossier..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(e) => setNewFolderColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={createFolder}
                      disabled={!newFolderName.trim()}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Créer
                    </motion.button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {/* No folder option */}
                <motion.button
                  whileHover={{ scale: readOnly ? 1 : 1.01 }}
                  whileTap={{ scale: readOnly ? 1 : 0.99 }}
                  onClick={() => selectFolder(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all',
                    selectedFolder === null
                      ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-primary'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <Folder size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Aucun dossier</span>
                  {selectedFolder === null && <Check size={14} className="text-primary ml-auto" />}
                </motion.button>

                {folderTree.map(folder => renderFolderNode(folder))}
              </div>
            </div>

            {/* Tag Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                {!readOnly && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowTagManager(!showTagManager)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showTagManager ? 'Annuler' : '+ Nouveau tag'}
                  </motion.button>
                )}
              </div>

              {showTagManager && !readOnly && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                >
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nom du tag..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={createTag}
                      disabled={!newTagName.trim()}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Créer
                    </motion.button>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <motion.button
                    key={tag.id}
                    whileHover={{ scale: readOnly ? 1 : 1.05 }}
                    whileTap={{ scale: readOnly ? 1 : 0.95 }}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      selectedTags.includes(tag.id)
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                        : 'opacity-60 hover:opacity-100',
                      selectedTags.includes(tag.id) && `ring-[${tag.color}]`
                    )}
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                    }}
                  >
                    <TagIcon size={14} />
                    {tag.name}
                    {selectedTags.includes(tag.id) && <Check size={12} />}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Apply button */}
            {!readOnly && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={updateOrganization}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              >
                Appliquer
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExpenseOrganizer;
