'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Package, RefreshCw, FileText, Trash2, Calendar, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AmazonOrder {
  id: string;
  amazon_order_id: string;
  purchase_date: string;
  total_amount: number;
  currency: string;
  status: string;
  fulfillment_channel: string;
  invoice_id?: string;
  invoice_generated: boolean;
}

interface AmazonConnection {
  id: string;
  seller_id: string;
  marketplace_id: string;
  last_sync_at: string | null;
}

interface AmazonOrdersListProps {
  onUpdate?: () => void;
}

export function AmazonOrdersList({ onUpdate }: AmazonOrdersListProps) {
  const [orders, setOrders] = useState<AmazonOrder[]>([]);
  const [connections, setConnections] = useState<AmazonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const [connRes, ordersRes] = await Promise.all([
        fetch('/api/amazon/connections'),
        fetch('/api/amazon/orders'),
      ]);

      const connData = await connRes.json();
      const ordersData = await ordersRes.json();

      if (connData.success) setConnections(connData.data);
      if (ordersData.success) setOrders(ordersData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('/api/amazon/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `${data.data.ordersAdded} nouvelles commandes importées`
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

  const generateInvoice = async (orderId: string) => {
    setGenerating(orderId);
    try {
      const response = await fetch(`/api/amazon/orders/${orderId}/invoice`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Facture générée avec succès !');
        onUpdate?.();
        fetchConnections();
      } else {
        toast.error(data.error || 'Erreur de génération');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Erreur de génération');
    } finally {
      setGenerating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Shipped: 'bg-blue-100 text-blue-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun compte Amazon connecté</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync Controls */}
      {connections.map((conn) => (
        <Card key={conn.id}>
          <Card.Content className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">Seller ID: {conn.seller_id.slice(-8)}</p>
                  {conn.last_sync_at && (
                    <p className="text-xs text-gray-500">
                      Sync il y a{' '}
                      {formatDistanceToNow(new Date(conn.last_sync_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncOrders(conn.id)}
                disabled={syncing === conn.id}
              >
                {syncing === conn.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Synchroniser
                  </>
                )}
              </Button>
            </div>
          </Card.Content>
        </Card>
      ))}

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <Card.Content className="p-6 text-center text-gray-500">
            Aucune commande importée
          </Card.Content>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <Card.Content className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {order.amazon_order_id}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.purchase_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {order.total_amount.toFixed(2)} {order.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {order.invoice_generated ? (
                    <a
                      href={`/invoices/${order.invoice_id}`}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Voir facture
                    </a>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => generateInvoice(order.id)}
                      disabled={generating === order.id}
                    >
                      {generating === order.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Générer facture
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card.Content>
          </Card>
        ))
      )}
    </div>
  );
}
