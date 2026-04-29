'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Edit2, Eye, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { X } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

const DEFAULT_TEMPLATES = {
  invoice_sent: {
    name: 'Facture envoyée',
    subject: 'Votre facture {invoice_number}',
    body: 'Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture n° {invoice_number} d\'un montant de {amount}€.\n\nDate d\'échéance : {due_date}\n\nCordialement,\n{company_name}',
  },
  invoice_reminder: {
    name: 'Relance facture',
    subject: 'Rappel : Facture {invoice_number}',
    body: 'Bonjour {client_name},\n\nNous vous rappelons que la facture n° {invoice_number} d\'un montant de {amount}€ est en retard.\n\nNous vous remercions de procéder au règlement dans les plus brefs délais.\n\nCordialement,\n{company_name}',
  },
  payment_received: {
    name: 'Paiement reçu',
    subject: 'Accusé de réception - Facture {invoice_number}',
    body: 'Bonjour {client_name},\n\nNous avons bien reçu votre paiement de {amount}€ pour la facture n° {invoice_number}.\n\nMerci pour votre confiance !\n\nCordialement,\n{company_name}',
  },
};

export function EmailTemplatesModal() {
  const { session } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', subject: '', body: '' });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const res = await fetch('/api/email-templates', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !formData.name.trim()) return;

    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la création');

      const newTemplate = await res.json();
      setTemplates([...templates, newTemplate]);
      setFormData({ name: '', subject: '', body: '' });
      setEditing(null);
      toast.success('Template créé avec succès');
    } catch (err) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDelete = async (id: string) => {
    if (!session) return;

    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const availableVariables = [
    { key: '{client_name}', label: 'Nom du client' },
    { key: '{invoice_number}', label: 'Numéro de facture' },
    { key: '{amount}', label: 'Montant' },
    { key: '{due_date}', label: 'Date d\'échéance' },
    { key: '{company_name}', label: 'Votre entreprise' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 text-sm font-semibold hover:border-primary/50 transition-all"
      >
        <Mail size={16} />
        Templates emails
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Templates d'emails</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Personnalisez vos emails automatiques
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Create new */}
                    <div
                      onClick={() => setEditing('new')}
                      className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Plus size={24} />
                      </div>
                      <p className="font-semibold text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors">
                        Créer un template
                      </p>
                    </div>

                    {/* Templates list */}
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {template.subject}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewing(template.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {template.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Variables disponibles : {availableVariables.map((v, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono ml-2">
                        {v.key}
                      </span>
                    ))}
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
