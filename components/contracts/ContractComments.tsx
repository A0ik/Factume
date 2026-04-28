'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2, Loader2, User } from 'lucide-react';
import { ContractComment, ContractType } from '@/types';
import { toast } from 'sonner';

interface ContractCommentsProps {
  contractId: string;
  contractType: ContractType;
}

export function ContractComments({ contractId, contractType }: ContractCommentsProps) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadComments();
  }, [contractId, contractType]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/comments?contractId=${contractId}&contractType=${contractType}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          contractType,
          content: newComment.trim(),
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'ajout');

      const comment = await res.json();
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      toast.success('Commentaire ajouté');
    } catch {
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      const res = await fetch(`/api/contracts/comments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success('Commentaire supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-4">
      {/* New Comment */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          Aucun commentaire pour le moment
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
