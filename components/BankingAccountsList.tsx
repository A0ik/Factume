'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Building2, RefreshCw, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Connection {
  id: string;
  institution_name: string;
  account_iban: string | null;
  last_sync_at: string | null;
  status: string;
}

interface BankingAccountsListProps {
  onUpdate?: () => void;
}

export function BankingAccountsList({ onUpdate }: BankingAccountsListProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/banking/accounts');
      const data = await response.json();

      if (data.success) {
        setConnections(data.data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncConnection = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('/api/banking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `${data.data.transactionsAdded} nouvelles transactions importées`
        );
        onUpdate?.();
        fetchConnections();
      } else {
        toast.error(data.error || 'Erreur de synchronisation');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erreur de synchronisation');
    } finally {
      setSyncing(null);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter ce compte ?')) {
      return;
    }

    try {
      const response = await fetch('/api/banking/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Compte déconnecté');
        fetchConnections();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Erreur de déconnexion');
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Erreur de déconnexion');
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Content className="p-6">
          <div className="text-center text-gray-500">Chargement...</div>
        </Card.Content>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <Card.Content className="p-6">
          <div className="text-center text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun compte bancaire connecté</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <Card key={connection.id}>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{connection.institution_name}</p>
                  <p className="text-sm text-gray-500">
                    {connection.account_iban || 'IBAN masqué'}
                  </p>
                  {connection.last_sync_at && (
                    <p className="text-xs text-gray-400">
                      Sync il y a{' '}
                      {formatDistanceToNow(new Date(connection.last_sync_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncConnection(connection.id)}
                  disabled={syncing === connection.id}
                >
                  {syncing === connection.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteConnection(connection.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
