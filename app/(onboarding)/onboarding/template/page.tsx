'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

const TEMPLATES = [
  { id: 1, name: 'Minimaliste', desc: 'Épuré et moderne',     headerBg: 'bg-primary',   headerH: 'h-1',  bodyBg: 'bg-white' },
  { id: 2, name: 'Classique',   desc: 'Sobre et formel',       headerBg: 'bg-gray-900',  headerH: 'h-5',  bodyBg: 'bg-white' },
  { id: 3, name: 'Moderne',     desc: 'Dynamique et coloré',   headerBg: 'bg-primary',   headerH: 'h-5',  bodyBg: 'bg-white' },
  { id: 4, name: 'Élégant',     desc: 'Chaleureux et raffiné', headerBg: 'bg-amber-300', headerH: 'h-1',  bodyBg: 'bg-amber-50' },
  { id: 5, name: 'Corporate',   desc: 'Structuré et pro',      headerBg: 'bg-slate-800', headerH: 'h-5',  bodyBg: 'bg-white' },
  { id: 6, name: 'Nature',      desc: 'Frais et organique',    headerBg: 'bg-green-700', headerH: 'h-5',  bodyBg: 'bg-green-50' },
  { id: 7, name: 'PUR',         desc: 'Minimaliste épuré',      headerBg: 'bg-primary',   headerH: 'h-1',  bodyBg: 'bg-white' },
  { id: 8, name: 'AUDACE',      desc: 'Moderne audacieux',      headerBg: 'bg-primary',   headerH: 'h-5',  bodyBg: 'bg-white' },
  { id: 9, name: 'ÉLÉGANCE',    desc: 'Classique formel',       headerBg: 'bg-gray-900',  headerH: 'h-1',  bodyBg: 'bg-white' },
];

export default function OnboardingTemplatePage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile({ template_id: selected } as any);
      router.push('/onboarding/done');
    } catch {
      router.push('/onboarding/done');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => router.push('/onboarding/address')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg">F</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Choisissez votre modèle</h2>
          <p className="text-gray-500 text-sm mt-1">Vous pourrez le modifier plus tard</p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={3} steps={['Langue', 'Entreprise', 'Adresse', 'Modèle', 'Terminé']} />

        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                'flex flex-col gap-2 p-2 rounded-xl border-2 transition-all',
                selected === t.id ? 'border-primary shadow-md scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Mini preview */}
              <div className={cn('w-full aspect-[3/4] rounded-lg overflow-hidden border border-gray-100 flex flex-col', t.bodyBg)}>
                <div className={cn('w-full', t.headerBg, t.headerH)} />
                <div className="flex-1 p-1.5 space-y-1">
                  <div className="bg-black/10 h-1.5 rounded-full w-2/3" />
                  <div className="bg-black/6 h-1 rounded-full w-full" />
                  <div className="bg-black/6 h-1 rounded-full w-4/5" />
                  <div className="bg-black/10 h-1 rounded-full w-1/2" />
                </div>
              </div>
              <p className={cn('text-xs font-bold text-center truncate', selected === t.id ? 'text-primary' : 'text-gray-600')}>{t.name}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mb-4">{TEMPLATES.find((t) => t.id === selected)?.desc}</p>

        <Button className="w-full" onClick={handleSubmit} loading={loading}>
          Terminer la configuration →
        </Button>
      </div>
    </div>
  );
}
