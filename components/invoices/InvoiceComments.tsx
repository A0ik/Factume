'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, Trash2, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Comment {
  id: string;
  invoice_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface InvoiceCommentsProps {
  invoiceId: string;
}

export function InvoiceComments({ invoiceId }: InvoiceCommentsProps) {
  const { session, profile } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [invoiceId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/comments`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session || !newComment.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'envoi');

      const comment = await res.json();
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du commentaire');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!session) return;

    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      toast.error('Erreur lors de la suppression du commentaire');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!session || !editContent.trim()) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!res.ok) throw new Error('Erreur lors de la mise à jour');

      const updated = await res.json();
      setComments(comments.map(c => c.id === commentId ? updated : c));
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getUserName = (comment: Comment) => {
    if (comment.profiles?.first_name || comment.profiles?.last_name) {
      return `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim();
    }
    return comment.profiles?.email || 'Utilisateur';
  };

  const getInitials = (comment: Comment) => {
    const name = getUserName(comment);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Commentaires</h3>
        {comments.length > 0 && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {comments.length} commentaire{comments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="flex gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">
            {profile?.first_name?.[0] || profile?.email?.[0] || 'U'}
          </span>
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newComment.trim()) handleSubmit();
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={sending || !newComment.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun commentaire pour le moment</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Soyez le premier à commenter !</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">
                    {getInitials(comment)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {getUserName(comment)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>

                    {comment.user_id === session?.user.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingId === comment.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(comment.id)}
                              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditContent('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(comment.id);
                                setEditContent(comment.content);
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              disabled={deletingId === comment.id}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                            >
                              {deletingId === comment.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-primary bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
