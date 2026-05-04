'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingDonePage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    updateProfile({ onboarding_done: true } as any)
      .catch(() => setError(true))
      .finally(() => setSaving(false));
  }, []);

  if (saving) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Finalisation de votre espace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={52} className="text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Une erreur est survenue</h2>
            <p className="text-gray-500 mt-2 text-sm">Impossible de finaliser votre configuration. Vérifiez votre connexion et réessayez.</p>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setError(false);
              setSaving(true);
              updateProfile({ onboarding_done: true } as any)
                .catch(() => setError(true))
                .finally(() => setSaving(false));
            }}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <CheckCircle size={52} className="text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-gray-900">C'est parti !</h2>
          <p className="text-gray-500 mt-2">Votre espace est prêt. Créez votre première facture en quelques secondes.</p>
        </div>

        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
            Accéder au tableau de bord
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/invoices/new')}>
            Créer ma première facture
          </Button>
        </div>
      </div>
    </div>
  );
}
