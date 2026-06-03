import type { Integration } from '@/types';

export function getIntegrationProvider(provider: string): { name: string; icon: string; color: string; description: string } {
  const providers: Record<string, { name: string; icon: string; color: string; description: string }> = {
    pennylane: {
      name: 'Pennylane',
      icon: '',
      color: 'bg-blue-500',
      description: 'Logiciel de comptabilité en ligne',
    },
    sage: {
      name: 'Sage',
      icon: '',
      color: 'bg-green-600',
      description: 'Solution de gestion comptable',
    },
    bridge: {
      name: 'Bridge',
      icon: '',
      color: 'bg-indigo-500',
      description: 'Agrégateur bancaire (flux automatiques)',
    },
  };
  return providers[provider] || { name: provider, icon: '', color: 'bg-gray-500', description: '' };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': case 'active': return 'bg-green-500';
    case 'disconnected': return 'bg-gray-400';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'connected': case 'active': return 'Connecté';
    case 'disconnected': return 'Déconnecté';
    case 'error': return 'Erreur';
    default: return status;
  }
}

export function formatSyncDate(date?: string): string {
  if (!date) return 'Jamais synchronisé';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
