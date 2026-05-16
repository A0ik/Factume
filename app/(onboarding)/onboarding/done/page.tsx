'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, FileText, Users, Camera } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

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
      <div className="w-full max-w-lg text-center space-y-6">
        <OnboardingProgress currentStep={4} steps={['Langue', 'Entreprise', 'Adresse', 'Modèle', 'Terminé']} />

        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <CheckCircle size={52} className="text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-gray-900">C'est parti !</h2>
          <p className="text-gray-500 mt-2">Votre espace est prêt. Créez votre première facture en quelques secondes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Link href="/invoices/new" className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all group">
            <FileText className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-sm">Créer ma première facture</h3>
            <p className="text-xs text-gray-500 mt-1">En 30 secondes</p>
          </Link>
          <Link href="/clients" className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all group">
            <Users className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-sm">Ajouter un client</h3>
            <p className="text-xs text-gray-500 mt-1">Pour vos factures</p>
          </Link>
          <Link href="/ocr" className="flex flex-col items-center p-6 bg-white rounded-xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all group">
            <Camera className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-sm">Scanner une facture</h3>
            <p className="text-xs text-gray-500 mt-1">OCR intelligent</p>
          </Link>
        </div>

        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
            Accéder au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}
