'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MARKETPLACES = [
  { id: 'A13V1IB3VIYZZQ', name: 'France', flag: '🇫🇷' },
  { id: 'A1PA6795UKMFR9', name: 'Allemagne', flag: '🇩🇪' },
  { id: 'APJ6JRA9NG5V4', name: 'Italie', flag: '🇮🇹' },
  { id: 'A1C3SOZRARQ6R3', name: 'Pologne', flag: '🇵🇱' },
  { id: 'A2NODRKZP88ZB9', name: 'Suède', flag: '🇸🇪' },
  { id: 'AMEN7PMS3EDWL', name: 'Belgique', flag: '🇧🇪' },
  { id: 'A1RKKUPIHCS9HS', name: 'Espagne', flag: '🇪🇸' },
  { id: 'A1F83G8C2ARO7P', name: 'Royaume-Uni', flag: '🇬🇧' },
  { id: 'A1805IZSGTT6HS', name: 'Pays-Bas', flag: '🇳🇱' },
];

interface AmazonConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AmazonConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: AmazonConnectionDialogProps) {
  const [step, setStep] = useState<'select' | 'linking'>('select');
  const [connecting, setConnecting] = useState(false);

  const connectMarketplace = async (marketplaceId: string) => {
    setConnecting(true);
    try {
      const response = await fetch('/api/amazon/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplaceId }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('linking');
        window.location.href = data.data.authUrl;
      } else {
        toast.error(data.error || 'Erreur lors de la connexion');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Error connecting Amazon:', error);
      toast.error('Erreur de connexion');
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connecter Amazon Seller Central</DialogTitle>
          <DialogDescription>
            Importez automatiquement vos commandes Amazon pour générer des factures
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sélectionnez votre marketplace</label>
              <div className="grid grid-cols-2 gap-2">
                {MARKETPLACES.map((mp) => (
                  <button
                    key={mp.id}
                    onClick={() => connectMarketplace(mp.id)}
                    disabled={connecting}
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl">{mp.flag}</span>
                    <span className="flex-1 text-left font-medium">{mp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-medium mb-1">Connexion sécurisée Amazon</p>
                <p className="text-orange-700">
                  Vous serez redirigé vers Amazon Seller Central pour autoriser l&apos;accès.
                  Factu.me utilise l&apos;API officielle Amazon SP-API.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'linking' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Connexion en cours...</p>
            <p className="text-sm text-gray-500">
              Vous allez être redirigé vers Amazon Seller Central.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
