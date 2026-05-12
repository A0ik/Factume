'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, Search, Building2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  logo: string;
  countries: string[];
}

interface BankConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BankConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: BankConnectionDialogProps) {
  const [step, setStep] = useState<'search' | 'linking' | 'success'>('search');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (open && step === 'search') {
      fetchInstitutions();
    }
  }, [open, step]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = institutions.filter((inst) =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInstitutions(filtered);
    } else {
      setFilteredInstitutions(institutions);
    }
  }, [searchQuery, institutions]);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/banking/institutions?country=FR');
      const data = await response.json();

      if (data.success) {
        setInstitutions(data.data);
        setFilteredInstitutions(data.data);
      } else {
        toast.error('Impossible de charger les banques');
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Erreur de chargement des banques');
    } finally {
      setLoading(false);
    }
  };

  const connectBank = async (institutionId: string) => {
    setConnecting(true);
    try {
      const response = await fetch('/api/banking/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId,
          redirectUri: '/api/banking/callback',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('linking');
        // Redirect to Nordigen for authentication
        window.location.href = data.data.link;
      } else {
        toast.error(data.error || 'Erreur lors de la connexion');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Error connecting bank:', error);
      toast.error('Erreur de connexion');
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Connecter votre compte bancaire</DialogTitle>
          <DialogDescription>
            Sélectionnez votre banque pour importer automatiquement vos transactions
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher votre banque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Institutions List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucune banque trouvée</p>
                </div>
              ) : (
                filteredInstitutions.map((institution) => (
                  <button
                    key={institution.id}
                    onClick={() => connectBank(institution.id)}
                    disabled={connecting}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {institution.logo ? (
                      <img
                        src={institution.logo}
                        alt={institution.name}
                        className="w-10 h-10 rounded"
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-gray-400" />
                    )}
                    <span className="flex-1 text-left font-medium">
                      {institution.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      PSD2 certifié
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Connexion sécurisée PSD2</p>
                <p className="text-blue-700">
                  Vos identifiants bancaires ne sont jamais stockés. La connexion est gérée par Nordigen (GoCardless),
                  certifié par les autorités bancaires européennes.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'linking' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Connexion en cours...</p>
            <p className="text-sm text-gray-500">
              Vous allez être redirigé vers votre banque pour vous authentifier.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium mb-2">Compte connecté !</p>
            <p className="text-sm text-gray-500 mb-6">
              Vos transactions seront importées automatiquement.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
