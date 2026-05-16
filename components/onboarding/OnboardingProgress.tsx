'use client';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: number;
  steps: string[];
}

export function OnboardingProgress({ currentStep, steps }: OnboardingProgressProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">Étape {currentStep + 1} sur {steps.length}</span>
        <span className="text-sm font-medium text-primary">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
      </div>
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex-1">
            <div className={cn(
              'h-2 rounded-full transition-all duration-500',
              i <= currentStep ? 'bg-gradient-to-r from-primary to-purple-600' : 'bg-gray-200'
            )} />
            <p className={cn(
              'text-xs mt-1.5 truncate',
              i <= currentStep ? 'text-primary font-medium' : 'text-gray-400'
            )}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
